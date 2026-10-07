import "dotenv/config";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";
import { Pool } from "pg";

test.skip(!process.env.DATABASE_URL, "Requires the local PostgreSQL database");

test("customer places a designed order at the server calculated total", async ({ page, request }) => {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const suffix = randomUUID().slice(0, 8);
  const productId = randomUUID();
  const variantId = randomUUID();
  const zoneId = randomUUID();
  const userId = randomUUID();
  const token = randomBytes(32).toString("base64url");
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const slug = `order-test-shirt-${suffix}`;
  const email = `order-test-${suffix}@example.invalid`;
  let orderId: string | undefined;
  try {
    await pool.query("INSERT INTO products (id,category_id,name,slug,description,design_template,status,ordering_enabled,minimum_quantity,production_min_days,production_max_days) VALUES ($1,'category-apparel',$2,$3,'Test shirt','shirts','published',true,2,3,5)", [productId, `Order test shirt ${suffix}`, slug]);
    await pool.query("INSERT INTO product_variants (id,product_id,sku,label,base_price_cents) VALUES ($1,$2,$3,'Medium',2000)", [variantId, productId, `ORDER-${suffix}`]);
    await pool.query("INSERT INTO quantity_price_tiers (id,variant_id,minimum_quantity,unit_price_cents) VALUES ($1,$2,3,1800)", [randomUUID(), variantId]);
    await pool.query("INSERT INTO shipping_zones (id,name,description,fee_cents,transit_min_days,transit_max_days) VALUES ($1,$2,'Test area',500,1,2)", [zoneId, `Test zone ${suffix}`]);
    await page.goto(`/design/${slug}`);
    await expect(page.getByRole("heading", { name: "Place your order." })).toBeVisible();
    await page.getByRole("button", { name: "Add text", exact: true }).click();
    await page.getByRole("button", { name: "+ Add text" }).click();
    await page.getByRole("spinbutton", { name: "Quantity" }).fill("3");
    await page.getByRole("textbox", { name: "Your name" }).fill("Order Test");
    await page.getByRole("textbox", { name: "Email address" }).fill(email);
    await page.getByRole("textbox", { name: "Phone" }).fill("123456789");
    await page.getByRole("combobox", { name: "Fulfillment" }).selectOption("delivery");
    await page.getByRole("combobox", { name: "Delivery zone" }).selectOption(zoneId);
    await page.getByRole("textbox", { name: "Delivery address" }).fill("123 Test Street, Test City");
    await expect(page.getByRole("button", { name: "Place order · €59.00" })).toBeVisible();
    await page.getByRole("checkbox").check();
    await page.route("**/api/orders", async (route) => {
      const payload = route.request().postDataJSON();
      await route.continue({ postData: JSON.stringify({ ...payload, expectedTotalCents: 1 }) });
    });
    await page.getByRole("button", { name: "Place order · €59.00" }).click();
    await expect(page.locator(".studio-order-error")).toContainText("The price changed");
    expect((await pool.query("SELECT count(*)::int AS count FROM orders WHERE customer_email=$1", [email])).rows[0].count).toBe(0);
    await page.unroute("**/api/orders");
    await page.getByRole("button", { name: "Place order · €59.00" }).click();
    await expect(page.getByText("Order placed")).toBeVisible();
    const banner = page.locator(".order-announcement");
    await expect(banner).toBeVisible();
    await expect(banner).toContainText("Estimated to arrive");
    await expect(banner).toContainText(/Order #[0-9a-f]{8} placed/);
    const trackingLink = page.getByRole("link", { name: "Track your order" });
    await expect(trackingLink).toBeVisible();
    const saved = await pool.query<{ id: string; total_cents: number; subtotal_cents: number; shipping_cents: number; status: string; confirmation_email_status: string; payment_count: number; preview_size: number; unit_price_cents: number; quantity: number; ready_estimate: { minDate: string; maxDate: string; kind: string } }>(`SELECT o.id,o.total_cents,o.subtotal_cents,o.shipping_cents,o.status,o.confirmation_email_status,o.ready_estimate,
      (SELECT count(*)::int FROM payments WHERE order_id=o.id) AS payment_count,
      octet_length(i.preview_png) AS preview_size,i.unit_price_cents,i.quantity
      FROM orders o JOIN order_items i ON i.order_id=o.id WHERE o.customer_email=$1`, [email]);
    expect(saved.rows[0]).toMatchObject({ total_cents: 5900, subtotal_cents: 5400, shipping_cents: 500, status: "new", payment_count: 0, unit_price_cents: 1800, quantity: 3 });
    expect(["sent", "failed", "not_configured"]).toContain(saved.rows[0].confirmation_email_status);
    expect(saved.rows[0].preview_size).toBeGreaterThan(100);
    expect(saved.rows[0].ready_estimate).toMatchObject({ kind: "delivery" });
    expect(saved.rows[0].ready_estimate.minDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    orderId = saved.rows[0].id;
    await trackingLink.click();
    await expect(page.locator(".order-announcement")).toContainText("Estimated to arrive");
    await expect(page.getByRole("heading", { name: "Your order, at a glance." })).toBeVisible();
    await expect(page.getByText("Order received")).toHaveCount(2);
    expect((await request.get(`/admin/orders/${orderId}/items/${(await pool.query<{ id: string }>("SELECT id FROM order_items WHERE order_id=$1", [orderId])).rows[0].id}/preview`)).status()).toBe(403);

    await pool.query("INSERT INTO users (id,email,password_hash,name,role) VALUES ($1,$2,'temporary-test-account','Test admin','admin')", [userId, `order-admin-${suffix}@example.invalid`]);
    await pool.query("INSERT INTO sessions (token_hash,user_id,expires_at) VALUES ($1,$2,now() + interval '10 minutes')", [tokenHash, userId]);
    await page.context().addCookies([{ name: "perty_session", value: token, url: new URL(page.url()).origin }]);
    await page.goto(`/admin/orders/${orderId}`);
    await expect(page.getByRole("heading", { name: `Order #${orderId.slice(0, 8)}` })).toBeVisible();
    await expect(page.getByText("123 Test Street, Test City")).toBeVisible();
    await expect(page.getByText("€59.00")).toBeVisible();
  } finally {
    if (orderId) await pool.query("DELETE FROM orders WHERE id=$1", [orderId]);
    await pool.query("DELETE FROM sessions WHERE token_hash=$1", [tokenHash]);
    await pool.query("DELETE FROM users WHERE id=$1", [userId]);
    await pool.query("DELETE FROM shipping_zones WHERE id=$1", [zoneId]);
    await pool.query("DELETE FROM products WHERE id=$1", [productId]);
    await pool.end();
  }
});
