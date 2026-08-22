import type { Metadata } from "next";
import { Anton, Archivo } from "next/font/google";

import { dials } from "@/config/dials";

import "./globals.css";

// Interim faces: Anton stands in for the mockups' condensed grotesque, Archivo
// for the body grotesk. The real (self-hosted) faces are a P2 decision with
// the founder.
const anton = Anton({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-anton",
});

const archivo = Archivo({
  subsets: ["latin"],
  variable: "--font-archivo",
});

// Description and title are the founder's own words off the coming-soon
// mockups ("SWAMP MAGAZINE", "THE FIRST ISSUE", "FROM LALO FARRO"), not a
// marketing gloss. metadataBase makes every relative OG/canonical URL absolute
// against the real domain, which is what crawlers and Slack/iMessage unfurls
// need; openGraph carries no explicit `images` so the app/opengraph-image.tsx
// file convention (and the per-product one) supplies them per route.
export const metadata: Metadata = {
  metadataBase: new URL(dials.canonicalSiteUrl),
  title: "SWAMP MAGAZINE",
  description: "SWAMP MAGAZINE. The first issue, from Lalo Farro.",
  applicationName: "SWAMP MAGAZINE",
  authors: [{ name: "Lalo Farro" }],
  creator: "Lalo Farro",
  openGraph: {
    type: "website",
    siteName: "SWAMP MAGAZINE",
    title: "SWAMP MAGAZINE",
    description: "SWAMP MAGAZINE. The first issue, from Lalo Farro.",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "SWAMP MAGAZINE",
    description: "SWAMP MAGAZINE. The first issue, from Lalo Farro.",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${anton.variable} ${archivo.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-cream font-body text-ink">{children}</body>
    </html>
  );
}
