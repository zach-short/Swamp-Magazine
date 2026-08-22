// CSV assembly, kept pure and separate from the database read so the escaping
// is testable. A quote or comma inside a field silently shifts every later
// column in the founder's spreadsheet -- exactly the kind of failure BD-5 says
// to cover with a test.

export type SubscriberCsvRow = {
  email: string;
  phone: string | null;
  emailConsent: boolean;
  smsConsent: boolean;
  unsubscribedAt: string | null;
  createdAt: string;
};

const HEADER = [
  "email",
  "phone",
  "email_consent",
  "sms_consent",
  "unsubscribed_at",
  "created_at",
];

// Byte-order mark: without it Excel reads the file as the local ANSI codepage.
const BOM = "\ufeff";

/** Prefixed with a BOM so Excel opens it as UTF-8 instead of mangling it. */
export function buildSubscriberCsv(rows: SubscriberCsvRow[]): string {
  const lines = [HEADER, ...rows.map(toCells)].map((cells) =>
    cells.map(escapeCsvCell).join(","),
  );
  // RFC 4180 line endings; trailing break so the last row is a complete record.
  return `${BOM}${lines.join("\r\n")}\r\n`;
}

export function escapeCsvCell(value: string): string {
  if (!/[",\r\n]/.test(value)) return value;
  return `"${value.replaceAll('"', '""')}"`;
}

export function subscriberCsvFilename(now: Date): string {
  return `swamp-subscribers-${now.toISOString().slice(0, 10)}.csv`;
}

function toCells(row: SubscriberCsvRow): string[] {
  return [
    row.email,
    row.phone ?? "",
    String(row.emailConsent),
    String(row.smsConsent),
    row.unsubscribedAt ?? "",
    row.createdAt,
  ];
}
