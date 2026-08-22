"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { resolveAdminAccess } from "@/features/admin/lib/admin-guard";
import { adminRoutes } from "@/features/admin/lib/admin-routes";
import { getOrder, moveOrderStatus } from "@/features/admin/lib/orders";
import {
  canTransition,
  isOrderStatus,
  type OrderStatus,
} from "@/features/admin/lib/order-status";

export type OrderStatusFailure =
  | "not-authorized"
  | "invalid-input"
  | "not-found"
  | "not-allowed"
  | "stale"
  | "server-error";

export type OrderStatusResult =
  | { status: "success"; next: OrderStatus }
  | { status: "error"; reason: OrderStatusFailure };

const idSchema = z.uuid();

/**
 * Marks an order handed over, or undoes that.
 *
 * The transition is re-derived from the order as it is stored right now, not
 * from what the page rendered with: the founder's phone may have been showing
 * a list from before the webhook landed. `expected` is what he was looking at,
 * and a mismatch is reported as stale rather than applied -- the same reason
 * moveOrderStatus matches on the current status in its WHERE clause.
 */
export async function setOrderStatus(
  id: string,
  expected: OrderStatus,
  next: OrderStatus,
): Promise<OrderStatusResult> {
  const access = await resolveAdminAccess();
  if (access.status !== "ok") {
    return { status: "error", reason: "not-authorized" };
  }

  const parsedId = idSchema.safeParse(id);
  if (!parsedId.success || !isOrderStatus(expected) || !isOrderStatus(next)) {
    return { status: "error", reason: "invalid-input" };
  }

  const order = await getOrder(parsedId.data);
  if (!order) return { status: "error", reason: "not-found" };
  if (order.status !== expected) return { status: "error", reason: "stale" };

  // The rule lives in one tested place; the action asks rather than restates.
  if (!canTransition(order.status, next, order.deliveryMethod)) {
    return { status: "error", reason: "not-allowed" };
  }

  if (!(await moveOrderStatus(parsedId.data, expected, next))) {
    return { status: "error", reason: "server-error" };
  }

  // Orders have no public surface -- nothing to sweep but the admin's own list.
  revalidatePath(adminRoutes.orders);
  revalidatePath(adminRoutes.dashboard);
  return { status: "success", next };
}
