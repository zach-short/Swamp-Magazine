"use server";

import { z } from "zod";

import { createAdminClient } from "@/lib/supabase/admin";

export type UnsubscribeFailure = "invalid-token" | "server-error";

export type UnsubscribeState =
  | { status: "idle" }
  | { status: "success" }
  | { status: "error"; reason: UnsubscribeFailure };

// The token is the subscriber's own id, straight out of the mail link. It is
// unguessable enough for an opt-out and carries no auth wall -- CAN-SPAM wants
// one click, not a login.
const tokenSchema = z.uuid();

export async function unsubscribeFromEmails(
  _previous: UnsubscribeState,
  formData: FormData,
): Promise<UnsubscribeState> {
  const parsed = tokenSchema.safeParse(formData.get("token"));
  // A malformed token identifies nobody, so saying so confirms nothing about
  // who is or isn't on the list.
  if (!parsed.success) return { status: "error", reason: "invalid-token" };

  try {
    const supabase = createAdminClient();
    // Idempotent twice over: the null guard keeps the first opt-out timestamp
    // if the link is clicked again, and a well-formed id matching no row still
    // answers "success" so the endpoint can't be used to enumerate subscribers.
    const { error } = await supabase
      .from("subscribers")
      .update({ unsubscribed_at: new Date().toISOString() })
      .eq("id", parsed.data)
      .is("unsubscribed_at", null);

    if (error) {
      console.error("[UNSUBSCRIBE]", error.code, error.message);
      return { status: "error", reason: "server-error" };
    }

    return { status: "success" };
  } catch (error) {
    console.error("[UNSUBSCRIBE]", error);
    return { status: "error", reason: "server-error" };
  }
}
