"use client";

import { useState, useTransition } from "react";

import {
  addVariant,
  removeProduct,
  removeVariant,
  saveProduct,
  saveVariant,
  type AdminCatalogFailure,
  type AdminCatalogResult,
} from "@/actions/admin-products";
import type { AdminProduct, AdminVariant } from "../../lib/products";
import { formatUsd } from "@/lib/money";

export const catalogFailureText: Record<AdminCatalogFailure, string> = {
  "not-authorized": "YOUR SESSION EXPIRED. SIGN IN AGAIN",
  "invalid-input": "SOMETHING IN THAT FORM DIDN'T LOOK RIGHT",
  "invalid-price": "PRICE HAS TO BE A NUMBER LIKE 20 OR 22.50",
  "duplicate-slug": "THAT HANDLE IS ALREADY TAKEN",
  "duplicate-size": "THAT SIZE IS ALREADY ON THIS ONE",
  "server-error": "THE SAVE DIDN'T STICK. TRY AGAIN",
};

const fieldClasses =
  "w-full border-2 border-current bg-transparent px-3 py-3 font-body text-base outline-none";
const labelClasses = "flex flex-col gap-1 font-body text-[10px] tracking-widest";
const buttonClasses =
  "border-2 border-current px-4 py-3 font-display text-lg tracking-wide transition-opacity hover:opacity-70 disabled:opacity-40";

type Feedback = { tone: "ok" | "bad"; text: string } | null;

export function ProductEditor({ product }: { product: AdminProduct }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [armedToDelete, setArmedToDelete] = useState(false);

  // Uncontrolled-with-key: the fields seed from the server row, and bumping the
  // key after a save re-seeds them from the revalidated data rather than
  // leaving React state as a second, quietly diverging copy of the product.
  const [name, setName] = useState(product.name);
  const [price, setPrice] = useState(centsToField(product.priceCents));
  const [description, setDescription] = useState(product.description ?? "");
  const [modelCredits, setModelCredits] = useState(product.modelCredits ?? "");
  const [active, setActive] = useState(product.active);
  const [sortOrder, setSortOrder] = useState(String(product.sortOrder));

  function run(action: () => Promise<AdminCatalogResult>, okText: string) {
    setFeedback(null);
    startTransition(async () => {
      const result = await action();
      setFeedback(
        result.status === "success"
          ? { tone: "ok", text: okText }
          : { tone: "bad", text: catalogFailureText[result.reason] },
      );
    });
  }

  const stock = product.variants.reduce(
    (total, variant) => total + variant.inventoryCount,
    0,
  );

  return (
    <li className="flex flex-col border-2 border-current">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="flex items-start justify-between gap-3 p-4 text-left"
      >
        <span className="flex flex-col gap-1">
          <span className="font-display text-2xl leading-none">
            {product.name.toUpperCase()}
          </span>
          <span className="font-body text-[10px] tracking-widest opacity-70">
            {product.slug} &middot; {formatUsd(product.priceCents)} &middot;{" "}
            {stock} IN STOCK
            {product.active ? "" : " · HIDDEN"}
          </span>
        </span>
        <span className="font-display text-2xl leading-none">
          {open ? "−" : "+"}
        </span>
      </button>

      {open ? (
        <div className="flex flex-col gap-5 border-t-2 border-current p-4">
          <label className={labelClasses}>
            NAME
            <input
              className={fieldClasses}
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </label>

          <label className={labelClasses}>
            PRICE
            <input
              className={fieldClasses}
              inputMode="decimal"
              value={price}
              onChange={(event) => setPrice(event.target.value)}
            />
          </label>

          <label className={labelClasses}>
            DESCRIPTION
            <textarea
              className={`${fieldClasses} min-h-24`}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
          </label>

          <label className={labelClasses}>
            MODEL CREDITS
            <input
              className={fieldClasses}
              value={modelCredits}
              onChange={(event) => setModelCredits(event.target.value)}
            />
          </label>

          <label className={labelClasses}>
            ORDER ON THE PAGE
            <input
              className={fieldClasses}
              inputMode="numeric"
              value={sortOrder}
              onChange={(event) => setSortOrder(event.target.value)}
            />
          </label>

          <label className="flex items-center gap-3 font-body text-xs tracking-widest">
            <input
              type="checkbox"
              checked={active}
              onChange={(event) => setActive(event.target.checked)}
              className="size-5 accent-brand-red"
            />
            SHOW THIS ON THE STORE
          </label>

          <button
            type="button"
            disabled={pending}
            className={buttonClasses}
            onClick={() =>
              run(
                () =>
                  saveProduct(product.id, {
                    name,
                    price,
                    description,
                    modelCredits,
                    active,
                    sortOrder: Number(sortOrder) || 0,
                  }),
                "SAVED",
              )
            }
          >
            SAVE
          </button>

          <VariantList
            product={product}
            pending={pending}
            onRun={run}
          />

          <div className="flex flex-col gap-2 border-t-2 border-current pt-5">
            <button
              type="button"
              disabled={pending}
              className={buttonClasses}
              onClick={() => {
                // Two taps to delete a product, same as taking the site down.
                if (!armedToDelete) {
                  setArmedToDelete(true);
                  return;
                }
                setArmedToDelete(false);
                run(() => removeProduct(product.id), "DELETED");
              }}
            >
              {armedToDelete ? "TAP AGAIN TO DELETE" : "DELETE THIS PRODUCT"}
            </button>
            {armedToDelete ? (
              <>
                <p className="font-body text-[10px] tracking-widest opacity-70">
                  PAST ORDERS KEEP THEIR COPY OF THE NAME AND PRICE. THE SIZES
                  GO WITH IT
                </p>
                <button
                  type="button"
                  className="font-body text-xs tracking-widest underline"
                  onClick={() => setArmedToDelete(false)}
                >
                  CANCEL
                </button>
              </>
            ) : null}
          </div>

          <Feedback pending={pending} feedback={feedback} />
        </div>
      ) : null}
    </li>
  );
}

type RunFn = (
  action: () => Promise<AdminCatalogResult>,
  okText: string,
) => void;

function VariantList({
  product,
  pending,
  onRun,
}: {
  product: AdminProduct;
  pending: boolean;
  onRun: RunFn;
}) {
  const [newSize, setNewSize] = useState("");
  const [newStock, setNewStock] = useState("0");

  return (
    <div className="flex flex-col gap-3 border-t-2 border-current pt-5">
      <p className="font-display text-xl leading-none">SIZES &amp; STOCK</p>

      {product.variants.length === 0 ? (
        <p className="font-body text-[10px] tracking-widest opacity-70">
          NO SIZES YET. NOBODY CAN ORDER THIS UNTIL ONE EXISTS
        </p>
      ) : null}

      {product.variants.map((variant) => (
        <VariantRow
          key={variant.id}
          variant={variant}
          pending={pending}
          onRun={onRun}
        />
      ))}

      <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <label className={`${labelClasses} sm:flex-1`}>
          NEW SIZE
          <input
            className={fieldClasses}
            value={newSize}
            onChange={(event) => setNewSize(event.target.value)}
            placeholder="M"
          />
        </label>
        <label className={`${labelClasses} sm:w-28`}>
          STOCK
          <input
            className={fieldClasses}
            inputMode="numeric"
            value={newStock}
            onChange={(event) => setNewStock(event.target.value)}
          />
        </label>
        <button
          type="button"
          disabled={pending || !newSize.trim()}
          className={buttonClasses}
          onClick={() => {
            onRun(
              () =>
                addVariant(product.id, {
                  size: newSize,
                  inventoryCount: Number(newStock) || 0,
                  sortOrder: product.variants.length,
                }),
              "SIZE ADDED",
            );
            setNewSize("");
            setNewStock("0");
          }}
        >
          ADD
        </button>
      </div>
    </div>
  );
}

function VariantRow({
  variant,
  pending,
  onRun,
}: {
  variant: AdminVariant;
  pending: boolean;
  onRun: RunFn;
}) {
  const [size, setSize] = useState(variant.size);
  const [stock, setStock] = useState(String(variant.inventoryCount));

  const dirty =
    size !== variant.size || stock !== String(variant.inventoryCount);

  return (
    <div className="flex items-end gap-2">
      <label className={`${labelClasses} flex-1`}>
        SIZE
        <input
          className={fieldClasses}
          value={size}
          onChange={(event) => setSize(event.target.value)}
        />
      </label>
      <label className={`${labelClasses} w-24`}>
        STOCK
        <input
          className={fieldClasses}
          inputMode="numeric"
          value={stock}
          onChange={(event) => setStock(event.target.value)}
        />
      </label>
      <button
        type="button"
        disabled={pending || !dirty}
        className={buttonClasses}
        onClick={() =>
          onRun(
            () =>
              saveVariant(variant.id, {
                size,
                inventoryCount: Number(stock) || 0,
                sortOrder: variant.sortOrder,
              }),
            `${size.toUpperCase()} SAVED`,
          )
        }
      >
        SAVE
      </button>
      <button
        type="button"
        disabled={pending}
        aria-label={`Remove size ${variant.size}`}
        className={buttonClasses}
        onClick={() => onRun(() => removeVariant(variant.id), "SIZE REMOVED")}
      >
        &times;
      </button>
    </div>
  );
}

export function Feedback({
  pending,
  feedback,
}: {
  pending: boolean;
  feedback: Feedback;
}) {
  if (pending) {
    return <p className="font-body text-xs tracking-widest">SAVING...</p>;
  }
  if (!feedback) return null;
  return (
    <p
      role="status"
      className={`font-body text-xs font-bold tracking-widest ${
        feedback.tone === "ok" ? "" : "underline"
      }`}
    >
      {feedback.text}
    </p>
  );
}

/** Cents -> the price field's text, without inventing trailing zeros. */
function centsToField(cents: number): string {
  return cents % 100 === 0 ? String(cents / 100) : (cents / 100).toFixed(2);
}
