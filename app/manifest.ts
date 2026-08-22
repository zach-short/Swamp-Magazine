import type { MetadataRoute } from "next";

// The manifest is JSON on the wire, so it cannot read the palette tokens from
// app/globals.css -- the same exception og-card.tsx and emails/ get, for the
// same reason, and the same two values.
const CREAM = "#f4eddd";
const RED = "#e0361f";

// Icons point at /public rather than the app/icon.png convention on purpose:
// Next serves that one from a content-hashed URL, and a manifest needs stable
// paths. The star sits well inside the red field's safe zone, so Android can
// mask it into any shape without clipping a point.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "SWAMP MAGAZINE",
    short_name: "SWAMP",
    description: "SWAMP MAGAZINE. The first issue, from Lalo Farro.",
    start_url: "/",
    display: "standalone",
    background_color: CREAM,
    theme_color: RED,
    icons: [
      { src: "/favicon.ico", sizes: "any", type: "image/x-icon" },
      {
        src: "/brand/swamp-star-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/brand/swamp-star-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
