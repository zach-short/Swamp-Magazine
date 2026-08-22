-- Money path (P3): webhook idempotency plus the transactional "mark paid and
-- decrement stock" apply.
--
-- Why a table of processed event ids: Stripe guarantees at-least-once delivery,
-- so checkout.session.completed arrives more than once in normal operation, and
-- the Stripe CLI can replay it deliberately. Without a durable record of what
-- has been processed, every redelivery decrements inventory again -- the exact
-- silent failure PLAN.md P3 is written around, since it compiles, passes gates,
-- and only surfaces later as phantom sold-out sizes.
--
-- Why one RPC instead of a few calls from the webhook: marking the order paid
-- and decrementing stock have to commit together. Two round-trips can interleave
-- with a second delivery and double-apply, or leave an order paid with stock
-- never decremented if the process dies in between.
--
-- Security: stripe_events is money-adjacent, so it follows orders/order_items --
-- RLS on, no policies at all, reachable only through the service role. Postgres
-- grants EXECUTE on new functions to PUBLIC by default, and PostgREST turns that
-- into an anon-callable endpoint, so a function that marks orders paid must have
-- that default revoked or anyone with the publishable key could settle their own
-- order. (The P1 function public.set_updated_at shows the default in action --
-- it has proacl = null, so anon can execute it.)

-- Deliberately NOT a foreign key to orders. This column is an audit trail, and
-- the one moment it matters most is when the referenced order is missing: a
-- REFERENCES constraint fires its RI trigger on insert, aborts the whole
-- transaction, and leaves no row at all -- so the "order not found" branch below
-- could never run and the event would vanish instead of being recorded.
create table public.stripe_events (
  id text primary key,
  type text not null,
  order_id uuid,
  outcome text,
  -- True when Stripe charged something other than what the order was quoted.
  -- Nothing today can produce it (line items are server-built, no promo codes,
  -- tax off), which is exactly why it is worth recording if it ever happens.
  amount_mismatch boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.stripe_events enable row level security;

-- No policies, by design (see header).

grant all on public.stripe_events to service_role;

-- What the order was quoted at creation, so a charge can be audited against an
-- expectation instead of being taken on faith. orders.amount_total_cents records
-- what Stripe actually charged; without this column there is no value in the
-- system to compare it to.
alter table public.orders
  add column expected_amount_cents integer;

-- Claim marker for the confirmation email, so a redelivered event cannot mail a
-- buyer twice and a send that failed can still be retried by replaying the event.
alter table public.orders
  add column confirmation_sent_at timestamptz;

-- ------------------------------------------------------------------- apply

create or replace function public.apply_checkout_completion(
  p_event_id text,
  p_event_type text,
  p_order_id uuid,
  p_session_id text,
  p_payment_intent_id text,
  p_amount_total_cents integer,
  p_customer_name text,
  p_customer_email text,
  p_customer_phone text,
  p_shipping_address jsonb
)
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  v_event_inserted integer;
  v_order_updated integer;
  v_decremented integer;
  v_item record;
  v_item_count integer;
  v_expected integer;
  v_mismatch boolean := false;
  v_oversold boolean := false;
  v_outcome text;
begin
  -- First writer of this event id wins; every later delivery short-circuits
  -- here, before it can touch an order or a variant.
  insert into public.stripe_events (id, type, order_id)
  values (p_event_id, p_event_type, p_order_id)
  on conflict (id) do nothing;
  get diagnostics v_event_inserted = row_count;

  if v_event_inserted = 0 then
    -- Return what actually happened the first time, not a constant. A redelivery
    -- of an oversold event has to re-enter the refund path: the caller's refund
    -- is idempotent, but a flat 'already-applied' here would strand a buyer who
    -- paid for stock that no longer exists, with no automatic route back.
    select coalesce(outcome, 'already-applied') into v_outcome
    from public.stripe_events
    where id = p_event_id;
    return jsonb_build_object('outcome', v_outcome, 'replay', true);
  end if;

  -- Compare-and-swap on the order's own status, so a *different* event id for
  -- the same order (an async success following a completion, say) still cannot
  -- decrement twice. The event table alone would not catch that case.
  update public.orders
  set status = 'paid',
      stripe_checkout_session_id = coalesce(stripe_checkout_session_id, p_session_id),
      stripe_payment_intent_id = p_payment_intent_id,
      amount_total_cents = p_amount_total_cents,
      customer_name = p_customer_name,
      customer_email = p_customer_email,
      customer_phone = p_customer_phone,
      shipping_address = p_shipping_address
  where id = p_order_id
    and status = 'pending';
  get diagnostics v_order_updated = row_count;

  if v_order_updated = 0 then
    if exists (select 1 from public.orders where id = p_order_id) then
      v_outcome := 'already-applied';
    else
      v_outcome := 'order-not-found';
    end if;
    update public.stripe_events set outcome = v_outcome where id = p_event_id;
    return jsonb_build_object('outcome', v_outcome, 'replay', false);
  end if;

  select expected_amount_cents into v_expected
  from public.orders
  where id = p_order_id;

  if v_expected is not null
     and p_amount_total_cents is not null
     and v_expected <> p_amount_total_cents then
    v_mismatch := true;
  end if;

  -- An order with no lines would otherwise fall straight through the loop and
  -- report a clean 'applied' while selling nothing.
  select count(*) into v_item_count
  from public.order_items
  where order_id = p_order_id;

  if v_item_count = 0 then
    v_oversold := true;
  end if;

  -- The `>= quantity` predicate is what makes an oversell race lose quietly
  -- here instead of aborting the whole transaction on the table's
  -- inventory_count >= 0 check -- the buyer has already paid, so the order must
  -- still land as paid and the caller refunds per the oversell dial.
  --
  -- CART SEAM WARNING (BD-4 keeps orders to one item today): with several items,
  -- the ones that succeed stay decremented while the caller refunds the whole
  -- payment intent. Before the cart ships, this must either refund per line or
  -- raise so the transaction rolls back and Stripe retries.
  for v_item in
    select variant_id, quantity from public.order_items where order_id = p_order_id
  loop
    if v_item.variant_id is null then
      v_oversold := true;
      continue;
    end if;

    update public.product_variants
    set inventory_count = inventory_count - v_item.quantity
    where id = v_item.variant_id
      and inventory_count >= v_item.quantity;
    get diagnostics v_decremented = row_count;

    if v_decremented = 0 then
      v_oversold := true;
    end if;
  end loop;

  v_outcome := case when v_oversold then 'oversold' else 'applied' end;

  update public.stripe_events
  set outcome = v_outcome,
      amount_mismatch = v_mismatch
  where id = p_event_id;

  return jsonb_build_object(
    'outcome', v_outcome,
    'replay', false,
    'amount_mismatch', v_mismatch
  );
end;
$$;

revoke execute on function public.apply_checkout_completion(
  text, text, uuid, text, text, integer, text, text, text, jsonb
) from public, anon, authenticated;

grant execute on function public.apply_checkout_completion(
  text, text, uuid, text, text, integer, text, text, text, jsonb
) to service_role;
