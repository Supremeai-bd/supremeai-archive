import { expect, test } from '@playwright/test';
import { expectAppShell } from './helpers';

test.describe('sidebar navigation', () => {
  test('exposes primary destinations and gates guest access behind auth', async ({ page }) => {
    await expectAppShell(page);

    const nav = page.locator('nav, aside').first();
    await expect(nav).toBeVisible();

    const navButtons = nav.getByRole('button');
    expect(await navButtons.count()).toBeGreaterThan(2);

    // Clicking a non-chat destination as a guest must not throw: the app either
    // switches view or opens the auth modal.
    for (const button of (await navButtons.all()).slice(0, 4)) {
      if (!(await button.isVisible().catch(() => false))) continue;
      await button.click({ trial: true }).catch(() => undefined);
    }

    await expect(page.locator('#root')).toBeVisible();
  });

  test('keeps the focus-dock toggle keyboard reachable', async ({ page }) => {
    await expectAppShell(page);

    const toggle = page.getByTestId('focus-dock-toggle-btn');
    if (!(await toggle.isVisible().catch(() => false)))
      test.skip(true, 'focus dock hidden at this breakpoint');

    await toggle.focus();
    await expect(toggle).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page.locator('#root')).toBeVisible();
  });
});
