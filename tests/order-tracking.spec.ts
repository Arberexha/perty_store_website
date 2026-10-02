import "dotenv/config";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";
import { Pool } from "pg";

test.skip(!process.env.DATABASE_URL, "Requires the local PostgreSQL database");

test("a private order link shows status history after an admin update", async ({ browser }) => {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const adminId = randomUUID();
  const orderId = randomUUID();
  const session = randomBytes(32).toString("base64url");
  const baseURL = test.info().project.use.baseURL!;
  const guest = await browser.newContext();
  const admin = await browser.newContext();
  try {
    await pool.query("INSERT INTO users (id,email,password_hash,name,role) VALUES ($1,$2,'test','Tracking admin','admin')", [adminId, `tracking-admin-${adminId}@example.invalid`]);
    await pool.query("INSERT INTO sessions (token_hash,user_id,expires_at) VALUES ($1,$2,now() + interval '20 minutes')", [createHash("sha256").update(session).digest("hex"), adminId]);
    const inserted = await pool.query<{ tracking_token: string }>("INSERT INTO orders (id,customer_name,customer_email,fulfillment_method,subtotal_cents,total_cents) VALUES ($1,'Tracking Customer',$2,'pickup',1200,1200) RETURNING tracking_token", [orderId, `tracking-${orderId}@example.invalid`]);
    await pool.query("INSERT INTO order_items (id,order_id,product_name,variant_label,quantity,unit_price_cents,line_total_cents) VALUES ($1,$2,'Test print','Standard',1,1200,1200)", [randomUUID(), orderId]);
    const path = `/track/${inserted.rows[0].tracking_token}`;
    const guestPage = await guest.newPage();
    await guestPage.goto(`${baseURL}${path}`);
    await expect(guestPage.getByRole("heading", { name: "Your order, at a glance." })).toBeVisible();
    await expect(guestPage.getByText("Order received")).toHaveCount(2);
    await expect(guestPage.getByText("Tracking Customer")).toHaveCount(0);
    await expect(guestPage.getByText("Test print")).toBeVisible();
    expect((await guestPage.request.get(`${baseURL}/track/${"0".repeat(64)}`)).status()).toBe(404);

    await admin.addCookies([{ name: "perty_session", value: session, url: baseURL }]);
    const adminPage = await admin.newPage();
    await adminPage.goto(`${baseURL}/admin/orders/${orderId}`);
    await adminPage.getByRole("combobox", { name: "Status" }).selectOption("in_production");
    await adminPage.getByRole("button", { name: "Save order" }).click();
    await expect(adminPage).toHaveURL(/\/admin\/orders\?/);
    const saved = (await pool.query<{ status: string; status_email_status: string }>("SELECT status,status_email_status FROM orders WHERE id=$1", [orderId])).rows[0];
    expect(saved.status).toBe("in_production");
    expect(["sent", "failed", "not_configured"]).toContain(saved.status_email_status);
    await guestPage.reload();
    await expect(guestPage.getByText("In production")).toHaveCount(2);
    await expect(guestPage.getByText("Order received")).toHaveCount(1);
    expect((await pool.query("SELECT status FROM order_status_events WHERE order_id=$1 ORDER BY id", [orderId])).rows.map((row) => row.status)).toEqual(["new", "in_production"]);
    await adminPage.goto(`${baseURL}/admin/orders/${orderId}`);
    await adminPage.getByRole("textbox", { name: "Internal note" }).fill("Production note only");
    await adminPage.getByRole("button", { name: "Save order" }).click();
    expect((await pool.query("SELECT count(*)::int AS count FROM order_status_events WHERE order_id=$1", [orderId])).rows[0].count).toBe(2);
  } finally {
    await guest.close().catch(() => undefined);
    await admin.close().catch(() => undefined);
    await pool.query("DELETE FROM orders WHERE id=$1", [orderId]);
    await pool.query("DELETE FROM users WHERE id=$1", [adminId]);
    await pool.end();
  }
});
