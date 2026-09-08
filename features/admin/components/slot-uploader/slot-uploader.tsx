"use client";

import Image from "next/image";
import { useRef, useState, useTransition } from "react";

import {
  clearSlotImage,
  uploadSlotImage,
  type SlotClearFailure,
  type SlotUploadFailure,
} from "@/actions/admin-image-slots";
import type { SlotDefinition } from "../../lib/slot-keys";

const failureText: Record<SlotUploadFailure, string> = {
  "not-authorized": "YOUR SESSION EXPIRED. SIGN IN AGAIN",
  "invalid-input": "THAT UPLOAD DIDN'T LOOK RIGHT",
  "unknown-slot": "THAT SLOT ISN'T ONE THE SITE USES",
  "no-file": "PICK A PICTURE FIRST",
  "too-large": "THAT FILE IS TOO BIG. TRY A PHOTO, NOT A VIDEO",
  "not-an-image": "THAT FILE ISN'T A PICTURE THE SITE CAN READ",
  "server-error": "THE UPLOAD DIDN'T STICK. TRY AGAIN",
};

const clearFailureText: Record<SlotClearFailure, string> = {
  "not-authorized": "YOUR SESSION EXPIRED. SIGN IN AGAIN",
  "invalid-input": "THAT DIDN'T LOOK RIGHT",
  "unknown-slot": "THAT SLOT ISN'T ONE THE SITE USES",
  "not-set": "THAT SLOT IS ALREADY EMPTY",
  "server-error": "THE CLEAR DIDN'T STICK. TRY AGAIN",
};

type SlotUploaderProps = {
  slot: SlotDefinition;
  currentUrl: string | null;
  currentAlt: string | null;
  updatedAt: string | null;
};

type Feedback = { tone: "ok" | "bad"; text: string } | null;

export function SlotUploader({
  slot,
  currentUrl,
  currentAlt,
  updatedAt,
}: SlotUploaderProps) {
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [alt, setAlt] = useState(currentAlt ?? "");
  const [fileName, setFileName] = useState<string | null>(null);
  // The freshly uploaded URL, shown straight away. The server component behind
  // this will re-render with the same value once revalidation lands, but the
  // founder should not have to wait on a round trip to see his own picture.
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);
  // Set the moment a clear succeeds, for the same reason as uploadedUrl: the
  // props still carry the picture until revalidation lands, and leaving it on
  // screen reads as the clear having done nothing.
  const [cleared, setCleared] = useState(false);
  const [armedToClear, setArmedToClear] = useState(false);
  // One transition serves both buttons, so the label needs to know which job
  // is in flight -- otherwise clearing reads as "UPLOADING...".
  const [job, setJob] = useState<"upload" | "clear" | null>(null);
  const fileInput = useRef<HTMLInputElement | null>(null);

  const preview = uploadedUrl ?? (cleared ? null : currentUrl);

  function submit() {
    const file = fileInput.current?.files?.[0];
    if (!file) {
      setFeedback({ tone: "bad", text: failureText["no-file"] });
      return;
    }

    const formData = new FormData();
    formData.set("slotKey", slot.key);
    formData.set("alt", alt);
    formData.set("file", file);

    setFeedback(null);
    setJob("upload");
    startTransition(async () => {
      const result = await uploadSlotImage(formData);
      if (result.status === "success") {
        setUploadedUrl(result.url);
        setCleared(false);
        setFileName(null);
        if (fileInput.current) fileInput.current.value = "";
        setFeedback({ tone: "ok", text: "SWAPPED. IT'S LIVE" });
        return;
      }
      setFeedback({ tone: "bad", text: failureText[result.reason] });
    });
  }

  function clear() {
    setFeedback(null);
    setJob("clear");
    startTransition(async () => {
      const result = await clearSlotImage(slot.key);
      if (result.status === "success") {
        setCleared(true);
        setUploadedUrl(null);
        // The description went with the row, so the field should not keep
        // offering words that no longer describe anything.
        setAlt("");
        setFeedback({ tone: "ok", text: "CLEARED. IT'S OFF THE SITE" });
        return;
      }
      setFeedback({ tone: "bad", text: clearFailureText[result.reason] });
    });
  }

  return (
    <li className="flex flex-col gap-4 border-2 border-current p-4">
      <div className="flex flex-col gap-1">
        <p className="font-display text-xl leading-none">{slot.label}</p>
        <p className="font-body text-[10px] tracking-widest opacity-70">
          {slot.hint}
        </p>
      </div>

      {preview ? (
        <div className="relative aspect-4/3 w-full border-2 border-current">
          <Image
            key={preview}
            src={preview}
            alt={currentAlt ?? slot.label}
            fill
            sizes="(min-width: 640px) 50vw, 100vw"
            className="object-cover"
          />
        </div>
      ) : (
        <div className="flex aspect-4/3 w-full items-center justify-center border-2 border-dashed border-current">
          <p className="font-body text-[10px] tracking-widest opacity-70">
            NOTHING HERE YET
          </p>
        </div>
      )}

      {updatedAt && !uploadedUrl && !cleared ? (
        <p className="font-body text-[10px] tracking-widest opacity-70">
          LAST CHANGED {updatedAt.slice(0, 10)}
        </p>
      ) : null}

      <label className="flex flex-col gap-1 font-body text-[10px] tracking-widest">
        DESCRIPTION FOR SCREEN READERS
        <input
          className="w-full border-2 border-current bg-transparent px-3 py-3 font-body text-base outline-none"
          value={alt}
          onChange={(event) => setAlt(event.target.value)}
        />
      </label>

      {/* The real input is hidden and driven by the label: a bare file input
          renders as an unstyleable OS control that fights the rest of the page. */}
      <label className="cursor-pointer border-2 border-current px-4 py-3 text-center font-display text-lg tracking-wide transition-colors hover:bg-brand-red hover:text-cream">
        {fileName ? fileName.toUpperCase() : "CHOOSE A PICTURE"}
        <input
          ref={fileInput}
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={(event) =>
            setFileName(event.target.files?.[0]?.name ?? null)
          }
        />
      </label>

      <button
        type="button"
        disabled={pending}
        onClick={submit}
        className="border-2 border-current px-4 py-3 font-display text-xl tracking-wide transition-opacity hover:opacity-70 disabled:opacity-40"
      >
        {pending && job === "upload" ? "UPLOADING..." : "REPLACE"}
      </button>

      {/* Only offered while something is actually registered -- the founder
          should never be looking at a control that would tell him the slot is
          already empty. */}
      {preview ? (
        <div className="flex flex-col gap-2 border-t-2 border-current pt-4">
          <button
            type="button"
            disabled={pending}
            onClick={() => {
              // Two taps to clear, same as deleting a product: this is the one
              // control here that takes a picture off the live site.
              if (!armedToClear) {
                setArmedToClear(true);
                return;
              }
              setArmedToClear(false);
              clear();
            }}
            className="border-2 border-current px-4 py-3 font-display text-xl tracking-wide transition-opacity hover:opacity-70 disabled:opacity-40"
          >
            {pending && job === "clear"
              ? "CLEARING..."
              : armedToClear
                ? "TAP AGAIN TO CLEAR"
                : "CLEAR THIS PICTURE"}
          </button>
          {armedToClear ? (
            <>
              <p className="font-body text-[10px] tracking-widest opacity-70">
                THE SITE STOPS USING THIS PICTURE. YOU CAN PUT A NEW ONE IN ANY
                TIME
              </p>
              <button
                type="button"
                className="font-body text-xs tracking-widest underline"
                onClick={() => setArmedToClear(false)}
              >
                CANCEL
              </button>
            </>
          ) : null}
        </div>
      ) : null}

      {feedback && !pending ? (
        <p
          role="status"
          className={`font-body text-xs font-bold tracking-widest ${
            feedback.tone === "ok" ? "" : "underline"
          }`}
        >
          {feedback.text}
        </p>
      ) : null}
    </li>
  );
}
