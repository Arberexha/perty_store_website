import "dotenv/config";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";
import { Pool } from "pg";

test.skip(!process.env.DATABASE_URL, "Requires the local PostgreSQL database");

test("admin photo becomes a storefront design product without a placement border", async ({ page, request }) => {
  test.setTimeout(60_000);
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const userId = randomUUID();
  const token = randomBytes(32).toString("base64url");
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const suffix = userId.slice(0, 8);
  const name = `Studio test shirt ${suffix}`;
  const slug = `studio-test-shirt-${suffix}`;
  let productId: string | undefined;

  try {
    await pool.query("INSERT INTO users (id,email,password_hash,name,role) VALUES ($1,$2,$3,$4,'admin')", [userId, `studio-test-${userId}@example.invalid`, "temporary-test-account", "Studio test"]);
    await pool.query("INSERT INTO sessions (token_hash,user_id,expires_at) VALUES ($1,$2,now() + interval '10 minutes')", [tokenHash, userId]);
    await page.context().addCookies([{ name: "perty_session", value: token, url: "http://127.0.0.1:3000" }]);

    await page.goto("/admin/products/new");
    await page.getByRole("textbox", { name: "Product name" }).fill(name);
    await page.getByRole("combobox", { name: "Category" }).selectOption("category-apparel");
    await page.getByRole("combobox", { name: "Design studio" }).selectOption("shirts");
    await page.locator('input[name="mockup_image"]').setInputFiles("tests/fixtures/images.png");
    await expect(page.locator('input[name^="print_"]')).toHaveCount(0);
    await page.getByRole("button", { name: "Create draft product" }).click();
    await expect(page.locator(".admin-notice.success")).toHaveText("Changes saved.");
    const created = await pool.query<{ id: string; status: string; design_template: string; mockup_mime: string; print_area: null }>("SELECT id,status,design_template,mockup_mime,print_area FROM products WHERE slug=$1", [slug]);
    productId = created.rows[0]?.id;
    expect(productId).toBeTruthy();
    expect(created.rows[0]).toMatchObject({ status: "draft", design_template: "shirts", mockup_mime: "image/webp", print_area: null });
    expect((await request.get(`/product-images/${productId}`)).status()).toBe(404);

    expect((await page.goto(`/design/${slug}`))?.status()).toBe(404);
    await page.goto(`/admin/products/${productId}`);
    await page.getByRole("combobox", { name: "Status" }).selectOption("published");
    await page.getByRole("button", { name: "Save product changes" }).click();
    await expect(page.locator(".admin-notice.success")).toHaveText("Changes saved.");
    const publicImage = await request.get(`/product-images/${productId}`);
    expect(publicImage.status()).toBe(200);
    expect(publicImage.headers()["content-type"]).toBe("image/webp");

    await page.goto(`/design/${slug}`);
    await expect(page).toHaveURL(new RegExp(`/design/${slug}$`));
    await expect(page.getByRole("heading", { level: 1, name: `Design ${name}.` })).toBeVisible();
    await expect(page.getByText("marked print area")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Product color" })).toHaveCount(0);
    await expect(page.getByRole("group", { name: "T-shirt print area" })).toHaveCount(0);
    await page.getByRole("button", { name: "Add text", exact: true }).click();
    await page.getByRole("button", { name: "+ Add text" }).click();
    const canvas = page.locator("canvas[aria-label*='preview']");
    const distantPixels = () => canvas.evaluate((node) => {
      const pixels = (node as HTMLCanvasElement).getContext("2d")!.getImageData(725, 180, 150, 80).data;
      let hash = 0;
      for (const value of pixels) hash = (hash * 31 + value) >>> 0;
      return hash;
    });
    const beforeMove = await distantPixels();
    const bounds = await canvas.boundingBox();
    expect(bounds).not.toBeNull();
    const y = bounds!.y + bounds!.height * 220 / 420;
    await page.mouse.move(bounds!.x + bounds!.width / 2, y);
    await page.mouse.down();
    await page.mouse.move(bounds!.x + bounds!.width * .8, y, { steps: 8 });
    await page.mouse.up();
    await expect.poll(() => page.evaluate((id) => {
      const draft = JSON.parse(localStorage.getItem(`perty-${id}-design-v1`) ?? "{}") as { layers?: { x: number }[] };
      return draft.layers?.[0]?.x ?? 0;
    }, productId!)).toBeGreaterThan(700);
    await expect.poll(distantPixels).not.toBe(beforeMove);
    await page.getByRole("textbox", { name: "Your name" }).fill("Catalog Test");
    await page.getByRole("textbox", { name: "Email address" }).fill(`catalog-${suffix}@example.invalid`);
    await page.getByRole("button", { name: "Send design request" }).click();
    await expect(page.getByText("Design request sent")).toBeVisible();
    const designRequestRow = await pool.query<{ id: string; product_id: string; product_name: string; product_type: string; design_data: { photoMockup: boolean } }>("SELECT id,product_id,product_name,product_type,design_data FROM design_requests WHERE customer_email=$1 ORDER BY created_at DESC LIMIT 1", [`catalog-${suffix}@example.invalid`]);
    expect(designRequestRow.rows[0]).toMatchObject({ product_id: productId, product_name: name, product_type: "shirts", design_data: { photoMockup: true } });
    await page.goto(`/admin/design-requests/${designRequestRow.rows[0].id}`);
    await expect(page.getByText("Uploaded catalog photo")).toBeVisible();

    await page.goto(`/admin/products/${productId}`);
    await page.getByRole("checkbox", { name: "Remove current photo and use the standard studio photo" }).check();
    await page.getByRole("button", { name: "Save product changes" }).click();
    await expect(page.locator(".admin-notice.success")).toHaveText("Changes saved.");
    await page.goto(`/design/${slug}`);
    await expect(page.getByRole("button", { name: "Product color" })).toBeVisible();

    await page.goto(`/admin/products/${productId}`);
    await page.getByRole("combobox", { name: "Status" }).selectOption("archived");
    await page.getByRole("button", { name: "Save product changes" }).click();
    await expect(page.locator(".admin-notice.success")).toHaveText("Changes saved.");
    const archived = await pool.query<{ status: string }>("SELECT status FROM products WHERE id=$1", [productId]);
    expect(archived.rows[0]?.status).toBe("archived");
    const archivedPage = await page.goto(`/design/${slug}`);
    expect(archivedPage?.status()).toBe(404);
  } finally {
    if (!productId) productId = (await pool.query<{ id: string }>("SELECT id FROM products WHERE slug=$1", [slug])).rows[0]?.id;
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
