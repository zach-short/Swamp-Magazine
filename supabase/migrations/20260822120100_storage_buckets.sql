-- Storage buckets (P1): `products` (cutouts) and `slots` (lifestyle/full-bleed
-- slot images). Both public-read -- objects are resized <=2000px WebP derivatives
-- (BD-6), served through next/image. No storage.objects policies are created, so
-- writes are service-role only (seed script now, admin allowlist policies in P4).

insert into storage.buckets (id, name, public)
values
  ('products', 'products', true),
  ('slots', 'slots', true)
on conflict (id) do nothing;
