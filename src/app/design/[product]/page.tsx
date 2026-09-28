import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ProductDesigner from "@/features/designer/product-designer";
import { storefrontProduct, storefrontProducts } from "@/lib/catalog";
import { getCurrentUser } from "@/lib/auth/session";
import { orderOptions } from "@/lib/order-options";
import "@/features/designer/studio.css";

export async function generateMetadata({ params }: { params: Promise<{ product: string }> }): Promise<Metadata> {
  const { product } = await params;
  const item = await storefrontProduct(product);
  if (!item) return {};
  return { title: `Design ${item.name} | Perty Print`, description: item.description || `Preview your own text or artwork printed on ${item.name}.` };
}

export default async function ProductDesignPage({ params }: { params: Promise<{ product: string }> }) {
  const { product } = await params;
  const [item, items] = await Promise.all([storefrontProduct(product), storefrontProducts()]);
  if (!item) notFound();
  const [options, customer] = await Promise.all([item.ordering_enabled ? orderOptions(item.id) : Promise.resolve(null), getCurrentUser()]);
  return <ProductDesigner key={item.id} product={item.design_template} catalogProductId={item.id} catalogName={item.name} catalogAgeRestricted={item.age_restricted} catalogImageUrl={item.image_url} catalogPrintArea={item.print_area} catalogProducts={items} orderOptions={options} minimumQuantity={item.minimum_quantity} customer={customer ? { name: customer.name, email: customer.email } : null} />;
}
