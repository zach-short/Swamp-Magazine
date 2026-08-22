-- Foundation schema (P1): catalog, orders, subscribers, site settings, image slots.
--
-- Security posture (PLAN.md P1): RLS enabled on every table. anon/authenticated
-- may SELECT only what the storefront renders (products, product_variants,
-- site_settings, image_slots). subscribers, orders, and order_items carry no
-- policies at all -- reachable only through the service role in server code.
-- Since 2026-04 Supabase does not auto-grant table privileges to anon/
-- authenticated, so every grant here is explicit.

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------- catalog

create table public.products (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  price_cents integer not null check (price_cents > 0),
  description text,
  model_credits text,
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  size text not null,
  inventory_count integer not null default 0 check (inventory_count >= 0),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (product_id, size)
);

create index product_variants_product_id_idx
  on public.product_variants (product_id);

-- ----------------------------------------------------------------- orders

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  status text not null default 'pending'
    check (status in ('pending', 'paid', 'fulfilled', 'picked_up', 'refunded', 'canceled')),
  delivery_method text not null
    check (delivery_method in ('pickup', 'shipping')),
  customer_name text,
  customer_email text,
  customer_phone text,
  shipping_address jsonb,
  amount_total_cents integer,
  stripe_checkout_session_id text unique,
  stripe_payment_intent_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Snapshot fields (product_name, size, unit_price_cents) survive later catalog
-- edits; the fk columns are soft references for admin drill-down only.
create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  product_id uuid references public.products (id) on delete set null,
  variant_id uuid references public.product_variants (id) on delete set null,
  product_name text not null,
  size text not null,
  unit_price_cents integer not null,
  quantity integer not null default 1 check (quantity > 0),
  created_at timestamptz not null default now()
);

create index order_items_order_id_idx on public.order_items (order_id);

-- ------------------------------------------------------------ subscribers

create table public.subscribers (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  phone text,
  email_consent boolean not null default true,
  -- Phone is collected from day one but SMS sends wait for A2P 10DLC (D4).
  sms_consent boolean not null default false,
  unsubscribed_at timestamptz,
  created_at timestamptz not null default now()
);

create unique index subscribers_email_key on public.subscribers (lower(email));

-- ---------------------------------------------------------- site settings

create table public.site_settings (
  id integer primary key default 1 check (id = 1),
  mode text not null default 'coming_soon' check (mode in ('coming_soon', 'live')),
  drop_at timestamptz,
  updated_at timestamptz not null default now()
);

insert into public.site_settings (id) values (1);

-- ------------------------------------------------------------ image slots

create table public.image_slots (
  slot_key text primary key,
  bucket text not null default 'slots',
  storage_path text not null,
  alt text,
  updated_at timestamptz not null default now()
);

-- ------------------------------------------------------------- updated_at

create trigger set_updated_at before update on public.products
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.product_variants
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.orders
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.site_settings
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.image_slots
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------- RLS

alter table public.products enable row level security;
alter table public.product_variants enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.subscribers enable row level security;
alter table public.site_settings enable row level security;
alter table public.image_slots enable row level security;

-- Inactive products stay invisible so unreleased drops don't leak.
create policy "Public can read active products"
  on public.products for select
  to anon, authenticated
  using (active);

create policy "Public can read variants"
  on public.product_variants for select
  to anon, authenticated
  using (true);

create policy "Public can read site settings"
  on public.site_settings for select
  to anon, authenticated
  using (true);

create policy "Public can read image slots"
  on public.image_slots for select
  to anon, authenticated
  using (true);

-- subscribers / orders / order_items: intentionally no policies.

-- ---------------------------------------------------------------- grants

grant usage on schema public to anon, authenticated, service_role;

grant select on public.products to anon, authenticated;
grant select on public.product_variants to anon, authenticated;
grant select on public.site_settings to anon, authenticated;
grant select on public.image_slots to anon, authenticated;

grant all on all tables in schema public to service_role;
