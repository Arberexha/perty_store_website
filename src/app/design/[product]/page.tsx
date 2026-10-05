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

export default async function ProductDesignPage({ params, searchParams }: { params: Promise<{ product: string }>; searchParams: Promise<{ saved?: string; reorder?: string }> }) {
  const { product } = await params;
  const { saved, reorder } = await searchParams;
  const [item, items] = await Promise.all([storefrontProduct(product), storefrontProducts()]);
  if (!item) notFound();
  const [options, customer] = await Promise.all([item.ordering_enabled ? orderOptions(item.id) : Promise.resolve(null), getCurrentUser()]);
  return <ProductDesigner key={`${item.id}-${reorder ?? saved ?? "draft"}`} product={item.design_template} catalogProductId={item.id} catalogName={item.name} catalogAgeRestricted={item.age_restricted} catalogImageUrl={item.image_url} catalogPrintArea={item.print_area} catalogProducts={items} orderOptions={options} minimumQuantity={item.minimum_quantity} readyTiming={{ productionMinDays: item.production_min_days, productionMaxDays: item.production_max_days, bulkThreshold: item.bulk_threshold, bulkExtraDays: item.bulk_extra_days }} orderDate={new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Belgrade", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date())} customer={customer ? { name: customer.name, email: customer.email } : null} savedDesignId={reorder ? null : saved ?? null} reorderOrderId={reorder ?? null} />;
}
