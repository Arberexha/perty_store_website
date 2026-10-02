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
    await page.addInitScript(() => {
      const original = AudioContext.prototype.createOscillator;
      AudioContext.prototype.createOscillator = function (...args) {
        (window as Window & { soundOscillators?: number }).soundOscillators = ((window as Window & { soundOscillators?: number }).soundOscillators ?? 0) + 1;
        return original.apply(this, args);
      };
    });
    await page.goto(`${baseURL}/admin/settings`);
    const soundSwitch = page.getByRole("switch", { name: "New order sound" });
    await expect(soundSwitch).toHaveAttribute("aria-checked", "false");
    await soundSwitch.click();
    await expect(soundSwitch).toHaveAttribute("aria-checked", "true");
    await page.getByRole("navigation", { name: "Admin navigation" }).getByRole("link", { name: "Orders" }).click();

    await pool.query("INSERT INTO orders (id,customer_name,customer_email,fulfillment_method,subtotal_cents,total_cents) VALUES ($1,'Sound test customer',$2,'pickup',1000,1000)", [orderId, `sound-order-${orderId}@example.invalid`]);
    await page.waitForFunction(() => (window as Window & { soundOscillators?: number }).soundOscillators === 5, undefined, { timeout: 16_000 });
    await page.getByRole("navigation", { name: "Admin navigation" }).getByRole("link", { name: "Settings" }).click();
    await expect(soundSwitch).toHaveAttribute("aria-checked", "true");
    await page.reload();
    await expect(soundSwitch).toHaveAttribute("aria-checked", "true");
    await soundSwitch.click();
    await expect(soundSwitch).toHaveAttribute("aria-checked", "false");
  } finally {
    await context.close().catch(() => undefined);
    await pool.query("DELETE FROM orders WHERE id=$1", [orderId]);
    await pool.query("DELETE FROM users WHERE id=$1", [adminId]);
    await pool.end();
  }
});
