import { getOrderList } from "../../lib/orders";
import { OrderCard } from "../order-card/order-card";

export async function AdminOrdersScreen() {
  const list = await getOrderList();

  if (!list) {
    return (
      <p role="alert" className="font-body text-xs tracking-widest">
        THE ORDER READ FAILED. THE SERVER LOG HAS THE REASON.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-3 border-2 border-current p-4 sm:p-6">
        <div className="flex items-baseline justify-between gap-4">
          <p className="font-display text-2xl leading-none">TO HAND OVER</p>
          <p className="font-display text-[clamp(2.5rem,12vw,4rem)] leading-none">
            {list.awaiting}
          </p>
        </div>
        <p className="font-body text-xs tracking-widest opacity-70">
          {list.awaiting === 0
            ? "NOTHING WAITING ON YOU"
            : "PAID AND STILL WITH YOU"}
        </p>
      </header>

      {list.orders.length === 0 ? (
        <p className="font-body text-xs tracking-widest opacity-70">
          NO ORDERS YET.
        </p>
      ) : null}

      <ul className="flex flex-col gap-3">
        {list.orders.map((order) => (
          <OrderCard key={order.id} order={order} />
        ))}
      </ul>

      {list.truncated ? (
        <p className="font-body text-xs tracking-widest opacity-70">
          SHOWING THE NEWEST {list.orders.length}.
        </p>
      ) : null}
    </div>
  );
}
