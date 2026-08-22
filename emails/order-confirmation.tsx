import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Text,
} from "@react-email/components";

// Email clients need inline styles and literal colors, so the no-hex rule is
// suspended in emails/ -- values mirror :root in app/globals.css.
//
// COPY FLAG: every line below is placeholder written in the mockups' voice, and
// the pickup instructions in particular invent a fact -- where and when a campus
// pickup happens is the founder's to state. Nothing here has been sent; it needs
// his review before the first real order (PLAN.md P5 copy rule).

export type OrderConfirmationItem = {
  name: string;
  size: string;
  unitPriceCents: number;
  quantity: number;
};

export type OrderConfirmationEmailProps = {
  orderId: string;
  customerName: string | null;
  delivery: "pickup" | "shipping";
  items: OrderConfirmationItem[];
  totalCents: number;
};

export function OrderConfirmationEmail({
  orderId,
  customerName,
  delivery,
  items,
  totalCents,
}: OrderConfirmationEmailProps) {
  const isPickup = delivery === "pickup";

  return (
    <Html>
      <Head />
      <Preview>Your SWAMP MAGAZINE order is in.</Preview>
      <Body style={bodyStyle}>
        <Container style={containerStyle}>
          <Heading style={headingStyle}>SWAMP MAGAZINE</Heading>
          <Text style={leadStyle}>
            {customerName ? `${customerName.toUpperCase()}, ` : ""}YOUR ORDER IS
            IN.
          </Text>

          {items.map((item) => (
            <Text key={`${item.name}-${item.size}`} style={itemStyle}>
              {item.name.toUpperCase()} — {item.size.toUpperCase()}
              {item.quantity > 1 ? ` ×${item.quantity}` : ""} —{" "}
              {formatUsd(item.unitPriceCents * item.quantity)}
            </Text>
          ))}

          <Text style={totalStyle}>TOTAL {formatUsd(totalCents)}</Text>

          {isPickup ? (
            <Text style={textStyle}>
              PICKUP: we will email you the spot and the time before the drop.
              Bring this email.
            </Text>
          ) : (
            <Text style={textStyle}>
              SHIPPING: it goes out to the address you gave at checkout. We will
              email you when it ships.
            </Text>
          )}

          <Text style={fineStyle}>
            Order {orderId}. From Lalo Farro. Questions? Reply to this email.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

// Whole dollars when the cents are zero, matching how the mockups quote price.
function formatUsd(cents: number): string {
  const dollars = cents / 100;
  return cents % 100 === 0 ? `$${dollars}` : `$${dollars.toFixed(2)}`;
}

const bodyStyle = {
  backgroundColor: "#f4eddd",
  color: "#16110d",
  fontFamily: "Arial, Helvetica, sans-serif",
  margin: 0,
  padding: "32px 16px",
};

const containerStyle = {
  border: "2px solid #e0361f",
  maxWidth: "480px",
  padding: "32px",
};

const headingStyle = {
  color: "#e0361f",
  fontSize: "32px",
  fontWeight: 700 as const,
  letterSpacing: "0.02em",
  margin: "0 0 24px",
};

const leadStyle = {
  color: "#e0361f",
  fontSize: "16px",
  fontWeight: 700 as const,
  margin: "0 0 16px",
};

const itemStyle = {
  fontSize: "14px",
  lineHeight: "1.5",
  margin: "0 0 4px",
};

const totalStyle = {
  color: "#e0361f",
  fontSize: "14px",
  fontWeight: 700 as const,
  margin: "12px 0 24px",
};

const textStyle = {
  fontSize: "14px",
  lineHeight: "1.5",
  margin: "0 0 24px",
};

const fineStyle = {
  fontSize: "11px",
  lineHeight: "1.5",
  margin: 0,
  opacity: 0.7,
};
