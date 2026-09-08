"use client";

import { useState, useTransition, type FormEvent } from "react";

import {
  createCheckoutSession,
  type DeliveryMethod,
} from "@/actions/create-checkout-session";
import { dials } from "@/config/dials";
import { cn } from "@/lib/utils";

import { OrderLedger } from "../order-ledger/order-ledger";
import { PaymentStation } from "../payment-station/payment-station";
import {
  formatUsd,
  orderCopy,
  orderErrorLines,
  type OrderErrorReason,
} from "../../lib/order-copy";
import { stripePromise } from "../../lib/stripe-client";

/** Structurally the storefront's `ProductVariant`, declared here so the order
 * form doesn't depend on the catalog lane's file. */
export type CheckoutVariant = { size: string; soldOut: boolean };

export type CheckoutFormProps = {
  slug: string;
  name: string;
  priceCents: number;
  variants: CheckoutVariant[];
};

const deliveryOptions: { value: DeliveryMethod; label: string; price: string }[] =
  [
    { value: "pickup", label: orderCopy.pickup, price: orderCopy.free },
    {
      value: "shipping",
      label: orderCopy.shipping,
      // The rate is the dial's, never a literal -- change it in config/dials.ts
      // and this line and the Stripe shipping option move together.
      price: formatUsd(dials.shippingFlatRateCents),
    },
  ];

// Direction A re-skin: same flow, same states, left-aligned on the ink panel
// instead of centred on a photograph. Cream carries the reading, yellow is the
// ratified "this one is live", red is reserved for the acts (NEXT / SUBMIT) and
// for anything gone wrong.
export function CheckoutForm({
  slug,
  name,
  priceCents,
  variants,
}: CheckoutFormProps) {
  const [size, setSize] = useState<string | null>(null);
  const [delivery, setDelivery] = useState<DeliveryMethod>("pickup");
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [errorReason, setErrorReason] = useState<OrderErrorReason | null>(null);
  // Sizes the server refused after this page rendered. Stock is the DB's word,
  // never the client's, so a "sold-out" answer has to beat the snapshot this
  // component was handed.
  const [refusedSizes, setRefusedSizes] = useState<string[]>([]);
  const [isPending, startTransition] = useTransition();

  const sizes = variants.map((variant) => ({
    size: variant.size,
    soldOut: variant.soldOut || refusedSizes.includes(variant.size),
  }));
  const allGone = sizes.length === 0 || sizes.every((option) => option.soldOut);

  const shippingCents =
    delivery === "shipping" ? dials.shippingFlatRateCents : 0;
  const totalCents = priceCents + shippingCents;
  const deliveryLabel =
    delivery === "shipping" ? orderCopy.shipping : orderCopy.pickup;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    // The button is already disabled in both cases; pressing Enter inside the
    // form submits anyway, which is where a double order would come from.
    if (!size || isPending) return;
    setErrorReason(null);
    startTransition(async () => {
      const result = await createCheckoutSession({ slug, size, delivery });
      if (result.status === "success") {
        setClientSecret(result.clientSecret);
        setOrderId(result.orderId);
        return;
      }
      setErrorReason(result.reason);
      if (result.reason === "sold-out") {
        setRefusedSizes((current) => [...current, size]);
        setSize(null);
      }
    });
  }

  // Dropping the secret is all it takes to get back to the size row: nothing is
  // charged until confirm, so the abandoned session and its pending order are
  // exactly what closing the tab would have left behind. The alternative -- no
  // way back at all -- made a mis-picked size a page reload.
  function handleChangeSize() {
    setClientSecret(null);
    setOrderId(null);
    setErrorReason(null);
  }

  if (!stripePromise || errorReason === "stripe-unconfigured") {
    return (
      <div className="flex w-full flex-col gap-6 font-body text-cream">
        {/* The sizes stay on the page when ordering is not armed yet. Dropping
            them would take the row the mockups are built around off the product
            screen, so an un-keyed deploy would read as broken rather than as
            not open yet. The price is not repeated here: Direction A's panel
            states it above this block on every branch, and P2's guarantee that
            it "shows plainly wherever the order block isn't" is what that
            satisfies. */}
        <div>
          <p className="mb-3 text-[10px] font-semibold tracking-[0.35em] text-cream/50">
            {orderCopy.size}
          </p>
          <ul className="flex flex-wrap items-baseline gap-x-[30px] gap-y-2 font-display text-2xl leading-none md:text-[26px]">
            {sizes.map((option) => (
              <li
                key={option.size}
                className={
                  option.soldOut ? "text-cream/30 line-through" : "text-cream/45"
                }
              >
                {option.size}
                {option.soldOut ? <span className="sr-only"> sold out</span> : null}
              </li>
            ))}
          </ul>
        </div>
        <p className="font-display text-2xl tracking-[0.06em] text-brand-red md:text-[30px]">
          {orderErrorLines["stripe-unconfigured"]}
        </p>
      </div>
    );
  }

  if (clientSecret) {
    return (
      <PaymentStation
        clientSecret={clientSecret}
        orderId={orderId}
        name={name}
        size={size}
        priceCents={priceCents}
        delivery={delivery}
        deliveryLabel={deliveryLabel}
        shippingCents={shippingCents}
        totalCents={totalCents}
        onChangeSize={handleChangeSize}
      />
    );
  }

  // `stripe-unconfigured` already returned above, so every reason that reaches
  // here is one the buyer can act on.
  const errorLine = errorReason ? orderErrorLines[errorReason] : null;

  return (
    <form
      onSubmit={handleSubmit}
      className="flex w-full flex-col gap-6 font-body text-cream md:gap-[34px]"
    >
      <fieldset disabled={isPending}>
        <legend className="mb-3 text-[10px] font-semibold tracking-[0.35em] text-cream/50">
          {orderCopy.size}
        </legend>
        <div className="flex flex-wrap items-baseline gap-x-[30px] gap-y-2 font-display text-2xl leading-none md:text-[26px]">
          {sizes.map((option) => (
            <label
              key={option.size}
              className={cn(
                "cursor-pointer transition-colors duration-200",
                option.soldOut
                  ? "cursor-not-allowed text-cream/30 line-through"
                  : size === option.size
                    ? "text-brand-yellow"
                    : "text-cream/45 hover:text-cream",
              )}
            >
              <input
                type="radio"
                name="size"
                value={option.size}
                checked={size === option.size}
                disabled={option.soldOut}
                onChange={() => setSize(option.size)}
                className="peer sr-only"
              />
              <span className="peer-focus-visible:underline peer-focus-visible:underline-offset-8">
                {option.size}
                {/* The strike-through is the sighted cue; disabled alone does
                    not say why, so screen readers get the reason. */}
                {option.soldOut ? <span className="sr-only"> sold out</span> : null}
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset disabled={isPending}>
        <legend className="sr-only">DELIVERY</legend>
        <div className="flex flex-wrap gap-x-[30px] gap-y-2 text-[11px] font-semibold tracking-[0.2em] md:text-xs">
          {deliveryOptions.map((option) => (
            <label
              key={option.value}
              className={cn(
                "cursor-pointer transition-colors duration-200",
                delivery === option.value
                  ? "text-brand-yellow"
                  : "text-cream/45 hover:text-cream",
              )}
            >
              <input
                type="radio"
                name="delivery"
                value={option.value}
                checked={delivery === option.value}
                onChange={() => setDelivery(option.value)}
                className="peer sr-only"
              />
              <span className="peer-focus-visible:underline peer-focus-visible:underline-offset-8">
                {option.label} &mdash; {option.price}
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <OrderLedger
        name={name}
        priceCents={priceCents}
        deliveryLabel={deliveryLabel}
        shippingCents={shippingCents}
        size={size}
        totalDisplay={formatUsd(totalCents)}
      />

      {errorLine ? (
        <p role="alert" className="text-xs font-bold tracking-widest text-brand-red">
          {errorLine}
        </p>
      ) : null}

      {allGone ? (
        <p className="font-display text-2xl tracking-[0.06em] text-cream/60 md:text-[30px]">
          {orderCopy.soldOut}
        </p>
      ) : (
        <>
          {!size && !errorLine ? (
            <p className="text-[10px] tracking-[0.3em] text-cream/50">
              {orderCopy.pickSize}
            </p>
          ) : null}
          <button
            type="submit"
            disabled={isPending || !size}
            className="self-start font-display text-2xl tracking-[0.06em] text-brand-red transition-colors duration-200 hover:text-brand-yellow focus-visible:underline focus-visible:underline-offset-8 disabled:cursor-not-allowed disabled:text-brand-red disabled:opacity-40 md:text-[30px]"
          >
            {isPending ? orderCopy.submitPending : orderCopy.next}
          </button>
        </>
      )}
    </form>
  );
}
