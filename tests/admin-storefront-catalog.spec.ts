import "dotenv/config";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";
import { Pool } from "pg";

test.skip(!process.env.DATABASE_URL, "Requires the local PostgreSQL database");

test("admin publishing controls the storefront and design requests identify the product", async ({ page }) => {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const userId = randomUUID();
  const token = randomBytes(32).toString("base64url");
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const suffix = userId.slice(0, 8);
  const name = `Studio test pen ${suffix}`;
  const slug = `studio-test-pen-${suffix}`;
  let productId: string | undefined;

  try {
    await pool.query("INSERT INTO users (id,email,password_hash,name,role) VALUES ($1,$2,$3,$4,'admin')", [userId, `studio-test-${userId}@example.invalid`, "temporary-test-account", "Studio test"]);
    await pool.query("INSERT INTO sessions (token_hash,user_id,expires_at) VALUES ($1,$2,now() + interval '10 minutes')", [tokenHash, userId]);
    await page.context().addCookies([{ name: "perty_session", value: token, url: "http://127.0.0.1:3000" }]);

    await page.goto("/admin/products");
    await page.getByRole("textbox", { name: "Product name" }).fill(name);
    await page.getByRole("combobox", { name: "Category" }).selectOption("category-accessories");
    await page.getByRole("combobox", { name: "Design studio" }).selectOption("pens");
    await page.getByRole("button", { name: "Add product" }).click();
    await expect(page.getByRole("status")).toHaveText("Changes saved.");
    const created = await pool.query<{ id: string; status: string; design_template: string }>("SELECT id,status,design_template FROM products WHERE slug=$1", [slug]);
    productId = created.rows[0]?.id;
    expect(productId).toBeTruthy();
    expect(created.rows[0]).toMatchObject({ status: "draft", design_template: "pens" });

    await page.goto("/");
    await expect(page.locator(".pc-category-grid").getByRole("link", { name })).toHaveCount(0);
    await page.goto(`/admin/products/${productId}`);
    await page.getByRole("combobox", { name: "Status" }).selectOption("published");
    await page.getByRole("button", { name: "Save product" }).click();
    await expect(page.getByRole("status")).toHaveText("Changes saved.");

    await page.goto("/");
    await page.locator(".pc-category-grid").getByRole("link", { name }).click();
    await expect(page).toHaveURL(new RegExp(`/design/${slug}$`));
    await expect(page.getByRole("heading", { level: 1, name: `Design ${name}.` })).toBeVisible();
    await page.getByRole("textbox", { name: "Your name" }).fill("Catalog Test");
    await page.getByRole("textbox", { name: "Email address" }).fill(`catalog-${suffix}@example.invalid`);
    await page.getByRole("button", { name: "Send design request" }).click();
    await expect(page.getByText("Design request sent")).toBeVisible();
    const request = await pool.query<{ product_id: string; product_name: string; product_type: string }>("SELECT product_id,product_name,product_type FROM design_requests WHERE customer_email=$1 ORDER BY created_at DESC LIMIT 1", [`catalog-${suffix}@example.invalid`]);
    expect(request.rows[0]).toMatchObject({ product_id: productId, product_name: name, product_type: "pens" });

    await page.goto(`/admin/products/${productId}`);
    await page.getByRole("combobox", { name: "Status" }).selectOption("archived");
    await page.getByRole("button", { name: "Save product" }).click();
    await expect(page.getByRole("status")).toHaveText("Changes saved.");
    const archived = await pool.query<{ status: string }>("SELECT status FROM products WHERE id=$1", [productId]);
    expect(archived.rows[0]?.status).toBe("archived");
    await page.goto("/");
    await expect(page.locator(".pc-category-grid").getByRole("link", { name })).toHaveCount(0);
    const archivedPage = await page.goto(`/design/${slug}`);
    expect(archivedPage?.status()).toBe(404);
  } finally {
    if (productId) {
      await pool.query("DELETE FROM design_requests WHERE product_id=$1", [productId]);
      await pool.query("DELETE FROM admin_audit_log WHERE entity_type='product' AND entity_id=$1", [productId]);
      await pool.query("DELETE FROM products WHERE id=$1", [productId]);
    }
    await pool.query("DELETE FROM sessions WHERE token_hash=$1", [tokenHash]);
    await pool.query("DELETE FROM users WHERE id=$1", [userId]);
    await pool.end();
  }
});
