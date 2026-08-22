import { NextResponse } from "next/server";

import {
  buildSubscriberCsv,
  getSubscribersForExport,
  resolveAdminAccess,
  subscriberCsvFilename,
} from "@/features/admin";

// Never cached: the response is a live read of a table that changes with every
// signup, and it is gated on the caller's session.
export const dynamic = "force-dynamic";

// A route handler is NOT covered by the (guarded) layout, so it re-runs the
// guard itself. Without this, the whole subscriber list -- every email and
// phone number the brand has collected -- would be one URL away from anyone.
export async function GET() {
  const access = await resolveAdminAccess();
  if (access.status !== "ok") {
    console.error("[ADMIN_EXPORT] denied:", access.reason);
    return new NextResponse("Not authorized", { status: 401 });
  }

  const rows = await getSubscribersForExport();
  if (!rows) {
    // Better a visible error than a plausible empty spreadsheet the founder
    // might mistake for "nobody signed up".
    return new NextResponse("Could not read subscribers", { status: 500 });
  }

  return new NextResponse(buildSubscriberCsv(rows), {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${subscriberCsvFilename(new Date())}"`,
      "cache-control": "no-store",
    },
  });
}
