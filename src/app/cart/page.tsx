import type { Metadata } from "next";
import CartCheckout from "./cart-checkout";
import { storefrontProducts } from "@/lib/catalog";
import { orderOptions } from "@/lib/order-options";
import { getCurrentUser } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Your cart | Perty Print" };

export default async function CartPage() {
  const [allProducts, customer] = await Promise.all([storefrontProducts(), getCurrentUser()]);
  const orderable = allProducts.filter((item) => item.ordering_enabled && !item.age_restricted);
  const products = await Promise.all(orderable.map(async (item) => ({ id: item.id, name: item.name, slug: item.slug, minimumQuantity: item.minimum_quantity,
    timing: { productionMinDays: item.production_min_days, productionMaxDays: item.production_max_days, bulkThreshold: item.bulk_threshold, bulkExtraDays: item.bulk_extra_days },
    options: await orderOptions(item.id),
  })));
  return <main className="cart-page"><div className="cart-shell"><span className="eyebrow">YOUR DESIGNS</span><h1>Your cart.</h1><p>Review each custom product, then place one unpaid order with a single pickup or delivery choice.</p><CartCheckout products={products} customer={customer ? { name: customer.name, email: customer.email } : null} orderDate={new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Belgrade", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date())} /></div></main>;
}
