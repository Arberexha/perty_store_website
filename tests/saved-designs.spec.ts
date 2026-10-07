import "dotenv/config";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";
import { Pool } from "pg";

test.skip(!process.env.DATABASE_URL, "Requires the local PostgreSQL database");

test("a customer saves, reopens, shares, duplicates, and deletes a design", async ({ page, browser, request }) => {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const userId = randomUUID();
  const productId = randomUUID();
  const suffix = randomUUID().slice(0, 8);
  const slug = `saved-hat-${suffix}`;
  const token = randomBytes(32).toString("base64url");
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const baseURL = test.info().project.use.baseURL!;
  const anotherDevice = await browser.newContext();
  try {
    await pool.query("INSERT INTO users (id,email,password_hash,name,role) VALUES ($1,$2,'temporary-test-account','Design customer','customer')", [userId, `design-${suffix}@example.invalid`]);
    await pool.query("INSERT INTO sessions (token_hash,user_id,expires_at) VALUES ($1,$2,now() + interval '10 minutes')", [tokenHash, userId]);
    await pool.query("INSERT INTO products (id,category_id,name,slug,description,design_template,status) VALUES ($1,'category-accessories',$2,$3,'Test hat','hats','published')", [productId, `Saved hat ${suffix}`, slug]);
    await page.context().addCookies([{ name: "perty_session", value: token, url: baseURL }]);
    await page.goto(`/design/${slug}`);
    await page.getByRole("button", { name: "Add text" }).click();
    await page.getByRole("button", { name: "+ Add text" }).click();
    await page.getByRole("button", { name: "Save design" }).click();
    await page.getByRole("textbox", { name: "Design name" }).fill("Weekend hat");
    await page.getByRole("button", { name: "Save to My designs" }).click();
    await expect(page.getByRole("status").filter({ hasText: "saved to My designs" })).toBeVisible();
    const rows = await pool.query<{ id: string; name: string; design_data: { layers: unknown[] }; preview_size: number }>("SELECT id,name,design_data,octet_length(preview_png) AS preview_size FROM saved_designs WHERE user_id=$1", [userId]);
    expect(rows.rows).toHaveLength(1);
    expect(rows.rows[0].name).toBe("Weekend hat");
    expect(rows.rows[0].design_data.layers).toHaveLength(1);
    expect(rows.rows[0].preview_size).toBeGreaterThan(100);
    const savedId = rows.rows[0].id;
    expect((await request.get(`/api/saved-designs/${savedId}`)).status()).toBe(401);
    expect((await request.get(`/api/saved-designs/${savedId}/preview`)).status()).toBe(401);

    await anotherDevice.addCookies([{ name: "perty_session", value: token, url: baseURL }]);
    const otherPage = await anotherDevice.newPage();
    await otherPage.goto(`${baseURL}/account`);
    await expect(otherPage.getByRole("heading", { name: "Weekend hat" })).toBeVisible();
    await otherPage.getByRole("button", { name: "Create share link" }).click();
    await expect(otherPage.getByRole("button", { name: "Copy share link" })).toBeVisible();
    const shared = await pool.query<{ share_token: string }>("SELECT share_token FROM saved_designs WHERE id=$1", [savedId]);
    const shareToken = shared.rows[0].share_token;
    expect(shareToken).toHaveLength(32);
    expect((await request.get(`/share/${shareToken}`)).status()).toBe(200);
    expect((await request.get(`/share/${shareToken}/preview`)).status()).toBe(200);
    await otherPage.getByRole("button", { name: "Stop sharing" }).click();
    await expect(otherPage.getByRole("button", { name: "Create share link" })).toBeVisible();
    expect((await request.get(`/share/${shareToken}`)).status()).toBe(404);
    expect((await request.get(`/share/${shareToken}/preview`)).status()).toBe(404);
    await otherPage.getByRole("link", { name: "Continue editing" }).click();
    await expect(otherPage.getByRole("textbox", { name: "Design name" })).toHaveCount(0);
    await otherPage.getByRole("button", { name: "Save changes" }).click();
    await expect(otherPage.getByRole("textbox", { name: "Design name" })).toHaveValue("Weekend hat");
    await otherPage.getByRole("button", { name: "Save changes" }).last().click();
    await otherPage.goto(`${baseURL}/account`);
    await otherPage.getByRole("button", { name: "Duplicate" }).click();
    await expect(otherPage.getByRole("heading", { name: "Weekend hat (copy)" })).toBeVisible();
    await otherPage.getByRole("article").filter({ hasText: "Weekend hat (copy)" }).getByRole("button", { name: "Delete" }).click();
    await expect(otherPage.getByRole("heading", { name: "Weekend hat (copy)" })).toHaveCount(0);
  } finally {
    await anotherDevice.close();
    await pool.query("DELETE FROM saved_designs WHERE user_id=$1", [userId]);
    await pool.query("DELETE FROM products WHERE id=$1", [productId]);
    await pool.query("DELETE FROM users WHERE id=$1", [userId]);
    await pool.end();
  }
});
