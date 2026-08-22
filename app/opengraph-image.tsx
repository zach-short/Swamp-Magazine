import { ogContentType, ogImageSize, renderOgCard } from "@/lib/og-card";

export const alt = "SWAMP MAGAZINE — THE FIRST ISSUE, FROM LALO FARRO";
export const size = ogImageSize;
export const contentType = ogContentType;

export default async function OpengraphImage() {
  return renderOgCard({
    eyebrow: "FROM LALO FARRO",
    title: "SWAMP MAGAZINE",
    footnote: "THE FIRST ISSUE",
  });
}
