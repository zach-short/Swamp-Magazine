import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Text,
} from "@react-email/components";

export type DropAnnouncementEmailProps = {
  /** Founder's copy. Everything below is his voice, not ours. */
  headline: string;
  body: string;
  shopUrl: string;
  unsubscribeUrl: string;
  ctaLabel?: string;
  /**
   * CAN-SPAM requires a valid physical postal address in every commercial
   * send. The founder has to supply one before the first announcement goes
   * out; the block renders only when it exists so nothing is invented here.
   */
  postalAddress?: string;
};

// Email clients need inline styles and literal colors, so the no-hex rule is
// suspended in emails/ -- values mirror :root in app/globals.css. Copy is a
// prop rather than baked in: the announcement is the founder's, composed in the
// admin, and this template is only the frame it arrives in.
export function DropAnnouncementEmail({
  headline,
  body,
  shopUrl,
  unsubscribeUrl,
  ctaLabel = "SHOP THE FIRST ISSUE",
  postalAddress,
}: DropAnnouncementEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>{headline}</Preview>
      <Body style={bodyStyle}>
        <Container style={containerStyle}>
          <Heading style={headingStyle}>SWAMP MAGAZINE</Heading>
          <Text style={leadStyle}>{headline}</Text>
          <Text style={textStyle}>{body}</Text>

          <Button href={shopUrl} style={buttonStyle}>
            {ctaLabel}
          </Button>

          <Hr style={ruleStyle} />

          <Text style={fineStyle}>
            From Lalo Farro. You are getting this because you asked for your
            finger on the pulse.{" "}
            <Link href={unsubscribeUrl} style={linkStyle}>
              Unsubscribe
            </Link>
            .
          </Text>
          {postalAddress ? <Text style={fineStyle}>{postalAddress}</Text> : null}
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
  // Founder copy arrives as a block of text; his line breaks survive.
  whiteSpace: "pre-line" as const,
};

const buttonStyle = {
  backgroundColor: "#e0361f",
  color: "#f4eddd",
  display: "block",
  fontSize: "16px",
  fontWeight: 700 as const,
  letterSpacing: "0.08em",
  padding: "14px 24px",
  textAlign: "center" as const,
  textDecoration: "none",
};

const ruleStyle = {
  borderColor: "#e0361f",
  margin: "32px 0 16px",
};

const fineStyle = {
  fontSize: "11px",
  lineHeight: "1.5",
  margin: "0 0 8px",
  opacity: 0.7,
};

const linkStyle = {
  color: "#16110d",
  textDecoration: "underline",
};
