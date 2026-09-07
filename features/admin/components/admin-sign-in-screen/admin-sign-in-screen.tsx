import type { AdminDenial } from "../../lib/admin-allowlist";
import { AdminSignInForm } from "../admin-sign-in-form/admin-sign-in-form";

type AdminSignInScreenProps = { denied?: string };

// Everything the sign-in page can be told about why it is being shown. Two of
// these are authorization denials; `sign-in-failed` is the round trip itself
// not completing, which is not an AdminDenial because nobody was identified.
type SignInNotice = Exclude<AdminDenial, "signed-out"> | "sign-in-failed";

// Denial copy. A rejected admin is told what happened and left signed out --
// never a silent 404, which would look like a broken deploy to the founder.
const noticeMessages: Record<SignInNotice, string> = {
  "not-allowed":
    "THAT GOOGLE ACCOUNT ISN'T ON THE ADMIN LIST. YOU'VE BEEN SIGNED OUT.",
  "no-allowlist":
    "NO ADMIN LIST IS CONFIGURED, SO NOBODY GETS IN. TELL ZACH TO SET ADMIN_EMAILS.",
  "sign-in-failed": "GOOGLE SIGN-IN DIDN'T FINISH. TRY AGAIN.",
};

export function AdminSignInScreen({ denied }: AdminSignInScreenProps) {
  const notice = toNotice(denied);

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-8 bg-cream px-4 py-16 text-brand-red">
      <header className="flex flex-col items-center gap-1 text-center">
        <p className="font-body text-[10px] tracking-[0.35em]">SWAMP MAGAZINE</p>
        <h1 className="font-display text-[clamp(2.5rem,12vw,5rem)] leading-[0.95]">
          ADMIN
        </h1>
      </header>

      {notice ? (
        <p
          role="alert"
          className="w-full max-w-md border-2 border-current bg-brand-red px-4 py-3 text-center font-body text-xs leading-relaxed font-bold tracking-widest text-cream"
        >
          {noticeMessages[notice]}
        </p>
      ) : null}

      <AdminSignInForm />
    </main>
  );
}

// The reason travels in a query string, so it is narrowed against the known
// set -- an arbitrary value renders no banner rather than reflecting itself
// back onto the page.
function toNotice(value: string | undefined): SignInNotice | null {
  if (
    value === "not-allowed" ||
    value === "no-allowlist" ||
    value === "sign-in-failed"
  ) {
    return value;
  }
  return null;
}
