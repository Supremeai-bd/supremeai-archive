import { expect, test } from '@playwright/test';
import { chatComposer, expectAppShell } from './helpers';

test.describe('chat composer', () => {
  test('accepts a draft and keeps it when the run controls toggle', async ({ page }) => {
    await expectAppShell(page);

    const composer = chatComposer(page);
    await expect(composer).toBeVisible();

    const draft = 'Draft kept across panel toggles';
    await composer.click();
    await composer.fill(draft).catch(async () => {
      // contenteditable fallback
      await composer.type(draft);
    });

    await expect(composer)
      .toContainText(draft)
      .catch(async () => {
        await expect(composer).toHaveValue(draft);
      });

    const runSettings = page.getByTestId('workbench-run-settings-btn');
    if (await runSettings.isVisible().catch(() => false)) {
      await runSettings.click();
      await expect(page.getByTestId('workbench-run-settings-popover')).toBeVisible();
      await page.keyboard.press('Escape');
    }

    // The draft must survive the popover round-trip.
    const value = await composer.inputValue().catch(() => '');
    const text = value || (await composer.innerText());
    expect(text).toContain(draft);
  });
});
