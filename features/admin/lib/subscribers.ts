import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

import type { SubscriberCsvRow } from "./subscriber-csv";

// `subscribers` carries no RLS policies at all (P1, deliberately), so the
// service-role client is the only way to reach it -- never the anon client,
// and never from the browser.

// The on-screen list is capped: the founder reads this on a phone, and the
// export is what exists for the whole table. Raised only if the list view
// stops being a glance.
const LIST_LIMIT = 200;

export type SubscriberRecord = SubscriberCsvRow & { id: string };

export type SubscriberList = {
  total: number;
  active: number;
  rows: SubscriberRecord[];
  truncated: boolean;
  failed: boolean;
};

type SubscriberRow = {
  id: string;
  email: string;
  phone: string | null;
  email_consent: boolean;
  sms_consent: boolean;
  unsubscribed_at: string | null;
  created_at: string;
};

const SELECT =
  "id, email, phone, email_consent, sms_consent, unsubscribed_at, created_at";

const EMPTY: SubscriberList = {
  total: 0,
  active: 0,
  rows: [],
  truncated: false,
  failed: true,
};

export async function getSubscriberList(): Promise<SubscriberList> {
  try {
    const supabase = createAdminClient();
    const [totalResult, activeResult, rowsResult] = await Promise.all([
      supabase.from("subscribers").select("id", { count: "exact", head: true }),
      supabase
        .from("subscribers")
        .select("id", { count: "exact", head: true })
        .is("unsubscribed_at", null),
      supabase
        .from("subscribers")
        .select(SELECT)
        .order("created_at", { ascending: false })
        .limit(LIST_LIMIT),
    ]);

    if (rowsResult.error) {
      console.error(
        "[ADMIN_SUBSCRIBERS]",
        rowsResult.error.code,
        rowsResult.error.message,
      );
      return EMPTY;
    }

    const total = totalResult.count ?? 0;
    return {
      total,
      active: activeResult.count ?? 0,
      rows: ((rowsResult.data ?? []) as SubscriberRow[]).map(toRecord),
      truncated: total > LIST_LIMIT,
      failed: false,
    };
  } catch (error) {
    console.error("[ADMIN_SUBSCRIBERS]", error);
    return EMPTY;
  }
}

/**
 * Every subscriber, oldest first, for the CSV export -- uncapped on purpose.
 * `null` means the read failed, which the route surfaces as an error rather
 * than handing the founder a plausible-looking empty file.
 */
export async function getSubscribersForExport(): Promise<SubscriberCsvRow[] | null> {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("subscribers")
      .select(SELECT)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("[ADMIN_SUBSCRIBERS_EXPORT]", error.code, error.message);
      return null;
    }
    return ((data ?? []) as SubscriberRow[]).map(toRecord);
  } catch (error) {
    console.error("[ADMIN_SUBSCRIBERS_EXPORT]", error);
    return null;
  }
}

function toRecord(row: SubscriberRow): SubscriberRecord {
  return {
    id: row.id,
    email: row.email,
    phone: row.phone,
    emailConsent: row.email_consent,
    smsConsent: row.sms_consent,
    unsubscribedAt: row.unsubscribed_at,
    createdAt: row.created_at,
  };
}
