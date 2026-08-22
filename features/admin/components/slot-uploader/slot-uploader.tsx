"use client";

import Image from "next/image";
import { useRef, useState, useTransition } from "react";

import {
  uploadSlotImage,
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
  const fileInput = useRef<HTMLInputElement | null>(null);

  const preview = uploadedUrl ?? currentUrl;

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
    startTransition(async () => {
      const result = await uploadSlotImage(formData);
      if (result.status === "success") {
        setUploadedUrl(result.url);
        setFileName(null);
        if (fileInput.current) fileInput.current.value = "";
        setFeedback({ tone: "ok", text: "SWAPPED. IT'S LIVE" });
        return;
      }
      setFeedback({ tone: "bad", text: failureText[result.reason] });
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

      {updatedAt && !uploadedUrl ? (
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
        {pending ? "UPLOADING..." : "REPLACE"}
      </button>

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
