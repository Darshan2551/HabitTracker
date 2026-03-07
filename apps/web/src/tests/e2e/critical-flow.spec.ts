import { expect, test } from '@playwright/test';

test('onboarding to completion to analytics flow', async ({ page }) => {
  const timestamp = Date.now();
  const email = `e2e-${timestamp}@example.com`;
  const password = 'StrongPass123!';

  await page.goto('/register');
  await page.getByLabel('Name').fill('E2E User');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Sign up' }).click();

  await page.goto('/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Sign in' }).click();

  await expect(page.getByText("Today's focus")).toBeVisible();
  await page.getByLabel('Quick add habit').fill('E2E Daily Habit');
  await page.getByRole('button', { name: 'Add' }).click();

  await expect(page.getByText('E2E Daily Habit')).toBeVisible();
  await page.getByRole('button', { name: 'Mark complete' }).first().click();

  await page.getByRole('link', { name: 'Analytics' }).click();
  await expect(page.getByText('Weekly completion trend')).toBeVisible();
});
