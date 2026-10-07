import "server-only";
import { getPool } from "@/lib/db";
import { isDesignTemplate } from "@/lib/catalog-config";
import type { DesignTemplate } from "@/lib/catalog-config";
import { productImageUrl } from "@/lib/product-mockup";

export type StorefrontProduct = {
  id: string;
  name: string;
  slug: string;
  description: string;
  design_template: DesignTemplate;
  age_restricted: boolean;
  ordering_enabled: boolean;
  minimum_quantity: number;
  production_min_days: number | null;
  production_max_days: number | null;
  bulk_threshold: number | null;
  bulk_extra_days: number | null;
  image_url: string | null;
};

export async function storefrontProducts(): Promise<StorefrontProduct[]> {
  const result = await getPool().query<Omit<StorefrontProduct, "image_url"> & { updated_at: Date; has_mockup: boolean }>(`SELECT id,name,slug,description,design_template,age_restricted,ordering_enabled,minimum_quantity,production_min_days,production_max_days,bulk_threshold,bulk_extra_days,updated_at,(mockup_image IS NOT NULL) AS has_mockup
    FROM products WHERE status='published' AND design_template IS NOT NULL
    ORDER BY created_at,name`);
  return result.rows.map(({ updated_at, has_mockup, ...item }) => ({ ...item, image_url: has_mockup ? productImageUrl(item.id, updated_at) : null }));
}

export async function storefrontProduct(segment: string): Promise<StorefrontProduct | null> {
  const items = await storefrontProducts();
  const exact = items.find((item) => item.slug === segment);
  if (exact) return exact;
  if (!isDesignTemplate(segment)) return null;
  return items.find((item) => item.design_template === segment) ?? null;
}
