import { adminRoutes } from "../../lib/admin-routes";
import { getSubscriberList, type SubscriberRecord } from "../../lib/subscribers";

export async function AdminSubscribersScreen() {
  const list = await getSubscriberList();

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-4 border-2 border-current p-4 sm:p-6">
        <div className="flex items-baseline justify-between gap-4">
          <p className="font-display text-2xl leading-none">SIGNED UP</p>
          <p className="font-display text-[clamp(2.5rem,12vw,4rem)] leading-none">
            {list.failed ? "—" : list.total}
          </p>
        </div>
        <p className="font-body text-xs tracking-widest opacity-70">
          {list.failed
            ? "COULDN'T READ THE LIST"
            : `${list.active} STILL SUBSCRIBED`}
        </p>

        {/* Plain anchor: the response is a file download, not a page. */}
        <a
          href={adminRoutes.subscribersExport}
          className="border-2 border-current px-4 py-3 text-center font-display text-xl tracking-wide transition-colors hover:bg-brand-red hover:text-cream"
        >
          EXPORT CSV
        </a>
      </header>

      {list.failed ? (
        <p role="alert" className="font-body text-xs tracking-widest">
          THE SUBSCRIBER READ FAILED. THE SERVER LOG HAS THE REASON.
        </p>
      ) : null}

      {!list.failed && list.rows.length === 0 ? (
        <p className="font-body text-xs tracking-widest opacity-70">
          NOBODY HAS SIGNED UP YET.
        </p>
      ) : null}

      <ul className="flex flex-col gap-3">
        {list.rows.map((row) => (
          <SubscriberRow key={row.id} row={row} />
        ))}
      </ul>

      {list.truncated ? (
        <p className="font-body text-xs tracking-widest opacity-70">
          SHOWING THE NEWEST {list.rows.length}. THE CSV HAS EVERYONE.
        </p>
      ) : null}
    </div>
  );
}

function SubscriberRow({ row }: { row: SubscriberRecord }) {
  return (
    <li
      className={`flex flex-col gap-1 border-2 border-current p-3 ${
        row.unsubscribedAt ? "opacity-50" : ""
      }`}
    >
      <p className="font-body text-sm break-all">{row.email}</p>
      <p className="flex flex-wrap gap-x-3 font-body text-[10px] tracking-widest opacity-70">
        {/* Date only, straight off the stored UTC timestamp -- a server-side
            locale format would disagree with the founder's phone. */}
        <span>{row.createdAt.slice(0, 10)}</span>
        {row.phone ? <span>{row.phone}</span> : null}
        {row.smsConsent ? <span>SMS OK</span> : null}
        {row.unsubscribedAt ? <span>UNSUBSCRIBED</span> : null}
      </p>
    </li>
  );
}
