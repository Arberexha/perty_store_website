import "dotenv/config";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";
import { Pool } from "pg";

test.skip(!process.env.DATABASE_URL, "Requires the local PostgreSQL database");

test("new orders are highlighted until an admin opens them", async ({ browser }) => {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const adminId = randomUUID();
  const orderId = randomUUID();
  const token = randomBytes(32).toString("base64url");
  const baseURL = test.info().project.use.baseURL!;
  const context = await browser.newContext();

  try {
    await pool.query("INSERT INTO users (id,email,password_hash,name,role) VALUES ($1,$2,'test','Unread order admin','admin')", [adminId, `unread-order-admin-${adminId}@example.invalid`]);
    await pool.query("INSERT INTO sessions (token_hash,user_id,expires_at) VALUES ($1,$2,now() + interval '20 minutes')", [createHash("sha256").update(token).digest("hex"), adminId]);
    await pool.query("INSERT INTO orders (id,customer_name,customer_email,fulfillment_method,subtotal_cents,total_cents) VALUES ($1,'Unread order customer',$2,'pickup',1000,1000)", [orderId, `unread-order-${orderId}@example.invalid`]);
    await context.addCookies([{ name: "perty_session", value: token, url: baseURL }]);
    const page = await context.newPage();

    await page.goto(`${baseURL}/admin/orders`);
    const row = page.locator(".orders-table tbody tr").filter({ hasText: orderId.slice(0, 8) });
    await expect(row).toHaveClass(/is-unread/);
    await expect(row.getByText("Unread", { exact: true })).toBeVisible();
    await row.getByRole("button", { name: "Manage" }).click();
    await expect(page.getByRole("heading", { name: `Order #${orderId.slice(0, 8)}` })).toBeVisible();
    await expect.poll(async () => (await pool.query("SELECT admin_viewed_at FROM orders WHERE id=$1", [orderId])).rows[0]?.admin_viewed_at).not.toBeNull();

    await page.getByRole("link", { name: "All orders" }).click();
    const viewedRow = page.locator(".orders-table tbody tr").filter({ hasText: orderId.slice(0, 8) });
    await expect(viewedRow).not.toHaveClass(/is-unread/);
    await expect(viewedRow.getByText("Unread", { exact: true })).toHaveCount(0);
    await expect(viewedRow.getByText("new", { exact: true })).toBeVisible();

    await pool.query("UPDATE orders SET admin_viewed_at=NULL WHERE id=$1", [orderId]);
    await page.goto(`${baseURL}/admin`);
    const dashboardRow = page.locator(".orders-table tbody tr").filter({ hasText: orderId.slice(0, 8) });
    await expect(dashboardRow).toHaveClass(/is-unread/);
    await dashboardRow.getByRole("button", { name: `#${orderId.slice(0, 8)}` }).click();
    await expect(page.getByRole("heading", { name: `Order #${orderId.slice(0, 8)}` })).toBeVisible();
    await expect.poll(async () => (await pool.query("SELECT admin_viewed_at FROM orders WHERE id=$1", [orderId])).rows[0]?.admin_viewed_at).not.toBeNull();
  } finally {
    await context.close().catch(() => undefined);
    await pool.query("DELETE FROM orders WHERE id=$1", [orderId]);
    await pool.query("DELETE FROM users WHERE id=$1", [adminId]);
    await pool.end();
  }
});
