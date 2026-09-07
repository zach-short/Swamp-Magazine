import {
  CheckoutElementsProvider,
  ContactDetailsElement,
  ExpressCheckoutElement,
  PaymentElement,
  ShippingAddressElement,
  useCheckoutElements,
} from "@stripe/react-stripe-js/checkout";
import type {
  StripeExpressCheckoutElementConfirmEvent,
  StripeExpressCheckoutElementReadyEvent,
} from "@stripe/stripe-js";
import { useState, type FormEvent } from "react";

import type { DeliveryMethod } from "@/actions/create-checkout-session";

import { OrderLedger } from "../order-ledger/order-ledger";
import {
  formatUsd,
  orderCopy,
  paymentErrorLine,
} from "../../lib/order-copy";
import {
  buildCheckoutAppearance,
  checkoutFonts,
} from "../../lib/stripe-appearance";
import { stripePromise } from "../../lib/stripe-client";

export type PaymentStationProps = {
  clientSecret: string;
  orderId: string | null;
  name: string;
  size: string | null;
  priceCents: number;
  delivery: DeliveryMethod;
  deliveryLabel: string;
  shippingCents: number;
  totalCents: number;
  onChangeSize: () => void;
};

// The card step. Under D2 this was Stripe's own page inside an iframe; it is now
// our composition -- our ledger, our labels, our chooser, our SUBMIT -- with
// only the fields that touch a card number still owned by Stripe (which is what
// keeps this a SAQ-A integration rather than one that handles PANs). Everything
// visual comes from ../../lib/stripe-appearance.
export function PaymentStation({
  clientSecret,
  orderId,
  ...fields
}: PaymentStationProps) {
  // The appearance resolves the palette off :root, so it can only be built in
  // the browser. That holds here because this component never renders until a
  // client-side submit has produced a client secret.
  const [appearance] = useState(buildCheckoutAppearance);

  return (
    // The order id rides the DOM so a P3 proof can tie what the buyer sees to
    // the row in `orders` without digging through logs.
    <section
      data-order-id={orderId}
      className="flex w-full flex-col gap-4 text-brand-red"
    >
      <CheckoutElementsProvider
        stripe={stripePromise}
        options={{
          clientSecret,
          elementsOptions: { appearance, fonts: checkoutFonts },
        }}
      >
        <PaymentFields {...fields} />
      </CheckoutElementsProvider>
    </section>
  );
}

type PaymentFieldsProps = Omit<PaymentStationProps, "clientSecret" | "orderId">;

/** Only the card path has a form left to fill, so it is the only choice worth
 * remembering: a wallet takes the screen with its own sheet the moment its
 * button is pressed, and dismissing that sheet puts every option back. */
type ChosenMethod = "card" | null;

function PaymentFields({
  name,
  size,
  priceCents,
  delivery,
  deliveryLabel,
  shippingCents,
  totalCents,
  onChangeSize,
}: PaymentFieldsProps) {
  const checkoutState = useCheckoutElements();
  // The mockups' NAME line. It is ours rather than Stripe's because under
  // `elements` the card block collects only what the card network needs -- no
  // name anywhere -- and `customer_details.name` is what the confirmation
  // email greets and what the founder calls out at pickup.
  const [buyerName, setBuyerName] = useState("");
  const [method, setMethod] = useState<ChosenMethod>(null);
  // Stays null until the wallet element reports what the browser offers. On one
  // with neither wallet there is nothing to choose between, so the chooser
  // never appears and the card fields stand on their own.
  const [hasWallets, setHasWallets] = useState<boolean | null>(null);
  const [errorLine, setErrorLine] = useState<string | null>(null);
  const [isPaying, setIsPaying] = useState(false);

  if (checkoutState.type === "loading") {
    return (
      <div className="flex flex-col gap-4">
        <OrderLedger
          name={name}
          priceCents={priceCents}
          deliveryLabel={deliveryLabel}
          shippingCents={shippingCents}
          size={size}
          totalDisplay={formatUsd(totalCents)}
        />
        <p className="text-xs tracking-widest opacity-70">
          {orderCopy.paymentLoading}
        </p>
      </div>
    );
  }

  if (checkoutState.type === "error") {
    return (
      <div className="flex flex-col gap-4">
        <p role="alert" className="text-xs font-bold tracking-widest">
          {paymentErrorLine(checkoutState.error.message)}
        </p>
        <div className="flex flex-col items-center">
          <QuietAction onClick={onChangeSize}>
            {orderCopy.changeSize}
          </QuietAction>
        </div>
      </div>
    );
  }

  const { checkout } = checkoutState;
  const isChoosing = method === null;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isPaying) return;
    const trimmedName = buyerName.trim();
    if (!trimmedName) {
      setErrorLine(orderCopy.nameMissing);
      return;
    }
    setErrorLine(null);
    setIsPaying(true);

    // A success never returns: confirm redirects to the session's return_url
    // (/order?session_id=...), which is why the order-confirmed page still does
    // its own status check rather than trusting anything this component says.
    // Merged onto whatever the card block already put on the session (it
    // collects country and ZIP) rather than replacing it: this call only ever
    // adds the name, so a postal code the issuer wants for AVS cannot be
    // dropped on the way past.
    const existing = checkout.billingAddress;
    const result = await checkout.confirm({
      billingAddress: {
        name: trimmedName,
        address: existing?.address ?? { country: "US" },
      },
    });
    if (result.type === "error") {
      setErrorLine(paymentErrorLine(result.error.message));
    }
    setIsPaying(false);
  }

  // The wallet sheet has already collected and authorised everything by the time
  // this fires; handing the event back to confirm is what ties that
  // authorisation to this session.
  async function handleWalletConfirm(
    event: StripeExpressCheckoutElementConfirmEvent,
  ) {
    setErrorLine(null);
    setIsPaying(true);
    // Nothing is passed here on purpose: the wallet sheet is the only place
    // this path collects anything, and its name, email and address land on the
    // session at confirm. Adding our own would either be overwritten or
    // silently overwrite the payer's, which is the mismatch the chooser-first
    // layout exists to prevent.
    const result = await checkout.confirm({
      expressCheckoutConfirmEvent: event,
    });
    if (result.type === "error") {
      setErrorLine(paymentErrorLine(result.error.message));
    }
    setIsPaying(false);
  }

  function handleWalletReady(event: StripeExpressCheckoutElementReadyEvent) {
    const available = Boolean(event.availablePaymentMethods);
    setHasWallets(available);
    // Nothing to choose between, so go straight to the fields rather than make
    // a buyer press CARD to reach the only option there is.
    if (!available) setMethod("card");
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <OrderLedger
        name={name}
        priceCents={priceCents}
        deliveryLabel={deliveryLabel}
        shippingCents={shippingCents}
        size={size}
        totalDisplay={readTotal(checkout, totalCents)}
      />

      <fieldset disabled={isPaying} className="flex flex-col gap-5">
        {/* The chooser comes first because a wallet sheet collects the payer's
            own name, email and address and confirms against those -- they land
            on the session at confirm and overwrite whatever this page put
            there. Asking for contact details above the choice meant an Apple
            Pay buyer typed an email, watched it be discarded, and got the
            confirmation at their Apple ID address instead. Everything below is
            therefore card-path only; the wallet path asks for nothing. */}
        <div className={isChoosing ? "flex flex-col gap-3" : "hidden"}>
          <p className="text-xs tracking-widest opacity-70">
            {orderCopy.payWith}
          </p>

          {/* Apple and Google both require their own marks on their own
              buttons, so this is the one block on the site whose look is not
              ours to set. It stays mounted (hidden, not unmounted) once the
              card is chosen because unmounting would throw away what `ready`
              told us, and CHANGE PAYMENT METHOD needs that answer to know
              whether there is anything to change back to. */}
          <ExpressCheckoutElement
            // Every key here is spelled out because the Checkout-Sessions
            // variant of these options types them all as required, unlike
            // the Elements one.
            options={{
              buttonHeight: 48,
              // The outlined themes are the closest the wallets get to the
              // mockups' outlined-square language; Google Pay has no
              // white-outline, so plain white is its nearest match.
              buttonTheme: { applePay: "white-outline", googlePay: "white" },
              buttonType: { applePay: "buy", googlePay: "buy" },
              layout: { maxColumns: 1, overflow: "never" },
              paymentMethodOrder: ["applePay", "googlePay"],
              paymentMethods: {
                applePay: "auto",
                googlePay: "auto",
                link: "never",
                paypal: "never",
                amazonPay: "never",
                klarna: "never",
              },
            }}
            onReady={handleWalletReady}
            onConfirm={handleWalletConfirm}
          />

          <button
            type="button"
            onClick={() => setMethod("card")}
            className="border-2 border-current py-3 font-display text-2xl tracking-wide hover:text-brand-yellow focus-visible:underline focus-visible:underline-offset-8 focus-visible:outline-none"
          >
            {orderCopy.payWithCard}
          </button>
        </div>

        {isChoosing ? null : (
          <>
            <label className="flex flex-col">
              <span className="font-display text-xs tracking-widest">
                {orderCopy.name}
              </span>
              <input
                type="text"
                name="buyer-name"
                autoComplete="name"
                value={buyerName}
                onChange={(event) => setBuyerName(event.target.value)}
                // Unrequired at the DOM level so the browser cannot block
                // submit before handleSubmit has a chance to say it in the
                // mockups' voice; that check is what actually gates the card.
                className="border-b-2 border-current bg-transparent py-1.5 text-base text-brand-red outline-none placeholder:text-brand-red/45 focus:border-brand-yellow"
              />
            </label>

            <ContactDetailsElement />

            {delivery === "shipping" ? <ShippingAddressElement /> : null}

            <PaymentElement
              options={{
                // Expanded, headerless, no radio: the buyer already chose CARD
                // in the chooser above, so a collapsed row labelled "Card" is
                // the same decision asked twice.
                layout: {
                  type: "accordion",
                  defaultCollapsed: false,
                  radios: "never",
                  spacedAccordionItems: false,
                },
                // The wallets live in the chooser above, so the Payment Element
                // must not draw its own set -- two Apple Pay buttons on one
                // screen is what this prevents. Link is off here as well as on
                // the session: it is a wallet as well as a payment method type,
                // and excluding it takes both.
                wallets: {
                  applePay: "never",
                  googlePay: "never",
                  link: "never",
                },
              }}
            />
          </>
        )}
      </fieldset>

      {errorLine ? (
        <p role="alert" className="text-xs font-bold tracking-widest">
          {errorLine}
        </p>
      ) : null}

      {/* No SUBMIT while choosing: a wallet is authorised inside its own sheet,
          so the card is the only choice with anything left to send. */}
      {isChoosing ? null : (
        <button
          type="submit"
          disabled={isPaying}
          className="self-center font-display text-4xl tracking-wide hover:text-brand-yellow focus-visible:underline focus-visible:underline-offset-8 disabled:cursor-not-allowed disabled:text-brand-red disabled:opacity-40"
        >
          {isPaying ? orderCopy.submitPending : orderCopy.submit}
        </button>
      )}

      <div className="flex flex-col items-center gap-2">
        {/* Only worth offering when the chooser had more than one entry. */}
        {!isChoosing && hasWallets ? (
          <QuietAction onClick={() => setMethod(null)} disabled={isPaying}>
            {orderCopy.changePayment}
          </QuietAction>
        ) : null}
        <QuietAction onClick={onChangeSize} disabled={isPaying}>
          {orderCopy.changeSize}
        </QuietAction>
      </div>
    </form>
  );
}

function QuietAction({
  onClick,
  disabled,
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  children: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="text-xs tracking-widest underline underline-offset-4 opacity-70 hover:text-brand-yellow hover:opacity-100 disabled:cursor-not-allowed"
    >
      {children}
    </button>
  );
}

type CheckoutTotals = {
  currency: string;
  minorUnitsAmountDivisor: number;
  total: { total: { amount: string; minorUnitsAmount: number } };
};

/**
 * Stripe requires the confirming page to read the session's own total, so that
 * a figure it later adds (a surcharge, adaptive pricing) cannot be charged
 * without appearing on screen -- `confirm()` throws otherwise. Reading the
 * minor-unit form rather than the pre-formatted string satisfies that and still
 * lets the house formatter say "$25" where Stripe would say "$25.00".
 */
function readTotal(checkout: CheckoutTotals, fallbackCents: number): string {
  const { currency, minorUnitsAmountDivisor } = checkout;
  const { amount, minorUnitsAmount } = checkout.total.total;
  if (currency !== "usd" || minorUnitsAmountDivisor !== 100) {
    // Unreachable in a single-currency shop, and if it ever is reached Stripe's
    // own string is the correct number in the wrong register -- which beats our
    // formatter being confidently wrong about the units.
    return amount;
  }
  return formatUsd(minorUnitsAmount || fallbackCents);
}
