"use client";

import { useState } from "react";

import type { AdminOrder } from "../../lib/orders";
import {
  deliveryLabel,
  isAwaitingHandover,
  statusLabel,
} from "../../lib/order-status";
import { formatUsd } from "@/lib/money";

import { OrderStatusControls } from "../order-status-controls/order-status-controls";

/**
 * List row and detail in one card rather than a separate /admin/orders/[id]
 * route. The founder works this queue on a phone while packing; an accordion
 * keeps him in the list instead of costing a navigation and a back tap per
 * order, and every field the detail view would show is here.
 */
export function OrderCard({ order }: { order: AdminOrder }) {
  const [open, setOpen] = useState(false);
  const awaiting = isAwaitingHandover(order.status);

  return (
    <li className="flex flex-col border-2 border-current">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="flex items-start justify-between gap-3 p-4 text-left"
      >
        <span className="flex flex-col gap-1">
          <span className="font-display text-xl leading-none">
            {order.customerName?.toUpperCase() ?? "NO NAME"}
          </span>
          <span className="font-body text-[10px] tracking-widest opacity-70">
            {order.createdAt.slice(0, 10)} &middot;{" "}
            {deliveryLabel[order.deliveryMethod]} &middot;{" "}
            {order.amountTotalCents === null
              ? "—"
              : formatUsd(order.amountTotalCents)}
          </span>
        </span>
        <span
          className={`shrink-0 border-2 border-current px-2 py-1 font-body text-[10px] tracking-widest ${
            awaiting ? "bg-brand-red text-cream" : ""
          }`}
        >
          {statusLabel[order.status]}
        </span>
      </button>

      {open ? (
        <div className="flex flex-col gap-5 border-t-2 border-current p-4">
          <div className="flex flex-col gap-2">
            <p className="font-display text-lg leading-none">WHAT THEY BOUGHT</p>
            {order.items.length === 0 ? (
              <p className="font-body text-[10px] tracking-widest opacity-70">
                NO LINES ON THIS ORDER
              </p>
            ) : (
              <ul className="flex flex-col gap-1">
                {order.items.map((item) => (
                  <li
                    key={item.id}
                    className="flex justify-between gap-3 font-body text-sm"
                  >
                    <span>
                      {item.quantity} &times; {item.productName} ({item.size})
                    </span>
                    <span>{formatUsd(item.unitPriceCents * item.quantity)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <p className="font-display text-lg leading-none">WHO</p>
            <dl className="flex flex-col gap-1 font-body text-sm">
              <Field label="EMAIL" value={order.customerEmail} />
              <Field label="PHONE" value={order.customerPhone} />
            </dl>
          </div>

          {order.deliveryMethod === "shipping" ? (
            <div className="flex flex-col gap-2">
              <p className="font-display text-lg leading-none">SHIP TO</p>
              {order.shippingAddress ? (
                <address className="font-body text-sm not-italic">
                  {[
                    order.shippingAddress.line1,
                    order.shippingAddress.line2,
                    [
                      order.shippingAddress.city,
                      order.shippingAddress.state,
                      order.shippingAddress.postalCode,
                    ]
                      .filter(Boolean)
                      .join(" "),
                    order.shippingAddress.country,
                  ]
                    .filter(Boolean)
                    .map((line) => (
                      <span key={line} className="block">
                        {line}
                      </span>
                    ))}
                </address>
              ) : (
                <p
                  role="alert"
                  className="font-body text-xs tracking-widest underline"
                >
                  NO ADDRESS ON THIS ORDER. EMAIL THEM BEFORE YOU POST IT
                </p>
              )}
            </div>
          ) : (
            <p className="font-body text-xs tracking-widest opacity-70">
              CAMPUS PICKUP -- NOTHING TO POST
            </p>
          )}

          <OrderStatusControls
            orderId={order.id}
            status={order.status}
            deliveryMethod={order.deliveryMethod}
          />

          <p className="font-body text-[10px] tracking-widest break-all opacity-50">
            {order.id}
            {order.stripePaymentIntentId
              ? ` · ${order.stripePaymentIntentId}`
              : ""}
          </p>
        </div>
      ) : null}
    </li>
  );
}

function Field({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-[10px] tracking-widest opacity-70">{label}</dt>
      <dd className="break-all">{value ?? "—"}</dd>
    </div>
  );
}
