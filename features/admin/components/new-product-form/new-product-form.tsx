"use client";

import { useState, useTransition } from "react";

import { addProduct } from "@/actions/admin-products";

import { catalogFailureText } from "../product-editor/product-editor";

const fieldClasses =
  "w-full border-2 border-current bg-transparent px-3 py-3 font-body text-base outline-none";
const labelClasses = "flex flex-col gap-1 font-body text-[10px] tracking-widest";

type Feedback = { tone: "ok" | "bad"; text: string } | null;

export function NewProductForm() {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<Feedback>(null);

  const [slug, setSlug] = useState("");
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");

  function submit() {
    setFeedback(null);
    startTransition(async () => {
      const result = await addProduct(slug, {
        name,
        price,
        description: "",
        modelCredits: "",
        // New products start hidden. A half-built product appearing on the
        // storefront the instant it is named is how the founder learns to be
        // afraid of this form.
        active: false,
        sortOrder: 0,
      });

      if (result.status === "success") {
        setFeedback({ tone: "ok", text: "ADDED, HIDDEN UNTIL YOU SHOW IT" });
        setSlug("");
        setName("");
        setPrice("");
        return;
      }
      setFeedback({ tone: "bad", text: catalogFailureText[result.reason] });
    });
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="border-2 border-current px-4 py-3 font-display text-xl tracking-wide transition-colors hover:bg-brand-red hover:text-cream"
      >
        NEW PRODUCT
      </button>
    );
  }

  return (
    <section className="flex flex-col gap-4 border-2 border-current p-4">
      <p className="font-display text-2xl leading-none">NEW PRODUCT</p>

      <label className={labelClasses}>
        NAME
        <input
          className={fieldClasses}
          value={name}
          onChange={(event) => {
            setName(event.target.value);
            // Suggest the handle while it is untouched; stop once he edits it.
            setSlug((current) =>
              current === "" || current === slugify(name)
                ? slugify(event.target.value)
                : current,
            );
          }}
        />
      </label>

      <label className={labelClasses}>
        HANDLE (THE WEB ADDRESS)
        <input
          className={fieldClasses}
          value={slug}
          onChange={(event) => setSlug(event.target.value)}
          placeholder="star-shorts"
        />
        <span className="opacity-70">
          THIS CAN&apos;T BE CHANGED LATER. IT&apos;S THE LINK PEOPLE SHARE
        </span>
      </label>

      <label className={labelClasses}>
        PRICE
        <input
          className={fieldClasses}
          inputMode="decimal"
          value={price}
          onChange={(event) => setPrice(event.target.value)}
          placeholder="20"
        />
      </label>

      <div className="flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          disabled={pending || !slug.trim() || !name.trim() || !price.trim()}
          onClick={submit}
          className="border-2 border-current px-4 py-3 font-display text-xl tracking-wide transition-opacity hover:opacity-70 disabled:opacity-40"
        >
          ADD
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="border-2 border-current px-4 py-3 font-display text-xl tracking-wide transition-opacity hover:opacity-70"
        >
          CANCEL
        </button>
      </div>

      {pending ? (
        <p className="font-body text-xs tracking-widest">SAVING...</p>
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
    </section>
  );
}

/** Mirrors the server's slug rule so the suggestion is never rejected. */
function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
