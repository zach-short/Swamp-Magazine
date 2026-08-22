"use server";

import { Resend } from "resend";
import { z } from "zod";

import { dials } from "@/config/dials";
import { DropAnnouncementEmail } from "@/emails/drop-announcement";
import {
  buildUnsubscribeUrl,
  splitIntoBatches,
} from "@/lib/announcement-batches";
import { serverEnv } from "@/lib/env/server";
import { createAdminClient } from "@/lib/supabase/admin";

export type SendAnnouncementFailure =
  | "invalid-input"
  | "no-recipients"
  | "send-failed"
  | "server-error";

export type SendAnnouncementResult =
  | { status: "success"; recipients: number; batches: number }
  | { status: "error"; reason: SendAnnouncementFailure };

export type SendAnnouncementInput = {
  /**
   * Stable id for one composed announcement, reused verbatim on a retry. It
   * becomes the per-batch Resend idempotency key, so re-running after a
   * half-finished send does not mail the first batches twice.
   */
  sendId: string;
  subject: string;
  headline: string;
  body: string;
  /** Where the CTA points; defaults to the storefront root. */
  ctaUrl?: string;
  ctaLabel?: string;
  /** CAN-SPAM postal address. Founder-supplied; see the template's note. */
  postalAddress?: string;
};

type Recipient = { id: string; email: string };

// PostgREST caps a plain select at 1000 rows. Paging explicitly means a list
// that outgrows that gets mailed in full instead of silently truncated.
const RECIPIENT_PAGE_SIZE = 1000;

// The copy is the founder's and arrives from the admin composer -- no defaults,
// so an empty or accidental invocation mails nobody.
const inputSchema = z.object({
  sendId: z.string().trim().min(1).max(120),
  subject: z.string().trim().min(1).max(200),
  headline: z.string().trim().min(1).max(200),
  body: z.string().trim().min(1),
  ctaUrl: z.url().optional(),
  ctaLabel: z.string().trim().min(1).max(60).optional(),
  postalAddress: z.string().trim().min(1).max(200).optional(),
});

/**
 * Batched drop announcement to every consenting, still-subscribed address.
 *
 * Nothing in the app calls this yet, by design: the send button lands with the
 * admin composer (P4/P5), and whoever mounts it owns the authorization check --
 * this action trusts its caller completely.
 */
export async function sendDropAnnouncement(
  input: SendAnnouncementInput,
): Promise<SendAnnouncementResult> {
  const parsed = inputSchema.safeParse(input);
  if (!parsed.success) {
    console.error("[ANNOUNCEMENT] rejected input", parsed.error.issues);
    return { status: "error", reason: "invalid-input" };
  }
  const { sendId, subject, headline, body, ctaUrl, ctaLabel, postalAddress } =
    parsed.data;

  try {
    const recipients = await getRecipients();
    if (recipients.length === 0) return { status: "error", reason: "no-recipients" };

    const batches = splitIntoBatches(recipients, dials.announcementBatchSize);
    const resend = new Resend(serverEnv.resendApiKey);
    const shopUrl = ctaUrl ?? dials.canonicalSiteUrl;
    let delivered = 0;

    for (const [index, batch] of batches.entries()) {
      const { error } = await resend.batch.send(
        batch.map((recipient) => {
          const unsubscribeUrl = buildUnsubscribeUrl(
            dials.canonicalSiteUrl,
            recipient.id,
          );
          return {
            from: serverEnv.resendFrom,
            to: recipient.email,
            subject,
            // Gmail and Apple Mail surface this as a native unsubscribe control;
            // the in-body link (CAN-SPAM) is rendered by the template as well.
            headers: { "List-Unsubscribe": `<${unsubscribeUrl}>` },
            react: DropAnnouncementEmail({
              headline,
              body,
              shopUrl,
              unsubscribeUrl,
              ctaLabel,
              postalAddress,
            }),
          };
        }),
        { idempotencyKey: `${sendId}:${index}` },
      );

      if (error) {
        // Stop rather than hammer a rate-limited or misconfigured account, and
        // say exactly how far the send got: without this line a resume is a
        // guess, and a guess means somebody gets the announcement twice.
        console.error(
          "[ANNOUNCEMENT] batch",
          index,
          "failed after",
          delivered,
          "of",
          recipients.length,
          "recipients;",
          "retry with the same sendId to skip what already sent —",
          error,
        );
        return { status: "error", reason: "send-failed" };
      }

      delivered += batch.length;
      const isLast = index === batches.length - 1;
      if (!isLast) await sleep(dials.announcementBatchPauseMs);
    }

    console.info(
      "[ANNOUNCEMENT] sent",
      delivered,
      "in",
      batches.length,
      "batches",
    );
    return { status: "success", recipients: delivered, batches: batches.length };
  } catch (error) {
    console.error("[ANNOUNCEMENT]", error);
    return { status: "error", reason: "server-error" };
  }
}

// Consent is checked here, not at compose time: someone who opted out an hour
// ago must not be in this list, and email_consent false never gets mail at all.
async function getRecipients(): Promise<Recipient[]> {
  const supabase = createAdminClient();
  const recipients: Recipient[] = [];

  for (let page = 0; ; page += 1) {
    const from = page * RECIPIENT_PAGE_SIZE;
    const { data, error } = await supabase
      .from("subscribers")
      .select("id, email")
      .is("unsubscribed_at", null)
      .eq("email_consent", true)
      .order("created_at", { ascending: true })
      .range(from, from + RECIPIENT_PAGE_SIZE - 1);

    if (error) throw new Error(`${error.code}: ${error.message}`);

    const rows = (data ?? []) as Recipient[];
    recipients.push(...rows);
    if (rows.length < RECIPIENT_PAGE_SIZE) return recipients;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
