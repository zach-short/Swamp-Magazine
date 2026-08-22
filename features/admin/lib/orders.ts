import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

import {
  isDeliveryMethod,
  isOrderStatus,
  type DeliveryMethod,
  type OrderStatus,
} from "./order-status";

// `orders` and `order_items` carry no RLS policies at all (P1, deliberately),
// so the service-role client is the only way in -- and every caller here sits
// behind the admin guard.
//
// Only the foundation columns are selected. P3's migration adds
// expected_amount_cents and confirmation_sent_at, and selecting a column that
// does not exist yet fails the whole query: fulfilment must not stop working
// because a money-path migration has not been applied. Those columns are a
// reconciliation concern, not a "did he hand over the shirt" one.

export type OrderItem = {
  id: string;
  productName: string;
  size: string;
  unitPriceCents: number;
  quantity: number;
};

export type ShippingAddress = {
  line1: string | null;
  line2: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  country: string | null;
};

export type AdminOrder = {
  id: string;
  status: OrderStatus;
  deliveryMethod: DeliveryMethod;
  customerName: string | null;
  customerEmail: string | null;
  customerPhone: string | null;
  shippingAddress: ShippingAddress | null;
  amountTotalCents: number | null;
  stripePaymentIntentId: string | null;
  createdAt: string;
  items: OrderItem[];
};

type OrderItemRow = {
  id: string;
  product_name: string;
  size: string;
  unit_price_cents: number;
  quantity: number;
  created_at: string;
};

type OrderRow = {
  id: string;
  status: string;
  delivery_method: string;
  customer_name: string | null;
  customer_email: string | null;
  customer_phone: string | null;
  shipping_address: unknown;
  amount_total_cents: number | null;
  stripe_payment_intent_id: string | null;
  created_at: string;
  order_items: OrderItemRow[];
};

// One string literal on purpose -- see the note in products.ts.
const SELECT =
  "id, status, delivery_method, customer_name, customer_email, customer_phone, shipping_address, amount_total_cents, stripe_payment_intent_id, created_at, order_items(id, product_name, size, unit_price_cents, quantity, created_at)";

// The founder reads this on a phone. Older orders are still reachable by id;
// this is the working queue, not an archive.
const LIST_LIMIT = 100;

export type OrderList = {
  orders: AdminOrder[];
  awaiting: number;
  truncated: boolean;
};

/** `null` means the read failed -- never an empty list, which reads as "no sales". */
export async function getOrderList(): Promise<OrderList | null> {
  try {
    const supabase = createAdminClient();
    const [rowsResult, awaitingResult] = await Promise.all([
      supabase
        .from("orders")
        .select(SELECT)
        .order("created_at", { ascending: false })
        .limit(LIST_LIMIT),
      supabase
        .from("orders")
        .select("id", { count: "exact", head: true })
        .eq("status", "paid"),
    ]);

    if (rowsResult.error) {
      console.error(
        "[ADMIN_ORDERS]",
        rowsResult.error.code,
        rowsResult.error.message,
      );
      return null;
    }

    const rows = (rowsResult.data ?? []) as OrderRow[];
    return {
      orders: rows.map(toAdminOrder),
      awaiting: awaitingResult.count ?? 0,
      truncated: rows.length === LIST_LIMIT,
    };
  } catch (error) {
    console.error("[ADMIN_ORDERS]", error);
    return null;
  }
}

export async function getOrder(id: string): Promise<AdminOrder | null> {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("orders")
      .select(SELECT)
      .eq("id", id)
      .maybeSingle();

    if (error) {
      console.error("[ADMIN_ORDER]", error.code, error.message);
      return null;
    }
    return data ? toAdminOrder(data as OrderRow) : null;
  } catch (error) {
    console.error("[ADMIN_ORDER]", error);
    return null;
  }
}

/**
 * Moves an order's status, guarding on the status it was in.
 *
 * The `.eq("status", from)` is the point: two taps on a slow phone connection,
 * or the founder and a webhook arriving together, would otherwise both apply.
 * Matching on the expected current status makes the second one a no-op instead
 * of a silent overwrite of whatever happened in between.
 */
export async function moveOrderStatus(
  id: string,
  from: OrderStatus,
  to: OrderStatus,
): Promise<boolean> {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("orders")
      .update({ status: to, updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("status", from)
      .select("id");

    if (error) {
      console.error("[ADMIN_ORDER_STATUS]", error.code, error.message);
      return false;
    }
    if (!data || data.length === 0) {
      console.error(
        "[ADMIN_ORDER_STATUS] no row moved -- order",
        id,
        "was not in",
        from,
      );
      return false;
    }
    return true;
  } catch (error) {
    console.error("[ADMIN_ORDER_STATUS]", error);
    return false;
  }
}

function toAdminOrder(row: OrderRow): AdminOrder {
  return {
    id: row.id,
    // The DB check constraint already limits these, but a value that slipped
    // past it must not become a status the UI cannot render a button for.
    status: isOrderStatus(row.status) ? row.status : "pending",
    deliveryMethod: isDeliveryMethod(row.delivery_method)
      ? row.delivery_method
      : "pickup",
    customerName: row.customer_name,
    customerEmail: row.customer_email,
    customerPhone: row.customer_phone,
    shippingAddress: toShippingAddress(row.shipping_address),
    amountTotalCents: row.amount_total_cents,
    stripePaymentIntentId: row.stripe_payment_intent_id,
    createdAt: row.created_at,
    items: [...(row.order_items ?? [])]
      .sort((a, b) => a.created_at.localeCompare(b.created_at))
      .map((item) => ({
        id: item.id,
        productName: item.product_name,
        size: item.size,
        unitPriceCents: item.unit_price_cents,
        quantity: item.quantity,
      })),
  };
}

/**
 * The column is jsonb written from Stripe's payload, so its shape is whatever
 * Stripe sent. Read field by field rather than cast -- a missing line1 should
 * render a gap, not crash the only screen that says where to post the parcel.
 */
function toShippingAddress(value: unknown): ShippingAddress | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const source = value as Record<string, unknown>;
  const address: ShippingAddress = {
    line1: str(source.line1),
    line2: str(source.line2),
    city: str(source.city),
    state: str(source.state),
    postalCode: str(source.postal_code) ?? str(source.postalCode),
    country: str(source.country),
  };
  return Object.values(address).some((field) => field !== null) ? address : null;
}

function str(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}
