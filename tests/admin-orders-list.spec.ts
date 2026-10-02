import "dotenv/config";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";
import { Pool } from "pg";

test.skip(!process.env.DATABASE_URL, "Requires the local PostgreSQL database");

test("orders list searches, filters, and paginates", async ({ browser }) => {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const adminId = randomUUID();
  const orderIds = Array.from({ length: 27 }, () => randomUUID());
  const marker = `GridCheck-${adminId.slice(0, 8)}`;
  const token = randomBytes(32).toString("base64url");
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });

  try {
    await pool.query("INSERT INTO users (id,email,password_hash,name,role) VALUES ($1,$2,'test','Orders admin','admin')", [adminId, `orders-admin-${adminId}@example.invalid`]);
    await pool.query("INSERT INTO sessions (token_hash,user_id,expires_at) VALUES ($1,$2,now() + interval '20 minutes')", [createHash("sha256").update(token).digest("hex"), adminId]);
    await pool.query(`INSERT INTO orders (id,customer_name,customer_email,fulfillment_method,subtotal_cents,total_cents)
      SELECT id, $2 || ' ' || number, $3, 'pickup', 1000, 1000
      FROM unnest($1::text[]) WITH ORDINALITY AS entries(id, number)`, [orderIds, marker, `${marker}@example.invalid`]);
    await context.addCookies([{ name: "perty_session", value: token, url: test.info().project.use.baseURL! }]);
    const page = await context.newPage();
    await page.goto(`/admin/orders?q=${encodeURIComponent(marker)}`);
    const rows = page.locator(".admin-orders-table tbody tr");
    await expect(rows).toHaveCount(25);
    await expect(page.getByText("Showing 1–25 of 27")).toBeVisible();

    await page.getByRole("link", { name: "2", exact: true }).click();
    await expect(rows).toHaveCount(2);
    await expect(page.getByText("Showing 26–27 of 27")).toBeVisible();
    await page.getByRole("link", { name: "new", exact: true }).click();
    await expect(rows).toHaveCount(25);
    await expect(page).toHaveURL(new RegExp(`status=new.*q=${marker}`));
    await page.getByRole("combobox", { name: "Items per page" }).selectOption("50");
    await expect(rows).toHaveCount(27);
  } finally {
    await context.close().catch(() => undefined);
    await pool.query("DELETE FROM orders WHERE id=ANY($1::text[])", [orderIds]);
    await pool.query("DELETE FROM users WHERE id=$1", [adminId]);
    await pool.end();
  }
});
