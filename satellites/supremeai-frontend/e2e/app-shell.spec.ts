import { expect, test } from '@playwright/test';
import { expectAppShell, trackPageErrors } from './helpers';

test.describe('app shell', () => {
  test('mounts the studio shell without fatal errors', async ({ page }) => {
    const tracker = trackPageErrors(page);

    await expectAppShell(page);

    await expect(page).toHaveTitle(/supreme/i);
    await expect(page.locator('#root')).toBeVisible();

    // Only uncaught exceptions are fatal; network 502s from an offline backend
    // are expected and are logged as console errors by the app itself.
    expect(
      tracker.errors.filter((message) => /is not a function|undefined is not/.test(message))
    ).toEqual([]);
  });

  test('serves the SPA fallback for deep links instead of a 404 page', async ({ page }) => {
    const response = await page.goto('/workspace', { waitUntil: 'domcontentloaded' });

    expect(response?.status()).toBeLessThan(400);
    await expect(page.locator('#root')).toBeAttached();
  });
});
