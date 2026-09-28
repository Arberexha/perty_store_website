import { expect, test } from "@playwright/test";

test("visitors can open the product designers", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1, name: /your design/i })).toBeVisible();

  await page.locator(".pc-hero").getByRole("link", { name: /start designing/i }).click();
  await expect(page).toHaveURL(/\/design\/pens$/);
  await expect(page.getByRole("heading", { name: "Design your pen." })).toBeVisible();
  await expect(page.locator("canvas[aria-label*='preview']")).toBeVisible();

  await page.getByRole("link", { name: "T-shirts" }).click();
  await expect(page).toHaveURL(/\/design\/shirts$/);
  await expect(page.getByRole("heading", { name: "Design your T-shirt." })).toBeVisible();
  await expect(page.getByRole("group", { name: "T-shirt print area" })).toBeVisible();
});

test("lighter previews cannot be submitted as requests", async ({ page }) => {
  await page.goto("/design/lighters");
  await expect(page.getByRole("heading", { name: "Design your lighter." })).toBeVisible();
  await expect(page.getByText("Lighters are 18+ and cannot be ordered online.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Send design request" })).toHaveCount(0);
});
