import "dotenv/config";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";
import { Pool } from "pg";

test.skip(!process.env.DATABASE_URL, "Requires the local PostgreSQL database");

test("an enabled admin panel sounds for a newly placed order", async ({ browser, request }) => {
  test.setTimeout(60_000);
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const adminId = randomUUID();
  const orderId = randomUUID();
  const token = randomBytes(32).toString("base64url");
  const baseURL = test.info().project.use.baseURL!;
  const context = await browser.newContext();

  try {
    expect((await request.get("/api/admin/orders/latest")).status()).toBe(403);
    await pool.query("INSERT INTO users (id,email,password_hash,name,role) VALUES ($1,$2,'test','Sound admin','admin')", [adminId, `sound-admin-${adminId}@example.invalid`]);
    await pool.query("INSERT INTO sessions (token_hash,user_id,expires_at) VALUES ($1,$2,now() + interval '20 minutes')", [createHash("sha256").update(token).digest("hex"), adminId]);
    await context.addCookies([{ name: "perty_session", value: token, url: baseURL }]);
    const page = await context.newPage();
    await page.goto(`${baseURL}/admin`);
    await page.getByRole("button", { name: "Enable sound" }).click();
    await expect(page.getByRole("button", { name: "Sound on" })).toBeVisible();
    await page.getByRole("navigation", { name: "Admin navigation" }).getByRole("link", { name: "Orders" }).click();
    await expect(page.getByRole("button", { name: "Sound on" })).toBeVisible();

    await pool.query("INSERT INTO orders (id,customer_name,customer_email,fulfillment_method,subtotal_cents,total_cents) VALUES ($1,'Sound test customer',$2,'pickup',1000,1000)", [orderId, `sound-order-${orderId}@example.invalid`]);
    await expect(page.getByRole("button", { name: "New order!" })).toBeVisible({ timeout: 16_000 });
    await expect(page.getByRole("button", { name: "Sound on" })).toBeVisible({ timeout: 7_000 });
    await page.getByRole("button", { name: "Sound on" }).click();
    await expect(page.getByRole("button", { name: "Enable sound" })).toBeVisible();
  } finally {
    await context.close().catch(() => undefined);
    await pool.query("DELETE FROM orders WHERE id=$1", [orderId]);
    await pool.query("DELETE FROM users WHERE id=$1", [adminId]);
    await pool.end();
  }
});
