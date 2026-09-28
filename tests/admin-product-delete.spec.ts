import "dotenv/config";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";
import { Pool } from "pg";

test.skip(!process.env.DATABASE_URL, "Requires the local PostgreSQL database");

test("an admin can cancel or confirm product deletion", async ({ page }) => {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const userId = randomUUID();
  const productId = randomUUID();
  const variantId = randomUUID();
  const tierId = randomUUID();
  const token = randomBytes(32).toString("base64url");
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const name = `Delete test ${productId.slice(0, 8)}`;

  try {
    await pool.query("INSERT INTO users (id,email,password_hash,name,role) VALUES ($1,$2,$3,$4,'admin')", [userId, `delete-test-${userId}@example.invalid`, "temporary-test-account", "Delete test"]);
    await pool.query("INSERT INTO sessions (token_hash,user_id,expires_at) VALUES ($1,$2,now() + interval '10 minutes')", [tokenHash, userId]);
    await pool.query("INSERT INTO products (id,category_id,name,slug) VALUES ($1,'category-apparel',$2,$3)", [productId, name, `delete-test-${productId}`]);
    await pool.query("INSERT INTO product_variants (id,product_id,sku,label) VALUES ($1,$2,$3,'Test variant')", [variantId, productId, `DELETE-TEST-${variantId}`]);
    await pool.query("INSERT INTO quantity_price_tiers (id,variant_id,minimum_quantity,unit_price_cents) VALUES ($1,$2,2,100)", [tierId, variantId]);

    await page.context().addCookies([{ name: "perty_session", value: token, url: "http://127.0.0.1:3000" }]);
    await page.goto("/admin/products");
    const deleteButton = page.getByRole("button", { name: `Delete ${name}` });
    await expect(page.getByRole("link", { name: `Edit ${name}` }).locator("svg")).toBeVisible();
    await expect(deleteButton).toBeVisible();

    page.once("dialog", (dialog) => dialog.dismiss());
    await deleteButton.click();
    await expect(deleteButton).toBeVisible();

    page.once("dialog", (dialog) => dialog.accept());
    await deleteButton.click();
    await expect(page).toHaveURL(/\/admin\/products\?deleted=1$/);
    await expect(page.getByRole("status")).toHaveText("Product deleted.");
    await expect(page.getByText(name)).toHaveCount(0);

    const [product, variant, tier, audit] = await Promise.all([
      pool.query("SELECT 1 FROM products WHERE id=$1", [productId]),
      pool.query("SELECT 1 FROM product_variants WHERE id=$1", [variantId]),
      pool.query("SELECT 1 FROM quantity_price_tiers WHERE id=$1", [tierId]),
      pool.query("SELECT 1 FROM admin_audit_log WHERE action='deleted' AND entity_type='product' AND entity_id=$1", [productId]),
    ]);
    expect(product.rowCount).toBe(0);
    expect(variant.rowCount).toBe(0);
    expect(tier.rowCount).toBe(0);
    expect(audit.rowCount).toBe(1);
  } finally {
    await pool.query("DELETE FROM admin_audit_log WHERE entity_type='product' AND entity_id=$1", [productId]);
    await pool.query("DELETE FROM products WHERE id=$1", [productId]);
    await pool.query("DELETE FROM sessions WHERE token_hash=$1", [tokenHash]);
    await pool.query("DELETE FROM users WHERE id=$1", [userId]);
    await pool.end();
  }
});
