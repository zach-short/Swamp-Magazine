import { formatUsd, orderCopy } from "../../lib/order-copy";

export type OrderLedgerProps = {
  name: string;
  priceCents: number;
  deliveryLabel: string;
  shippingCents: number;
  size: string | null;
  /** What the TOTAL row reads. The size step computes it; the card step passes
   * Stripe's own figure instead, so the number a buyer agrees to is the number
   * being charged rather than our arithmetic about it. */
  totalDisplay: string;
};

// The mockups quote one number ("PLEASE VENMO $20"). Shipping (D2) makes that a
// sum, and nobody should learn the real charge inside the card fields.
export function OrderLedger({
  name,
  priceCents,
  deliveryLabel,
  shippingCents,
  size,
  totalDisplay,
}: OrderLedgerProps) {
  return (
    <dl className="flex flex-col gap-1 border-t-2 border-current pt-3 text-sm tracking-widest">
      <div className="flex items-baseline justify-between gap-4">
        <dt>
          {name.toUpperCase()}
          {size ? ` ${size}` : ""}
        </dt>
        <dd>{formatUsd(priceCents)}</dd>
      </div>
      <div className="flex items-baseline justify-between gap-4">
        <dt>{deliveryLabel}</dt>
        <dd>{shippingCents > 0 ? formatUsd(shippingCents) : orderCopy.free}</dd>
      </div>
      <div className="flex items-baseline justify-between gap-4 font-display text-2xl tracking-wide">
        <dt>{orderCopy.total}</dt>
        <dd>{totalDisplay}</dd>
      </div>
    </dl>
  );
}
