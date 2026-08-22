import { createClient } from '@/lib/supabase/server';

// Deliberately bare placeholder: it proves the live-mode branch and the public
// catalog read end-to-end. P2 replaces this with the real landing per the
// founder's mockups.
export async function LiveLandingScreen() {
  const supabase = await createClient();
  const { data: products } = await supabase
    .from('products')
    .select('slug, name, price_cents')
    .order('sort_order');

  return (
    <main className='min-h-dvh bg-cream p-10 text-ink'>
      <h1 className='font-display text-5xl text-brand-red'>SWAMP MAGAZINE</h1>
      <p className='mt-2 font-body text-sm tracking-widest'>
        LIVE MODE. STOREFRONT LANDS IN P2.
      </p>
      <ul className='mt-8 flex flex-col gap-2 font-body'>
        {(products ?? []).map((product) => (
          <li key={product.slug}>
            {product.name} — ${Math.round(product.price_cents / 100)}
          </li>
        ))}
      </ul>
    </main>
  );
}
