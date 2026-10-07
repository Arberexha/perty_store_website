import "dotenv/config";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";
import { Pool } from "pg";

test.skip(!process.env.DATABASE_URL, "Requires the local PostgreSQL database");

test("a customer reopens an order with current pricing and places a new order", async ({ page, request }) => {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const suffix = randomUUID().slice(0, 8);
  const userId = randomUUID();
  const productId = randomUUID();
  const variantId = randomUUID();
  const replacementVariantId = randomUUID();
  const oldOrderId = randomUUID();
  const sessionToken = randomBytes(32).toString("base64url");
  const sessionHash = createHash("sha256").update(sessionToken).digest("hex");
  const slug = `reorder-shirt-${suffix}`;
  const email = `reorder-${suffix}@example.invalid`;
  const baseURL = test.info().project.use.baseURL!;
  try {
    await pool.query("INSERT INTO users (id,email,password_hash,name,role) VALUES ($1,$2,'temporary-test-account','Repeat customer','customer')", [userId, email]);
    await pool.query("INSERT INTO sessions (token_hash,user_id,expires_at) VALUES ($1,$2,now() + interval '10 minutes')", [sessionHash, userId]);
    await pool.query("INSERT INTO products (id,category_id,name,slug,description,design_template,status,ordering_enabled,minimum_quantity,production_min_days,production_max_days) VALUES ($1,'category-apparel',$2,$3,'Test reorder shirt','shirts','published',true,1,3,5)", [productId, `Reorder shirt ${suffix}`, slug]);
    await pool.query("INSERT INTO product_variants (id,product_id,sku,label,base_price_cents) VALUES ($1,$2,$3,'Medium',2000)", [variantId, productId, `REORDER-${suffix}`]);
    await pool.query("INSERT INTO orders (id,user_id,customer_name,customer_email,customer_phone,fulfillment_method,subtotal_cents,total_cents) VALUES ($1,$2,'Repeat customer',$3,'123456789','pickup',4500,4500)", [oldOrderId, userId, email]);
    const design = { layers: [{ id: "original-text", kind: "text", text: "ORIGINAL ART", color: "#000000", font: "Arial", x: 500, y: 210, scale: 1, rotation: 0, side: "front" }], personalizations: [], previewSide: "front", productColors: ["#f4f1e9"], productColor: "#f4f1e9" };
    await pool.query("INSERT INTO order_items (id,order_id,product_id,variant_id,product_name,variant_label,quantity,unit_price_cents,line_total_cents,design_data) VALUES ($1,$2,$3,$4,'Reorder shirt','Medium',3,1500,4500,$5)", [randomUUID(), oldOrderId, productId, variantId, JSON.stringify(design)]);
    expect((await request.get(`/api/orders/${oldOrderId}/reorder`)).status()).toBe(401);

    await page.context().addCookies([{ name: "perty_session", value: sessionToken, url: baseURL }]);
    await page.goto("/account?section=orders");
    const orderRow = page.locator(".account-orders li").filter({ hasText: oldOrderId.slice(0, 8) });
    await expect(orderRow.getByRole("link", { name: "Order again" })).toBeVisible();
    await orderRow.getByRole("link", { name: "Order again" }).click();
    await expect(page.getByRole("heading", { name: "Order again." })).toBeVisible();
    await expect(page.getByRole("textbox", { name: "Text", exact: true })).toHaveValue("ORIGINAL ART");
    await expect(page.getByRole("spinbutton", { name: "Quantity" })).toHaveValue("3");
    await expect(page.getByRole("button", { name: "Place order · €60.00" })).toBeVisible();
    await page.getByRole("checkbox", { name: /I confirm the design/ }).check();
    await page.getByRole("button", { name: "Place order · €60.00" }).click();
    await expect(page.getByText("Order placed", { exact: true })).toBeVisible();
    const orders = await pool.query<{ id: string; total_cents: number; design_data: { layers: Array<{ text?: string }> } }>("SELECT o.id,o.total_cents,i.design_data FROM orders o JOIN order_items i ON i.order_id=o.id WHERE o.user_id=$1 ORDER BY o.created_at DESC", [userId]);
    expect(orders.rows).toHaveLength(2);
    const fresh = orders.rows.find((row) => row.id !== oldOrderId)!;
    expect(fresh.total_cents).toBe(6000);
    expect(fresh.design_data.layers[0].text).toBe("ORIGINAL ART");

    await pool.query("UPDATE product_variants SET active=false WHERE id=$1", [variantId]);
    await pool.query("INSERT INTO product_variants (id,product_id,sku,label,base_price_cents) VALUES ($1,$2,$3,'Large',2500)", [replacementVariantId, productId, `REORDER-NEW-${suffix}`]);
    await page.goto("/account?section=orders");
    await page.locator(".account-orders li").filter({ hasText: oldOrderId.slice(0, 8) }).getByRole("link", { name: "Order again" }).click();
    await expect(page.getByText("Your previous product option is unavailable", { exact: false })).toBeVisible();
    await expect(page.getByRole("combobox", { name: "Product option" })).toContainText("Large");
    await expect(page.getByRole("button", { name: "Place order · €75.00" })).toBeVisible();
  } finally {
    await pool.query("DELETE FROM orders WHERE user_id=$1", [userId]);
    await pool.query("DELETE FROM sessions WHERE token_hash=$1", [sessionHash]);
    await pool.query("DELETE FROM users WHERE id=$1", [userId]);
    await pool.query("DELETE FROM products WHERE id=$1", [productId]);
    await pool.end();
  }
});
