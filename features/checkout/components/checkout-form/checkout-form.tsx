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
      price: `+${formatUsd(dials.shippingFlatRateCents)}`,
    },
  ];

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
      <div className="flex w-full flex-col gap-5 text-center font-body text-brand-red">
        {/* The sizes stay on the page when ordering is not armed yet. Dropping
            them would take the row the mockups are built around off the product
            screen, so an un-keyed deploy would read as broken rather than as
            not open yet. */}
        <ul className="flex flex-wrap items-baseline justify-center gap-x-5 gap-y-2 font-display text-4xl leading-none sm:text-5xl">
          {sizes.map((option) => (
            <li
              key={option.size}
              className={option.soldOut ? "line-through opacity-40" : undefined}
            >
              {option.size}
              {option.soldOut ? <span className="sr-only"> sold out</span> : null}
            </li>
          ))}
        </ul>
        {/* P2's product page guaranteed the price shows plainly wherever the
            order block isn't. The ledger carries it once ordering is armed, but
            this branch has no ledger, so the price is stated on its own -- bare,
            with no delivery or total line that would imply you can buy it yet. */}
        <p className="font-display text-2xl sm:text-3xl">
          {formatUsd(priceCents)}
        </p>
        <p className="font-display text-3xl tracking-wide opacity-70 sm:text-4xl">
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
      className="flex w-full flex-col gap-5 text-center font-body text-brand-red"
    >
      <fieldset disabled={isPending}>
        <legend className="sr-only">SIZE</legend>
        <div className="flex flex-wrap items-baseline justify-center gap-x-5 gap-y-2 font-display text-4xl leading-none sm:text-5xl">
          {sizes.map((option) => (
            <label
              key={option.size}
              className={cn(
                "cursor-pointer",
                option.soldOut
                  ? "cursor-not-allowed line-through opacity-40"
                  : size === option.size
                    ? "text-brand-yellow"
                    : "hover:opacity-70",
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
        <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 font-display text-2xl leading-none">
          {deliveryOptions.map((option) => (
            <label
              key={option.value}
              className={cn(
                "cursor-pointer",
                delivery === option.value
                  ? "text-brand-yellow"
                  : "hover:opacity-70",
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
                {option.label}{" "}
                <span className="font-body text-xs tracking-widest">
                  {option.price}
                </span>
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
        <p role="alert" className="text-xs font-bold tracking-widest">
          {errorLine}
        </p>
      ) : null}

      {allGone ? (
        <p className="font-display text-3xl tracking-wide opacity-70">
          {orderCopy.soldOut}
        </p>
      ) : (
        <>
          {!size && !errorLine ? (
            <p className="text-xs tracking-widest opacity-70">
              {orderCopy.pickSize}
            </p>
          ) : null}
          <button
            type="submit"
            disabled={isPending || !size}
            className="self-center font-display text-4xl tracking-wide hover:text-brand-yellow focus-visible:underline focus-visible:underline-offset-8 disabled:cursor-not-allowed disabled:text-brand-red disabled:opacity-40"
          >
            {isPending ? orderCopy.submitPending : orderCopy.next}
          </button>
        </>
      )}
    </form>
  );
}
