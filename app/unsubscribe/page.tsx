import type { Metadata } from "next";

import { UnsubscribeScreen } from "@/features/coming-soon";

export const metadata: Metadata = {
  title: "UNSUBSCRIBE — SWAMP MAGAZINE",
  // A per-subscriber link has no business in a search index.
  robots: { index: false, follow: false },
};

// searchParams is typed inline rather than through PageProps<"/unsubscribe">:
// Next only regenerates .next/types on a build, so the generated route union
// does not know about a route added since the last one and `tsc --noEmit` would
// fail on a page that serves perfectly well.
type UnsubscribePageProps = {
  searchParams: Promise<{ id?: string | string[] }>;
};

export default async function UnsubscribePage({
  searchParams,
}: UnsubscribePageProps) {
  const { id } = await searchParams;
  // A repeated ?id= arrives as an array and is refused rather than coerced --
  // the action would reject it anyway, but nothing should guess at a token.
  return <UnsubscribeScreen token={typeof id === "string" ? id : ""} />;
}
