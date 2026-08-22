import Link from "next/link";

// COPY FLAG: written in the mockups' voice but invented -- the founder has no
// order-confirmation mock. The pickup line promises a follow-up email rather
// than naming a spot, since where and when pickup happens is his to say.

export type OrderConfirmedItem = {
  description: string;
  amountTotalCents: number;
  quantity: number;
};

export type OrderConfirmedScreenProps = {
  email: string | null;
  name: string | null;
  totalCents: number;
  delivery: "pickup" | "shipping";
  items: OrderConfirmedItem[];
};

export function OrderConfirmedScreen({
  email,
  name,
  totalCents,
  delivery,
  items,
}: OrderConfirmedScreenProps) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-cream px-6 py-16 text-ink">
      <div className="w-full max-w-lg">
        <h1 className="font-display text-5xl leading-none text-brand-red sm:text-6xl">
          {name ? `${name.toUpperCase()}, ` : ""}YOU&rsquo;RE IN.
        </h1>

        <p className="mt-6 font-body text-sm uppercase tracking-wide">
          Your order is placed.
          {email ? ` A receipt is on its way to ${email}.` : ""}
        </p>

        <ul className="mt-8 border-t border-ink/20 font-body text-sm uppercase">
          {items.map((item) => (
            <li
              key={item.description}
              className="flex justify-between border-b border-ink/20 py-3"
            >
              <span>
                {item.description}
                {item.quantity > 1 ? ` ×${item.quantity}` : ""}
              </span>
              <span>{formatUsd(item.amountTotalCents)}</span>
            </li>
          ))}
          <li className="flex justify-between py-3 font-display text-lg text-brand-red">
            <span>TOTAL</span>
            <span>{formatUsd(totalCents)}</span>
          </li>
        </ul>

        <p className="mt-8 font-body text-sm uppercase tracking-wide">
          {delivery === "pickup"
            ? "Pickup: we’ll email you the spot and the time before the drop."
            : "Shipping: it goes out to the address you gave at checkout."}
        </p>

        <Link
          href="/"
          className="mt-10 inline-block font-display text-2xl text-brand-red transition-colors hover:text-brand-yellow"
        >
          BACK
        </Link>
      </div>
    </main>
  );
}

// Whole dollars when the cents are zero, matching how the mockups quote price.
function formatUsd(cents: number): string {
  const dollars = cents / 100;
  return cents % 100 === 0 ? `$${dollars}` : `$${dollars.toFixed(2)}`;
}
