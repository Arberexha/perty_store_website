import "dotenv/config";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";
import { Pool } from "pg";

test.skip(!process.env.DATABASE_URL, "Requires the local PostgreSQL database");

test("a new design request is highlighted until an admin opens it", async ({ browser }) => {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const adminId = randomUUID();
  const requestId = randomUUID();
  const token = randomBytes(32).toString("base64url");
  const baseURL = test.info().project.use.baseURL!;
  const context = await browser.newContext();
  const preview = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLytQAAAABJRU5ErkJggg==", "base64");

  try {
    await pool.query("INSERT INTO users (id,email,password_hash,name,role) VALUES ($1,$2,'test','Request admin','admin')", [adminId, `request-admin-${adminId}@example.invalid`]);
    await pool.query("INSERT INTO sessions (token_hash,user_id,expires_at) VALUES ($1,$2,now() + interval '20 minutes')", [createHash("sha256").update(token).digest("hex"), adminId]);
    await pool.query(`INSERT INTO design_requests (id,product_type,product_name,customer_name,customer_email,quantity,product_color,design_data,preview_png)
      VALUES ($1,'shirts','Custom T-shirt','Unread test customer',$2,1,'#f4f1e9',$3,$4)`, [requestId, `unread-${requestId}@example.invalid`, JSON.stringify({ layers: [{ id: "text", kind: "text", text: "Hello", side: "front" }], previewSide: "front" }), preview]);
    await context.addCookies([{ name: "perty_session", value: token, url: baseURL }]);
    const page = await context.newPage();

    await page.goto(`${baseURL}/admin/design-requests`);
    const row = page.locator(".design-requests-table tbody tr").filter({ hasText: requestId.slice(0, 8) });
    await expect(row).toHaveClass(/is-unread/);
    await expect(row.getByText("Unread", { exact: true })).toBeVisible();
    await row.getByRole("button", { name: "Review design" }).click();
    await expect(page.getByRole("heading", { name: `Request #${requestId.slice(0, 8)}` })).toBeVisible();
    await expect.poll(async () => (await pool.query("SELECT admin_viewed_at FROM design_requests WHERE id=$1", [requestId])).rows[0]?.admin_viewed_at).not.toBeNull();

    await page.getByRole("link", { name: "All design requests" }).click();
    const viewedRow = page.locator(".design-requests-table tbody tr").filter({ hasText: requestId.slice(0, 8) });
    await expect(viewedRow).not.toHaveClass(/is-unread/);
    await expect(viewedRow.getByText("Unread", { exact: true })).toHaveCount(0);
    await expect(viewedRow.getByText("new", { exact: true })).toBeVisible();

    await pool.query("UPDATE design_requests SET admin_viewed_at=NULL WHERE id=$1", [requestId]);
    await page.goto(`${baseURL}/admin`);
    await page.locator(".admin-recent-list form").filter({ hasText: "Unread test customer" }).getByRole("button").click();
    await expect(page.getByRole("heading", { name: `Request #${requestId.slice(0, 8)}` })).toBeVisible();
    await expect.poll(async () => (await pool.query("SELECT admin_viewed_at FROM design_requests WHERE id=$1", [requestId])).rows[0]?.admin_viewed_at).not.toBeNull();

  } finally {
    await context.close();
    await pool.query("DELETE FROM design_requests WHERE id=$1", [requestId]);
    await pool.query("DELETE FROM users WHERE id=$1", [adminId]);
    await pool.end();
  }
});
