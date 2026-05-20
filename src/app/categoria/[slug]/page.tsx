import { notFound } from "next/navigation";
import { ProductCard } from "@/components/ProductCard";
import { getProductsByCategory, getCategoryBySlug } from "@/lib/products";

export const revalidate = 60;

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [cat, products] = await Promise.all([
    getCategoryBySlug(slug),
    getProductsByCategory(slug),
  ]);
  if (!cat) notFound();
  const categoryName = cat.name;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <h1 className="text-3xl font-bold text-ink-900">{categoryName}</h1>
      <p className="text-sm text-ink-500">{products.length} productos</p>

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {products.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>
    </div>
  );
}
