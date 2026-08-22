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
// suspended in emails/ -- values mirror :root in app/globals.css. Copy leans on
// the founder's mockup language; he reviews outbound copy before P5 sends.
export function SubscribeConfirmationEmail() {
  return (
    <Html>
      <Head />
      <Preview>Finger on the pulse. First issue coming soon.</Preview>
      <Body style={bodyStyle}>
        <Container style={containerStyle}>
          <Heading style={headingStyle}>SWAMP MAGAZINE</Heading>
          <Text style={leadStyle}>YOU HAVE YOUR FINGER ON THE PULSE.</Text>
          <Text style={textStyle}>
            We will update you on order status + new products. The first issue
            is coming soon.
          </Text>
          <Text style={fineStyle}>
            From Lalo Farro. Cancel any time: reply to this email and say stop.
          </Text>
        </Container>
      </Body>
    </Html>
  );
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
  margin: "0 0 12px",
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
