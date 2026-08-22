import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";

import { adminRoutes, resolveAdminAccess } from "@/features/admin";
import { createClient } from "@/lib/supabase/server";

// Where the magic link lands. Two shapes are accepted so the flow survives
// either email template:
//   ?code=...                 PKCE, what the default template produces. Needs
//                             the verifier cookie, so it must be opened in the
//                             browser that asked for the link.
//   ?token_hash=...&type=...  the {{ .TokenHash }} template, which works
//                             cross-device.
// Cookies are writable in a route handler, which is why the session is
// established here rather than in a Server Component.

const EMAIL_OTP_TYPES = [
  "magiclink",
  "email",
  "signup",
  "invite",
  "recovery",
  "email_change",
] as const;

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const supabase = await createClient();

  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const otpType = toEmailOtpType(searchParams.get("type"));

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      console.error("[ADMIN_CALLBACK] code exchange:", error.message);
      return toSignIn(origin, "link-expired");
    }
  } else if (tokenHash && otpType) {
    const { error } = await supabase.auth.verifyOtp({
      type: otpType,
      token_hash: tokenHash,
    });
    if (error) {
      console.error("[ADMIN_CALLBACK] verifyOtp:", error.message);
      return toSignIn(origin, "link-expired");
    }
  } else {
    console.error("[ADMIN_CALLBACK] callback hit with no code or token_hash");
    return toSignIn(origin, "bad-link");
  }

  // The sign-in action only mails allowlisted addresses, but a link minted
  // elsewhere (a dashboard invite, a recovery mail) could still land here.
  // Refuse to leave that session standing.
  const access = await resolveAdminAccess();
  if (access.status !== "ok") {
    console.error("[ADMIN_CALLBACK] session denied:", access.reason);
    return NextResponse.redirect(
      new URL(`${adminRoutes.signOut}?denied=${access.reason}`, origin),
    );
  }

  return NextResponse.redirect(new URL(adminRoutes.dashboard, origin));
}

function toSignIn(origin: string, reason: string) {
  const url = new URL(adminRoutes.signIn, origin);
  url.searchParams.set("denied", reason);
  return NextResponse.redirect(url);
}

function toEmailOtpType(value: string | null): EmailOtpType | null {
  const match = EMAIL_OTP_TYPES.find((type) => type === value);
  return match ?? null;
}
