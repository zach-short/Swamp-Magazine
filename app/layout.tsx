import type { Metadata } from "next";
import { Anton, Archivo } from "next/font/google";

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

export const metadata: Metadata = {
  title: "SWAMP MAGAZINE",
  description: "SWAMP MAGAZINE. The first issue, from Lalo Farro.",
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
