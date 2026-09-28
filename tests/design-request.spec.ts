import { test, expect } from '@playwright/test';

test.skip(!process.env.TEST_PASSWORD, 'Requires a configured database and TEST_PASSWORD');

test('customer sends a design request and admin can view it', async ({ page }) => {
  await page.goto('http://localhost:3000/');

  await page.getByRole('link', { name: 'Start designing' }).nth(1).click();
  await page.getByRole('link', { name: 'T-shirts' }).click();
  await page.getByRole('button', { name: 'Kelly green' }).click();
  await page.getByRole('button', { name: 'Upload' }).click();
  await page.getByRole('button', { name: '↑ Choose an image' }).click();
  await page.getByRole('button', { name: 'Choose File' })
    .setInputFiles('tests/fixtures/images.png');

  await page.getByRole('textbox', { name: 'Your name' }).fill('Arber');
  await page.getByRole('textbox', { name: 'Email address' }).fill('arber@test.com');
  await page.getByRole('textbox', { name: 'Phone (optional)' }).fill('+38345603054');
  await page.getByRole('spinbutton', { name: 'Quantity' }).fill('4');
  await page.getByRole('button', { name: 'Send design request' }).click();

  await page.goto('http://localhost:3000/login');
  await page.getByRole('textbox', { name: 'Email address' }).fill('arber@test.com');
  await page.getByRole('textbox', { name: 'Password' })
.fill(process.env.TEST_PASSWORD ?? '');
  await page.getByRole('textbox', { name: 'Password' }).press('Enter');

  await page.getByRole('link', { name: 'Open admin dashboard' }).click();
  await page.getByRole('link', { name: 'Design requests' }).click();
  await page.getByRole('link', { name: 'View design →' }).first().click();

await expect(page.getByText('arber@test.com').first()).toBeVisible();});
