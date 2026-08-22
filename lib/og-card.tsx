import { ImageResponse } from "next/og";

// Satori (what next/og rasterises with) has no CSS engine: no Tailwind, no
// custom properties, no var(). The palette from app/globals.css therefore
// repeats here as literals -- the same exception emails/ gets, for the same
// reason, and the same two values.
const CREAM = "#f4eddd";
const RED = "#e0361f";

export const ogImageSize = { width: 1200, height: 630 };
export const ogContentType = "image/png";

type OgCardProps = {
  eyebrow: string;
  title: string;
  footnote: string;
};

// One card for every share target. Type-only on cream, in the mockups'
// vermillion -- the display face is next/og's built-in grotesque, not Anton,
// because loading a webfont per request buys a network failure mode for a
// difference nobody sees at thumbnail size.
export function renderOgCard({ eyebrow, title, footnote }: OgCardProps) {
  return new ImageResponse(
    (
      <div
        style={{
          alignItems: "center",
          backgroundColor: CREAM,
          color: RED,
          display: "flex",
          flexDirection: "column",
          height: "100%",
          justifyContent: "center",
          padding: "64px",
          textAlign: "center",
          width: "100%",
        }}
      >
        <div
          style={{
            border: `8px solid ${RED}`,
            display: "flex",
            flexDirection: "column",
            gap: "24px",
            height: "100%",
            justifyContent: "center",
            padding: "48px",
            width: "100%",
          }}
        >
          <div style={{ fontSize: 28, letterSpacing: "0.35em" }}>{eyebrow}</div>
          <div
            style={{
              fontSize: title.length > 18 ? 96 : 128,
              fontWeight: 800,
              letterSpacing: "-0.02em",
              lineHeight: 1,
              textTransform: "uppercase",
            }}
          >
            {title}
          </div>
          <div style={{ fontSize: 28, letterSpacing: "0.35em" }}>{footnote}</div>
        </div>
      </div>
    ),
    ogImageSize,
  );
}
