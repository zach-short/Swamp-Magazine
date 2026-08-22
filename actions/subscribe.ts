"use server";

import { Resend } from "resend";

import { SubscribeConfirmationEmail } from "@/emails/subscribe-confirmation";
import { subscribeSchema } from "@/features/coming-soon/lib/subscribe-schema";
import { serverEnv } from "@/lib/env/server";
import { createAdminClient } from "@/lib/supabase/admin";

export type SubscribeFailure = "invalid-email" | "invalid-phone" | "server-error";

export type SubscribeState =
  | { status: "idle" }
  | { status: "success" }
  | { status: "error"; reason: SubscribeFailure };

const DUPLICATE_KEY_VIOLATION = "23505";

export async function subscribeToDrop(
  _previous: SubscribeState,
  formData: FormData,
): Promise<SubscribeState> {
  const parsed = subscribeSchema.safeParse({
    email: formData.get("email"),
    phone: formData.get("phone"),
  });
  if (!parsed.success) {
    const field = parsed.error.issues[0]?.path[0];
    return {
      status: "error",
      reason: field === "phone" ? "invalid-phone" : "invalid-email",
    };
  }

  const { email, phone } = parsed.data;

  try {
    const supabase = createAdminClient();
    const { error } = await supabase.from("subscribers").insert({
      email,
      phone: phone ?? null,
      email_consent: true,
      // Leaving a number under the form's disclosure line is the SMS opt-in
      // (D4); sends still wait for A2P registration.
      sms_consent: phone != null,
    });

    if (error) {
      // Re-signup reads as success to the visitor; no second confirmation
      // email, so the endpoint can't be used to spam an inbox.
      if (error.code === DUPLICATE_KEY_VIOLATION) {
        return { status: "success" };
      }
      console.error("[SUBSCRIBE]", error.code, error.message);
      return { status: "error", reason: "server-error" };
    }

    // The row is what matters; a failed confirmation email logs loudly but
    // does not undo the signup.
    await sendConfirmationEmail(email);
    return { status: "success" };
  } catch (error) {
    console.error("[SUBSCRIBE]", error);
    return { status: "error", reason: "server-error" };
  }
}

async function sendConfirmationEmail(email: string) {
  try {
    const resend = new Resend(serverEnv.resendApiKey);
    const { error } = await resend.emails.send({
      from: serverEnv.resendFrom,
      to: email,
      subject: "SWAMP MAGAZINE: FINGER ON THE PULSE",
      react: SubscribeConfirmationEmail(),
    });
    if (error) {
      console.error("[SUBSCRIBE_EMAIL]", error);
    }
  } catch (error) {
    console.error("[SUBSCRIBE_EMAIL]", error);
  }
}
