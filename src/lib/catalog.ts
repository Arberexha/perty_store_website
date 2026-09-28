import "server-only";
import { getPool } from "@/lib/db";
import { isDesignTemplate } from "@/lib/catalog-config";
import type { DesignTemplate } from "@/lib/catalog-config";

export type StorefrontProduct = {
  id: string;
  name: string;
  slug: string;
  description: string;
  design_template: DesignTemplate;
  age_restricted: boolean;
};

export async function storefrontProducts(): Promise<StorefrontProduct[]> {
  const result = await getPool().query<StorefrontProduct>(`SELECT id,name,slug,description,design_template,age_restricted
    FROM products WHERE status='published' AND design_template IS NOT NULL
    ORDER BY created_at,name`);
  return result.rows;
}

export async function storefrontProduct(segment: string): Promise<StorefrontProduct | null> {
  const items = await storefrontProducts();
  const exact = items.find((item) => item.slug === segment);
  if (exact) return exact;
  if (!isDesignTemplate(segment)) return null;
  return items.find((item) => item.design_template === segment) ?? null;
}
