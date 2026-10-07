import { expect, test } from "@playwright/test";

test("visitors can open the product designers", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1, name: /your design/i })).toBeVisible();

  await page.getByRole("link", { name: "Design Custom pen" }).click();
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

test("product studios show only the editable preview", async ({ page }) => {
  for (const slug of ["custom-tshirt", "custom-pen", "custom-hat", "custom-lighter"]) {
    await page.goto(`/design/${slug}`);
    await expect(page.locator("canvas[aria-label*='preview']")).toBeVisible();
    await expect(page.getByRole("button", { name: "Angle view" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Reset zoom" })).toBeVisible();
  }
});

test("a starter template can be edited and undone", async ({ page }) => {
  await page.goto("/design/custom-tshirt");
  await page.getByRole("button", { name: "Use Birthday template" }).click();
  await expect(page.locator(".studio-selection-bar strong")).toHaveText("HAPPY");

  const textField = page.getByRole("textbox", { name: "Text", exact: true });
  await textField.fill("MAYA");
  await expect(page.locator(".studio-selection-bar strong")).toHaveText("MAYA");
  await page.getByRole("button", { name: "Use Team spirit template" }).click();
  await expect(page.locator(".studio-selection-bar strong")).toHaveText("YOUR TEAM");
  await page.getByRole("button", { name: "Undo" }).click();
  await expect(page.locator(".studio-selection-bar strong")).toHaveText("MAYA");
});

test("clicking shirt text edits it directly on the preview", async ({ page }) => {
  await page.goto("/design/custom-tshirt");
  await page.getByRole("button", { name: "Use Business tee template" }).click();
  const canvas = page.locator("canvas[aria-label*='preview']");
  const bounds = await canvas.boundingBox();
  expect(bounds).not.toBeNull();
  await canvas.click({ position: { x: bounds!.width / 2, y: bounds!.height * 198 / 420 } });
  const inlineText = page.getByRole("textbox", { name: "Edit text on product" });
  await expect(inlineText).toBeFocused();
  await inlineText.fill("ORANGE 14");
  await inlineText.press("Enter");
  await expect(inlineText).toHaveCount(0);
  await expect(page.locator(".studio-selection-bar strong")).toHaveText("ORANGE 14");

  const beforeDrag = await canvas.evaluate((element) => (element as HTMLCanvasElement).toDataURL());
  const dragBounds = await canvas.boundingBox();
  expect(dragBounds).not.toBeNull();
  const startX = dragBounds!.x + dragBounds!.width / 2;
  const startY = dragBounds!.y + dragBounds!.height * 198 / 420;
  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.mouse.move(startX + 50, startY, { steps: 5 });
  await page.mouse.up();
  await expect(page.getByRole("textbox", { name: "Edit text on product" })).toHaveCount(0);
  await expect.poll(() => canvas.evaluate((element) => (element as HTMLCanvasElement).toDataURL())).not.toBe(beforeDrag);
});

test("each product opens blank even when this browser has an older draft", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => {
    for (const product of ["shirts", "pens", "hats", "lighters"]) {
      localStorage.setItem(`perty-${product}-design-v1`, JSON.stringify({ layers: [{ id: "old-logo", kind: "text", text: "OLD LOGO", color: "#000000", font: "Arial", x: 500, y: 200, scale: 1, rotation: 0 }] }));
    }
  });
  for (const slug of ["custom-tshirt", "custom-pen", "custom-hat", "custom-lighter"]) {
    await page.goto(`/design/${slug}`);
    await expect(page.locator(".studio-selection-bar")).toHaveCount(0);
    await page.getByRole("button", { name: "Layers" }).click();
    await expect(page.getByText("No designs on this area yet.")).toBeVisible();
  }
  await page.goto("/design/custom-tshirt");
  await page.getByRole("button", { name: "Use Business tee template" }).click();
  await expect(page.locator(".studio-selection-bar")).toBeVisible();
  await page.reload();
  await expect(page.locator(".studio-selection-bar")).toHaveCount(0);
});

test("template cards show their full preview text at desktop and mobile widths", async ({ page }) => {
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/design/custom-tshirt");
    await expect(page.getByRole("button", { name: "Use Birthday template" })).toBeVisible();
    const clipped = await page.locator(".studio-template-preview").evaluateAll((previews) => previews.some((preview) =>
      preview.scrollHeight > preview.clientHeight + 1 || Array.from(preview.querySelectorAll("span")).some((line) => line.scrollWidth > line.clientWidth + 1),
    ));
    expect(clipped).toBe(false);
  }
});
