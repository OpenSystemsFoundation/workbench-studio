import { test, expect } from '@playwright/test';

test.use({ viewport: { width: 1280, height: 900 } });

// The keys come in a few presets. Picking one is a preference of the player's,
// not part of the song: it is heard at once, and it is still chosen after a
// reload.
test.describe('keys presets', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      const starts: number[] = [];
      (window as unknown as { __starts: number[] }).__starts = starts;
      const start = AudioBufferSourceNode.prototype.start;
      AudioBufferSourceNode.prototype.start = function (this: AudioBufferSourceNode, ...a: number[]) {
        starts.push(this.buffer?.duration ?? 0);
        return start.apply(this, a as [number]);
      };
    });
    await page.goto('/');
    await page.getByTestId('desktop-tabs').getByRole('tab', { name: 'chords' }).click();
    await expect(page.getByTestId('keys-sound')).toBeVisible();
  });

  test('the lush preset is the default, and the others are one tap away', async ({ page }) => {
    await expect(page.getByTestId('keys-suitcase')).toHaveAttribute('aria-pressed', 'true');
    for (const id of ['stage', 'pad', 'reed']) {
      await expect(page.getByTestId(`keys-${id}`)).toHaveAttribute('aria-pressed', 'false');
    }
  });

  test('choosing a preset plays it, and it is remembered after a reload', async ({ page }) => {
    await page.getByTestId('keys-reed').click();
    await expect(page.getByTestId('keys-reed')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByTestId('keys-suitcase')).toHaveAttribute('aria-pressed', 'false');
    // it was auditioned: notes started as the preset was chosen
    await expect.poll(() => page.evaluate(() => (window as unknown as { __starts: number[] }).__starts.length)).toBeGreaterThan(0);

    await page.reload();
    await page.getByTestId('desktop-tabs').getByRole('tab', { name: 'chords' }).click();
    await expect(page.getByTestId('keys-reed')).toHaveAttribute('aria-pressed', 'true');
  });

  test('a different preset plays different notes', async ({ page }) => {
    // The same chord through two presets: the reed's notes ring shorter than
    // the suitcase's, so the buffers that start are not the same length.
    const lengths = async () => page.evaluate(() => (window as unknown as { __starts: number[] }).__starts.splice(0));
    await page.getByTestId('keys-stage').click();
    await expect.poll(async () => (await page.evaluate(() => (window as unknown as { __starts: number[] }).__starts.length))).toBeGreaterThan(0);
    const stage = await lengths();
    await page.getByTestId('keys-reed').click();
    await expect.poll(async () => (await page.evaluate(() => (window as unknown as { __starts: number[] }).__starts.length))).toBeGreaterThan(0);
    const reed = await lengths();
    expect(Math.max(...reed)).toBeLessThan(Math.max(...stage));
  });
});
