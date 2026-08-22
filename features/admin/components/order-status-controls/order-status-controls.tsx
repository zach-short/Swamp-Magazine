"use client";

import { useState, useTransition } from "react";

import {
  setOrderStatus,
  type OrderStatusFailure,
} from "@/actions/admin-orders";
import {
  allowedTransitions,
  statusActionLabel,
  type DeliveryMethod,
  type OrderStatus,
} from "../../lib/order-status";

const failureText: Record<OrderStatusFailure, string> = {
  "not-authorized": "YOUR SESSION EXPIRED. SIGN IN AGAIN",
  "invalid-input": "THAT DIDN'T LOOK RIGHT",
  "not-found": "THAT ORDER ISN'T THERE ANY MORE",
  "not-allowed": "THAT ISN'T A MOVE THIS ORDER CAN MAKE",
  // The one the founder will actually hit: the webhook moved it while his
  // phone was showing the old list.
  stale: "THIS ORDER CHANGED WHILE YOU WERE LOOKING. PULL TO REFRESH",
  "server-error": "THAT DIDN'T STICK. TRY AGAIN",
};

type OrderStatusControlsProps = {
  orderId: string;
  status: OrderStatus;
  deliveryMethod: DeliveryMethod;
};

type Feedback = { tone: "ok" | "bad"; text: string } | null;

export function OrderStatusControls({
  orderId,
  status,
  deliveryMethod,
}: OrderStatusControlsProps) {
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<Feedback>(null);

  const moves = allowedTransitions(status, deliveryMethod);
  if (moves.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      {moves.map((next) => (
        <button
          key={next}
          type="button"
          disabled={pending}
          className="border-2 border-current px-4 py-3 font-display text-lg tracking-wide transition-colors hover:bg-brand-red hover:text-cream disabled:opacity-40"
          onClick={() => {
            setFeedback(null);
            startTransition(async () => {
              // `status` is what this row rendered with -- passed so the server
              // can refuse the write if the order moved underneath it.
              const result = await setOrderStatus(orderId, status, next);
              setFeedback(
                result.status === "success"
                  ? { tone: "ok", text: "DONE" }
                  : { tone: "bad", text: failureText[result.reason] },
              );
            });
          }}
        >
          {statusActionLabel[next]}
        </button>
      ))}

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
    </div>
  );
}
