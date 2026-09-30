import "server-only";
import { getPool } from "@/lib/db";

export type Category = { id: string; name: string; slug: string; age_restricted: boolean; product_count: number; published_count: number; orderable_count: number };
export type Product = { id: string; category_id: string; category_name: string; name: string; slug: string; description: string; design_template: "pens" | "shirts" | "hats" | "lighters" | null; status: string; ordering_enabled: boolean; age_restricted: boolean; minimum_quantity: number; variant_count: number; priced_variant_count: number; created_at: Date; updated_at: Date; has_mockup: boolean; print_area: { left: number; top: number; right: number; bottom: number } | null };
export type Variant = { id: string; product_id: string; sku: string; label: string; size: string; material: string; color: string; base_price_cents: number | null; active: boolean };
export type Tier = { id: string; variant_id: string; minimum_quantity: number; unit_price_cents: number };
export type Order = { id: string; customer_name: string; customer_email: string; status: string; fulfillment_method: string; total_cents: number; created_at: Date; admin_note: string; item_count: number; payment_status: string | null; confirmation_email_status: string; cancellation_email_status: string };
export type Quote = { id: string; customer_name: string; customer_email: string; details: string; status: string; amount_cents: number | null; admin_note: string; created_at: Date; design_request_id: string | null; customer_note: string; revision: number; notification_email_status: string; order_id: string | null };
export type Artwork = { id: string; original_name: string; mime_type: string; size_bytes: number; status: string; created_at: Date; customer_email: string | null };
export type Pickup = { id: string; name: string; address: string; opening_hours: string; active: boolean };
export type Shipping = { id: string; name: string; description: string; fee_cents: number; active: boolean };
export type DesignRequest = { id: string; user_id: string | null; product_type: "pens" | "shirts" | "hats"; product_id: string | null; product_name: string | null; customer_name: string; customer_email: string; customer_phone: string; quantity: number; notes: string; product_color: string; design_data: { layers?: Array<{ kind: string; text?: string; side?: string }>; personalizations?: Array<{ name: string; number: string; size: string }>; previewSide?: string; previewHeight?: number; productColors?: string[]; photoMockup?: boolean }; status: string; admin_note: string; admin_viewed_at: Date | null; created_at: Date; updated_at: Date };

export async function categories(): Promise<Category[]> {
  const result = await getPool().query<Category>(`SELECT c.*, count(p.id)::int AS product_count,
    count(p.id) FILTER (WHERE p.status='published')::int AS published_count,
    count(p.id) FILTER (WHERE p.ordering_enabled)::int AS orderable_count
    FROM categories c LEFT JOIN products p ON p.category_id = c.id GROUP BY c.id ORDER BY c.name`);
  return result.rows;
}

export async function products(): Promise<Product[]> {
  const result = await getPool().query<Product>(`SELECT p.id,p.category_id,p.name,p.slug,p.description,p.design_template,p.status,p.ordering_enabled,p.age_restricted,p.minimum_quantity,p.created_at,p.updated_at,p.print_area,(p.mockup_image IS NOT NULL) AS has_mockup,c.name AS category_name,count(v.id)::int AS variant_count,count(v.id) FILTER (WHERE v.active AND v.base_price_cents IS NOT NULL)::int AS priced_variant_count FROM products p JOIN categories c ON c.id = p.category_id LEFT JOIN product_variants v ON v.product_id = p.id GROUP BY p.id, c.id ORDER BY p.created_at DESC, p.name`);
  return result.rows;
}

export async function product(id: string): Promise<Product | null> {
  const result = await getPool().query<Product>(`SELECT p.id,p.category_id,p.name,p.slug,p.description,p.design_template,p.status,p.ordering_enabled,p.age_restricted,p.minimum_quantity,p.created_at,p.updated_at,p.print_area,(p.mockup_image IS NOT NULL) AS has_mockup,c.name AS category_name,count(v.id)::int AS variant_count,count(v.id) FILTER (WHERE v.active AND v.base_price_cents IS NOT NULL)::int AS priced_variant_count FROM products p JOIN categories c ON c.id = p.category_id LEFT JOIN product_variants v ON v.product_id = p.id WHERE p.id = $1 GROUP BY p.id, c.id`, [id]);
  return result.rows[0] ?? null;
}

export async function variants(productId: string): Promise<Variant[]> {
  return (await getPool().query<Variant>("SELECT * FROM product_variants WHERE product_id = $1 ORDER BY created_at, label", [productId])).rows;
}

export async function tiers(productId: string): Promise<Tier[]> {
  return (await getPool().query<Tier>(`SELECT t.* FROM quantity_price_tiers t JOIN product_variants v ON v.id = t.variant_id WHERE v.product_id = $1 ORDER BY t.minimum_quantity`, [productId])).rows;
}

export async function orders(): Promise<Order[]> {
  return (await getPool().query<Order>(`SELECT o.*, count(i.id)::int AS item_count, p.status AS payment_status FROM orders o LEFT JOIN order_items i ON i.order_id = o.id LEFT JOIN LATERAL (SELECT status FROM payments WHERE order_id=o.id ORDER BY created_at DESC LIMIT 1) p ON true GROUP BY o.id,p.status ORDER BY o.created_at DESC LIMIT 100`)).rows;
}

export async function designRequests(): Promise<DesignRequest[]> {
  return (await getPool().query<DesignRequest>(`SELECT id,user_id,product_type,product_id,product_name,customer_name,customer_email,customer_phone,quantity,notes,product_color,design_data,status,admin_note,admin_viewed_at,created_at,updated_at FROM design_requests ORDER BY created_at DESC LIMIT 100`)).rows;
}

export async function designRequest(id: string): Promise<DesignRequest | null> {
  const result = await getPool().query<DesignRequest>(`SELECT id,user_id,product_type,product_id,product_name,customer_name,customer_email,customer_phone,quantity,notes,product_color,design_data,status,admin_note,admin_viewed_at,created_at,updated_at FROM design_requests WHERE id=$1`, [id]);
  return result.rows[0] ?? null;
}

export async function quotes(): Promise<Quote[]> {
  return (await getPool().query<Quote>("SELECT * FROM quotes ORDER BY created_at DESC LIMIT 100")).rows;
}

export async function artwork(): Promise<Artwork[]> {
  return (await getPool().query<Artwork>(`SELECT f.*, u.email AS customer_email FROM artwork_files f LEFT JOIN users u ON u.id = f.user_id ORDER BY f.created_at DESC LIMIT 100`)).rows;
}

export async function customers() {
  return (await getPool().query<{ id: string; name: string; email: string; created_at: Date; order_count: number; total_cents: number; is_recent: boolean }>(`SELECT u.id, u.name, u.email, u.created_at, (u.created_at >= now() - interval '30 days') AS is_recent, count(o.id)::int AS order_count, coalesce(sum(o.total_cents), 0)::int AS total_cents FROM users u LEFT JOIN orders o ON o.user_id = u.id WHERE u.role = 'customer' GROUP BY u.id ORDER BY u.created_at DESC LIMIT 100`)).rows;
}

export async function pickupLocations(): Promise<Pickup[]> {
  return (await getPool().query<Pickup>("SELECT * FROM pickup_locations ORDER BY name")).rows;
}

export async function shippingZones(): Promise<Shipping[]> {
  return (await getPool().query<Shipping>("SELECT * FROM shipping_zones ORDER BY name")).rows;
}

export async function dashboard() {
  const db = getPool();
  const [counts, recent, activity, trends, recentDesigns, topProducts, orderStages] = await Promise.all([
    db.query<{ customers: number; orders: number; products: number; pending_orders: number; pending_design_requests: number; quotes: number; revenue_cents: number; published_products: number; draft_products: number; orderable_products: number; products_without_variants: number; products_without_prices: number; new_customers_30: number; orders_30: number; revenue_30_cents: number }>(`SELECT
      (SELECT count(*)::int FROM users WHERE role='customer') AS customers,
      (SELECT count(*)::int FROM orders) AS orders,
      (SELECT count(*)::int FROM products) AS products,
      (SELECT count(*)::int FROM orders WHERE status IN ('new','in_production')) AS pending_orders,
      (SELECT count(*)::int FROM design_requests WHERE status IN ('new','reviewing')) AS pending_design_requests,
      (SELECT count(*)::int FROM quotes WHERE status IN ('new','reviewing')) AS quotes,
      (SELECT coalesce(sum(amount_cents),0)::int FROM payments WHERE status='paid') AS revenue_cents,
      (SELECT count(*)::int FROM products WHERE status='published') AS published_products,
      (SELECT count(*)::int FROM products WHERE status='draft') AS draft_products,
      (SELECT count(*)::int FROM products WHERE ordering_enabled) AS orderable_products,
      (SELECT count(*)::int FROM products p WHERE status <> 'archived' AND NOT EXISTS (SELECT 1 FROM product_variants v WHERE v.product_id=p.id)) AS products_without_variants,
      (SELECT count(*)::int FROM products p WHERE status <> 'archived' AND NOT EXISTS (SELECT 1 FROM product_variants v WHERE v.product_id=p.id AND v.active AND v.base_price_cents IS NOT NULL)) AS products_without_prices,
      (SELECT count(*)::int FROM users WHERE role='customer' AND created_at >= now() - interval '30 days') AS new_customers_30,
      (SELECT count(*)::int FROM orders WHERE created_at >= now() - interval '30 days') AS orders_30,
      (SELECT coalesce(sum(amount_cents),0)::int FROM payments WHERE status='paid' AND created_at >= now() - interval '30 days') AS revenue_30_cents`),
    db.query<Order>(`SELECT o.*, count(i.id)::int AS item_count, p.status AS payment_status FROM orders o LEFT JOIN order_items i ON i.order_id=o.id LEFT JOIN LATERAL (SELECT status FROM payments WHERE order_id=o.id ORDER BY created_at DESC LIMIT 1) p ON true GROUP BY o.id,p.status ORDER BY o.created_at DESC LIMIT 8`),
    db.query<{ id: string; action: string; entity_type: string; created_at: Date }>("SELECT id, action, entity_type, created_at FROM admin_audit_log ORDER BY created_at DESC LIMIT 6"),
    db.query<{ day: string; order_count: number; revenue_cents: number }>(`SELECT d.day::date::text AS day,
      (SELECT count(*)::int FROM orders o WHERE o.created_at >= d.day AND o.created_at < d.day + interval '1 day') AS order_count,
      (SELECT coalesce(sum(p.amount_cents), 0)::int FROM payments p WHERE p.status='paid' AND p.created_at >= d.day AND p.created_at < d.day + interval '1 day') AS revenue_cents
      FROM generate_series(current_date - interval '6 days', current_date, interval '1 day') AS d(day) ORDER BY d.day`),
    db.query<{ id: string; customer_name: string; product_name: string | null; product_type: string; status: string; created_at: Date }>("SELECT id,customer_name,product_name,product_type,status,created_at FROM design_requests ORDER BY created_at DESC LIMIT 5"),
    db.query<{ product_name: string; units: number; total_cents: number }>(`SELECT product_name,sum(quantity)::int AS units,sum(line_total_cents)::int AS total_cents
      FROM order_items GROUP BY product_name ORDER BY units DESC,product_name LIMIT 5`),
    db.query<{ status: string; total: number }>("SELECT status,count(*)::int AS total FROM orders GROUP BY status"),
  ]);
  return { counts: counts.rows[0], recent: recent.rows, activity: activity.rows, trends: trends.rows, recentDesigns: recentDesigns.rows, topProducts: topProducts.rows, orderStages: orderStages.rows };
}
