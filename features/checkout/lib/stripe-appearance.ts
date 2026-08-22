import type { Appearance, CssFontSource } from "@stripe/stripe-js";

// The card step's styling, expressed the only way Stripe accepts it.
//
// Elements render inside cross-origin iframes, so they cannot see this
// document's custom properties or Tailwind's classes -- every value has to be
// resolved here and handed over as a literal. Reading the palette back off
// :root rather than retyping the hexes keeps app/globals.css the one place a
// brand colour is written down (CLAUDE.md's no-raw-hex rule): change the token
// and the card form moves with the rest of the site.
//
// The shape being matched is the founder's order mockups -- NAME / PHONE /
// ADDRESS as a label beside a ruled blank, red on the photo, no boxes and no
// corners anywhere. That is why almost every rule below is subtractive: Stripe's
// default is a bordered, rounded, shadowed card, and the mockups have none of
// those.

type Palette = {
  red: string;
  yellow: string;
  cream: string;
};

/** Anton and Archivo are self-hosted by next/font for our own document, which
 * the iframes cannot reach. This stylesheet is Stripe's supported way in, and
 * it is the only third-party request the payment station adds. */
export const checkoutFonts: CssFontSource[] = [
  {
    cssSrc:
      "https://fonts.googleapis.com/css2?family=Anton&family=Archivo:wght@400;700&display=swap",
  },
];

/**
 * Builds the appearance from the live token values. Must run in the browser --
 * `getComputedStyle` is what resolves the custom properties, so there is
 * nothing to read during SSR.
 */
export function buildCheckoutAppearance(): Appearance {
  const palette = readPalette();

  return {
    // "flat" is the only built-in theme with no shadows to fight; the mockups
    // are printed type on a photograph, and a raised card reads as a widget
    // dropped onto one.
    theme: "flat",
    variables: {
      fontFamily: '"Archivo", ui-sans-serif, system-ui, sans-serif',
      // 16px is not a taste call: anything smaller makes iOS Safari zoom the
      // page when a field takes focus, which throws the composition off centre
      // mid-checkout.
      fontSizeBase: "16px",
      spacingUnit: "4px",
      borderRadius: "0",
      colorPrimary: palette.red,
      // Stripe derives contrast from this, so it has to name a real colour even
      // though every surface below is painted transparent to let the founder's
      // photo through.
      colorBackground: palette.cream,
      colorText: palette.red,
      colorTextSecondary: palette.red,
      colorTextPlaceholder: withAlpha(palette.red, 0.45),
      colorIcon: palette.red,
      // The shipped error line is plain red (checkout-form's `role="alert"`),
      // so danger stays red for consistency; the yellow underline below is what
      // actually points at the offending field.
      colorDanger: palette.red,
      accessibleColorOnColorPrimary: palette.cream,
      focusBoxShadow: "none",
      focusOutline: "none",
      labelSpacing: "0",
    },
    rules: {
      // Labels are the mockups' NAME / PHONE / ADDRESS: display face, small,
      // wide-tracked, sitting on the rule rather than floating in a box.
      ".Label": {
        fontFamily: '"Anton", ui-sans-serif, system-ui, sans-serif',
        fontSize: "12px",
        fontWeight: "400",
        letterSpacing: "0.1em",
        textTransform: "uppercase",
        color: palette.red,
        marginBottom: "2px",
      },
      // The ruled blank. Everything here removes something Stripe drew.
      ".Input": {
        backgroundColor: "transparent",
        border: "none",
        borderBottom: `2px solid ${palette.red}`,
        borderRadius: "0",
        boxShadow: "none",
        color: palette.red,
        padding: "6px 0",
      },
      ".Input:focus": {
        borderBottom: `2px solid ${palette.yellow}`,
        boxShadow: "none",
        outline: "none",
      },
      // Yellow is P2's ratified "this one is live" colour, used here to point
      // rather than to mean danger -- the words in .Error carry that.
      ".Input--invalid": {
        borderBottom: `2px solid ${palette.yellow}`,
        boxShadow: "none",
        color: palette.red,
      },
      ".Input::placeholder": {
        color: withAlpha(palette.red, 0.45),
      },
      ".Error": {
        fontSize: "11px",
        fontWeight: "700",
        letterSpacing: "0.1em",
        textTransform: "uppercase",
        color: palette.red,
        marginTop: "4px",
      },
      // Payment-method chooser: outlined, square, display face -- the same
      // language as the size row above it.
      ".Tab": {
        backgroundColor: "transparent",
        border: `2px solid ${palette.red}`,
        borderRadius: "0",
        boxShadow: "none",
        color: palette.red,
      },
      ".Tab:hover": {
        backgroundColor: "transparent",
        color: palette.yellow,
      },
      ".Tab--selected": {
        backgroundColor: "transparent",
        border: `2px solid ${palette.yellow}`,
        boxShadow: "none",
        color: palette.yellow,
      },
      ".Tab--selected:focus": {
        boxShadow: "none",
        outline: "none",
      },
      ".TabLabel": {
        fontFamily: '"Anton", ui-sans-serif, system-ui, sans-serif',
        fontSize: "12px",
        letterSpacing: "0.1em",
        textTransform: "uppercase",
      },
      ".TabIcon": {
        color: palette.red,
      },
      ".TabIcon--selected": {
        color: palette.yellow,
      },
      // Accordion and grouped blocks get the same treatment: no card, no
      // corner. The accordion carries no rule of its own -- it wraps the card
      // fields, and each of those already draws one, so a border here lands a
      // second line directly under the last field.
      ".AccordionItem": {
        backgroundColor: "transparent",
        border: "none",
        borderRadius: "0",
        boxShadow: "none",
        color: palette.red,
        fontFamily: '"Anton", ui-sans-serif, system-ui, sans-serif',
        fontSize: "14px",
        letterSpacing: "0.1em",
        textTransform: "uppercase",
        padding: "10px 0",
      },
      ".AccordionItem--selected": {
        backgroundColor: "transparent",
        color: palette.yellow,
      },
      ".Block": {
        backgroundColor: "transparent",
        border: `2px solid ${palette.red}`,
        borderRadius: "0",
        boxShadow: "none",
      },
      ".Dropdown": {
        backgroundColor: palette.cream,
        border: `2px solid ${palette.red}`,
        borderRadius: "0",
        boxShadow: "none",
        color: palette.red,
      },
      ".DropdownItem": {
        backgroundColor: "transparent",
        color: palette.red,
      },
      ".DropdownItem--highlight": {
        backgroundColor: withAlpha(palette.red, 0.12),
        color: palette.red,
      },
      ".CheckboxInput": {
        backgroundColor: "transparent",
        border: `2px solid ${palette.red}`,
        borderRadius: "0",
        boxShadow: "none",
      },
      ".CheckboxInput--checked": {
        backgroundColor: palette.red,
        border: `2px solid ${palette.red}`,
      },
      ".CheckboxLabel": {
        fontSize: "11px",
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        color: palette.red,
      },
      ".Text, .TermsText, .RedirectText": {
        fontSize: "11px",
        letterSpacing: "0.08em",
        color: palette.red,
      },
      ".Link, .TermsLink, .SecondaryLink": {
        color: palette.red,
        textDecoration: "underline",
      },
      ".Link:hover, .TermsLink:hover, .SecondaryLink:hover": {
        color: palette.yellow,
      },
      ".Action": {
        color: palette.red,
        textTransform: "uppercase",
        letterSpacing: "0.08em",
      },
    },
  };
}

const TOKENS = {
  red: "--brand-red",
  yellow: "--brand-yellow",
  cream: "--cream",
} as const;

function readPalette(): Palette {
  const root = getComputedStyle(document.documentElement);
  const entries = Object.entries(TOKENS).map(([key, token]) => {
    const value = root.getPropertyValue(token).trim();
    if (!value) {
      // Loud rather than silent: a renamed token would otherwise ship a card
      // form in Stripe's default blue on the founder's photo, which reads as a
      // third-party widget rather than as a bug.
      console.error(
        `[CHECKOUT] ${token} is not defined on :root -- the payment station cannot match the site`,
      );
    }
    return [key, value] as const;
  });
  return Object.fromEntries(entries) as Palette;
}

/** Stripe takes plain CSS colour strings, but only literals -- `color-mix` and
 * `var()` both resolve against a document the iframe does not have. */
function withAlpha(hex: string, alpha: number): string {
  const match = /^#?([0-9a-f]{6})$/i.exec(hex);
  if (!match) return hex;
  const int = parseInt(match[1], 16);
  const r = (int >> 16) & 255;
  const g = (int >> 8) & 255;
  const b = int & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
