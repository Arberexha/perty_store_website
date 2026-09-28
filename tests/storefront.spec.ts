import { expect, test } from "@playwright/test";

test("visitors can open the product designers", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1, name: /your design/i })).toBeVisible();

  await page.locator(".pc-category-grid").getByRole("link", { name: /Custom pen/i }).click();
  await expect(page).toHaveURL(/\/design\/custom-pen$/);
  await expect(page.getByRole("heading", { name: "Design Custom pen." })).toBeVisible();
  await expect(page.locator("canvas[aria-label*='preview']")).toBeVisible();

  await page.getByRole("navigation", { name: "Choose a product to design" }).getByRole("link", { name: "Custom T-shirt" }).click();
  await expect(page).toHaveURL(/\/design\/custom-tshirt$/);
  await expect(page.getByRole("heading", { name: "Design Custom T-shirt." })).toBeVisible();
  await expect(page.getByRole("group", { name: "T-shirt print area" })).toBeVisible();
});

test("lighter previews cannot be submitted as requests", async ({ page }) => {
  await page.goto("/design/custom-lighter");
  await expect(page.getByRole("heading", { name: "Design Custom lighter (18+)." })).toBeVisible();
  await expect(page.getByText("This 18+ product cannot be ordered online.", { exact: false })).toBeVisible();
  await expect(page.getByRole("button", { name: "Send design request" })).toHaveCount(0);
});
