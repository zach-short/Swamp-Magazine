import { describe, expect, it } from "vitest";

import {
  buildSubscriberCsv,
  escapeCsvCell,
  subscriberCsvFilename,
  type SubscriberCsvRow,
} from "./subscriber-csv";

const baseRow: SubscriberCsvRow = {
  email: "goblin@swamp.test",
  phone: "+15555550123",
  emailConsent: true,
  smsConsent: false,
  unsubscribedAt: null,
  createdAt: "2026-08-22T12:00:00.000Z",
};

function bodyLines(csv: string): string[] {
  return csv.replace("\ufeff", "").trimEnd().split("\r\n");
}

describe("escapeCsvCell", () => {
  it("leaves ordinary values alone", () => {
    expect(escapeCsvCell("goblin@swamp.test")).toBe("goblin@swamp.test");
  });

  it("quotes commas", () => {
    expect(escapeCsvCell("farro, lalo")).toBe('"farro, lalo"');
  });

  it("doubles embedded quotes", () => {
    expect(escapeCsvCell('the "swamp"')).toBe('"the ""swamp"""');
  });

  it("quotes newlines so a field cannot become a row", () => {
    expect(escapeCsvCell("line one\nline two")).toBe('"line one\nline two"');
  });
});

describe("buildSubscriberCsv", () => {
  it("writes a header and one line per subscriber", () => {
    const lines = bodyLines(buildSubscriberCsv([baseRow, baseRow]));
    expect(lines[0]).toBe(
      "email,phone,email_consent,sms_consent,unsubscribed_at,created_at",
    );
    expect(lines).toHaveLength(3);
  });

  it("starts with a BOM and uses CRLF records", () => {
    const csv = buildSubscriberCsv([baseRow]);
    expect(csv.startsWith("\ufeff")).toBe(true);
    expect(csv.endsWith("\r\n")).toBe(true);
  });

  it("renders a missing phone as an empty cell, not the string null", () => {
    const csv = buildSubscriberCsv([{ ...baseRow, phone: null }]);
    expect(bodyLines(csv)[1]).toBe(
      "goblin@swamp.test,,true,false,,2026-08-22T12:00:00.000Z",
    );
  });

  it("keeps column count stable when a field contains a comma", () => {
    const csv = buildSubscriberCsv([{ ...baseRow, email: 'a,b"c@swamp.test' }]);
    expect(bodyLines(csv)[1]).toBe(
      '"a,b""c@swamp.test",+15555550123,true,false,,2026-08-22T12:00:00.000Z',
    );
  });

  it("still emits the header for an empty list", () => {
    expect(bodyLines(buildSubscriberCsv([]))).toHaveLength(1);
  });
});

describe("subscriberCsvFilename", () => {
  it("stamps the UTC date", () => {
    expect(subscriberCsvFilename(new Date("2026-08-22T23:30:00.000Z"))).toBe(
      "swamp-subscribers-2026-08-22.csv",
    );
  });
});
