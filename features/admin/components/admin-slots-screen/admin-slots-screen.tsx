import { getRegisteredSlots } from "../../lib/image-slots";
import { getProductIndex } from "../../lib/products";
import { allSlotDefinitions } from "../../lib/slot-keys";
import { SlotUploader } from "../slot-uploader/slot-uploader";

export async function AdminSlotsScreen() {
  const [products, registered] = await Promise.all([
    getProductIndex(),
    getRegisteredSlots(),
  ]);

  if (!products || !registered) {
    return (
      <p role="alert" className="font-body text-xs tracking-widest">
        THE IMAGE LIST READ FAILED. THE SERVER LOG HAS THE REASON.
      </p>
    );
  }

  const slots = allSlotDefinitions(products);
  const filled = slots.filter((slot) => registered.has(slot.key)).length;

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-3 border-2 border-current p-4 sm:p-6">
        <div className="flex items-baseline justify-between gap-4">
          <p className="font-display text-2xl leading-none">IMAGES</p>
          <p className="font-display text-[clamp(2.5rem,12vw,4rem)] leading-none">
            {filled}/{slots.length}
          </p>
        </div>
        <p className="font-body text-xs tracking-widest opacity-70">
          PICK A PICTURE AND HIT REPLACE. IT GOES LIVE STRAIGHT AWAY
        </p>
        <p className="font-body text-[10px] tracking-widest opacity-70">
          BIG PHONE PHOTOS ARE FINE -- THEY GET SHRUNK ON THE WAY IN
        </p>
      </header>

      <ul className="grid gap-4 sm:grid-cols-2">
        {slots.map((slot) => {
          const current = registered.get(slot.key) ?? null;
          return (
            <SlotUploader
              key={slot.key}
              slot={slot}
              currentUrl={current?.url ?? null}
              currentAlt={current?.alt ?? null}
              updatedAt={current?.updatedAt ?? null}
            />
          );
        })}
      </ul>
    </div>
  );
}
