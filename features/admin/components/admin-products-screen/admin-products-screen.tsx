import { getAdminProducts } from "../../lib/products";
import { NewProductForm } from "../new-product-form/new-product-form";
import { ProductEditor } from "../product-editor/product-editor";

export async function AdminProductsScreen() {
  const products = await getAdminProducts();

  if (!products) {
    return (
      <p role="alert" className="font-body text-xs tracking-widest">
        THE CATALOG READ FAILED. THE SERVER LOG HAS THE REASON.
      </p>
    );
  }

  const hidden = products.filter((product) => !product.active).length;

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-4 border-2 border-current p-4 sm:p-6">
        <div className="flex items-baseline justify-between gap-4">
          <p className="font-display text-2xl leading-none">PRODUCTS</p>
          <p className="font-display text-[clamp(2.5rem,12vw,4rem)] leading-none">
            {products.length}
          </p>
        </div>
        <p className="font-body text-xs tracking-widest opacity-70">
          {hidden > 0 ? `${hidden} HIDDEN FROM THE STORE` : "ALL SHOWING"}
        </p>
        <NewProductForm />
      </header>

      {products.length === 0 ? (
        <p className="font-body text-xs tracking-widest opacity-70">
          NOTHING IN THE CATALOG YET.
        </p>
      ) : null}

      <ul className="flex flex-col gap-3">
        {products.map((product) => (
          <ProductEditor key={product.id} product={product} />
        ))}
      </ul>
    </div>
  );
}
