import { expect, type Page } from '@playwright/test';

/**
 * Shared, locale-agnostic helpers. The app ships English and Bangla, so
 * assertions target structure and stable test ids rather than copy.
 */

/** Collects uncaught exceptions and console errors raised by the page. */
export function trackPageErrors(page: Page): { errors: string[] } {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  return { errors };
}

/** Waits until React has mounted *something* inside #root. */
export async function expectAppShell(page: Page): Promise<void> {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  const root = page.locator('#root');
  await expect(root).toBeAttached();
  await expect
    .poll(async () => (await root.innerText()).trim().length, { timeout: 30_000 })
    .toBeGreaterThan(20);
}

/** Chat composer: a textarea/contenteditable that accepts a draft. */
export function chatComposer(page: Page) {
  return page
    .locator('textarea')
    .or(page.locator('[contenteditable="true"]'))
    .or(page.getByRole('textbox'))
    .first();
}
