import "dotenv/config";
import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";
import { Pool } from "pg";

test.skip(!process.env.DATABASE_URL, "Requires the local PostgreSQL database");

test("two custom designs share one delivery charge and tracking order", async ({ page }) => {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const suffix = randomUUID().slice(0, 8);
  const products = [
    { id: randomUUID(), variant: randomUUID(), template: "shirts", slug: `cart-shirt-${suffix}`, name: `Cart shirt ${suffix}`, price: 2000 },
    { id: randomUUID(), variant: randomUUID(), template: "hats", slug: `cart-hat-${suffix}`, name: `Cart hat ${suffix}`, price: 1500 },
  ];
  const zoneId = randomUUID();
  const email = `cart-${suffix}@example.invalid`;
  let orderId: string | null = null;
  try {
    for (const product of products) {
      await pool.query("INSERT INTO products (id,category_id,name,slug,description,design_template,status,ordering_enabled,minimum_quantity,production_min_days,production_max_days) VALUES ($1,'category-apparel',$2,$3,'Cart test',$4,'published',true,1,3,5)", [product.id, product.name, product.slug, product.template]);
      await pool.query("INSERT INTO product_variants (id,product_id,sku,label,base_price_cents) VALUES ($1,$2,$3,'Standard',$4)", [product.variant, product.id, `CART-${product.slug}`, product.price]);
    }
    await pool.query("INSERT INTO shipping_zones (id,name,description,fee_cents,transit_min_days,transit_max_days) VALUES ($1,$2,'Cart test area',500,1,2)", [zoneId, `Cart zone ${suffix}`]);
    for (const product of products) {
      await page.goto(`/design/${product.slug}`);
      await page.waitForLoadState("networkidle");
      await page.getByRole("button", { name: "Add text", exact: true }).click();
      await expect(page.getByRole("button", { name: "Add text", exact: true })).toHaveAttribute("aria-pressed", "true");
      await page.getByRole("button", { name: "+ Add text" }).click();
      await page.getByRole("button", { name: "Add design to cart" }).click();
      await expect(page.getByRole("link", { name: "View cart" })).toBeVisible();
    }
    await page.goto("/cart");
    await expect(page.getByRole("heading", { name: "Designs (2)" })).toBeVisible();
    await expect(page.getByRole("heading", { name: products[0].name })).toBeVisible();
    await expect(page.getByRole("heading", { name: products[1].name })).toBeVisible();
    await page.getByRole("textbox", { name: "Your name" }).fill("Cart Customer");
    await page.getByRole("textbox", { name: "Email address" }).fill(email);
    await page.getByRole("textbox", { name: "Phone" }).fill("123456789");
    await page.getByRole("combobox", { name: "Fulfillment" }).selectOption("delivery");
    await page.getByRole("combobox", { name: "Delivery zone" }).selectOption(zoneId);
    await page.getByRole("textbox", { name: "Delivery address" }).fill("123 Test Street, Test City");
    await expect(page.getByRole("button", { name: "Place one order · €40.00" })).toBeVisible();
    await page.getByRole("checkbox", { name: /I confirm all designs/ }).check();
    await page.route("**/api/cart/orders", async (route) => {
      const payload = route.request().postDataJSON();
      await route.continue({ postData: JSON.stringify({ ...payload, expectedTotalCents: 1 }) });
    });
    await page.getByRole("button", { name: "Place one order · €40.00" }).click();
    await expect(page.locator(".cart-error")).toContainText("cart price changed");
    expect((await pool.query("SELECT count(*)::int AS count FROM orders WHERE customer_email=$1", [email])).rows[0].count).toBe(0);
    await page.unroute("**/api/cart/orders");
    await page.getByRole("button", { name: "Place one order · €40.00" }).click();
    await expect(page.getByRole("heading", { name: "Order placed" })).toBeVisible();
    const saved = await pool.query<{ id: string; subtotal_cents: number; shipping_cents: number; total_cents: number; count: number }>(`SELECT o.id,o.subtotal_cents,o.shipping_cents,o.total_cents,count(i.id)::int AS count
      FROM orders o JOIN order_items i ON i.order_id=o.id WHERE o.customer_email=$1 GROUP BY o.id`, [email]);
    expect(saved.rows).toHaveLength(1);
    expect(saved.rows[0]).toMatchObject({ subtotal_cents: 3500, shipping_cents: 500, total_cents: 4000, count: 2 });
    orderId = saved.rows[0].id;
    await page.getByRole("link", { name: "Track your order" }).last().click();
    await expect(page.getByText(products[0].name)).toBeVisible();
    await expect(page.getByText(products[1].name)).toBeVisible();
  } finally {
    if (orderId) await pool.query("DELETE FROM orders WHERE id=$1", [orderId]);
    await pool.query("DELETE FROM shipping_zones WHERE id=$1", [zoneId]);
    for (const product of products) await pool.query("DELETE FROM products WHERE id=$1", [product.id]);
    await pool.end();
  }
});
