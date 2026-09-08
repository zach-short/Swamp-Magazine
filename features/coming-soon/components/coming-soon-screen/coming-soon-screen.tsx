import Image from "next/image";

import { getSiteSettings } from "@/lib/site-mode.server";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

import { DropCountdown } from "../drop-countdown/drop-countdown";
import { SubscribeForm } from "../subscribe-form/subscribe-form";

// Founder uploads a hero shot into this slot via the admin (P4); until then
// the page runs type-only on cream, per the mockup's red-vermillion language.
const BG_SLOT_KEY = "coming_soon_bg";

type BackgroundSlot = { url: string; alt: string };

export async function ComingSoonScreen() {
  // getSiteSettings is memoised per request, so this shares the read the mode
  // gate in "/" already made. drop_at is null in the common case and the
  // countdown block then renders nothing at all -- no reserved space, no shift.
  const [background, { dropAt }] = await Promise.all([
    getBackgroundSlot(),
    getSiteSettings(),
  ]);

  return (
    <main
      className={cn(
        "relative flex min-h-dvh flex-col overflow-hidden text-brand-red",
        background ? "bg-ink" : "bg-cream",
      )}
    >
      {background ? (
        <Image
          src={background.url}
          alt={background.alt}
          fill
          priority
          sizes="100vw"
          className="object-cover opacity-80"
        />
      ) : null}

      <div className="relative flex grow flex-col items-center justify-center gap-10 px-6 py-16 text-center">
        <header className="flex flex-col gap-2">
          <p className="font-body text-xs tracking-[0.35em] sm:text-sm">
            FROM LALO FARRO
          </p>
          <h1 className="font-display text-[clamp(3rem,13vw,9rem)] leading-[0.95]">
            SWAMP MAGAZINE
          </h1>
          <p className="font-body text-sm tracking-[0.35em]">THE THIRD ISSUE</p>
        </header>

        {dropAt ? <DropCountdown targetIso={dropAt.toISOString()} /> : null}

        <SubscribeForm />
      </div>

      <Ticker />
    </main>
  );
}

function Ticker() {
  const line = "SWAMP MAGAZINE * THE THIRD ISSUE * COMING SOON * ";
  const half = line.repeat(4);

  return (
    <div className="relative overflow-hidden border-t-2 border-current py-2">
      <div className="animate-marquee flex w-max whitespace-nowrap font-display text-lg sm:text-xl">
        <span>{half}</span>
        <span aria-hidden>{half}</span>
      </div>
    </div>
  );
}

async function getBackgroundSlot(): Promise<BackgroundSlot | null> {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("image_slots")
      .select("bucket, storage_path, alt")
      .eq("slot_key", BG_SLOT_KEY)
      .maybeSingle();
    if (!data) return null;

    const { data: publicUrl } = supabase.storage
      .from(data.bucket)
      .getPublicUrl(data.storage_path);
    return { url: publicUrl.publicUrl, alt: data.alt ?? "" };
  } catch (error) {
    console.error("[COMING_SOON_BG]", error);
    return null;
  }
}
