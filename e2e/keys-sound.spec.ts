import { test, expect } from '@playwright/test';

test.use({ viewport: { width: 1280, height: 900 } });

// The keys come in a few presets. Picking one is a preference of the player's,
// not part of the song: it is silent — the next note played is the new
// preset's — and it is still chosen after a reload.
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

  const started = (page: import('@playwright/test').Page) =>
    page.evaluate(() => (window as unknown as { __starts: number[] }).__starts.splice(0));
  // Tap the tonic chord on the circle tab, and collect what it started.
  const playChord = async (page: import('@playwright/test').Page) => {
    await page.getByTestId('desktop-tabs').getByRole('tab', { name: 'circle' }).click();
    await page.getByRole('button', { name: 'I C', exact: false }).first().click();
    await expect.poll(() => page.evaluate(() => (window as unknown as { __starts: number[] }).__starts.length)).toBeGreaterThan(0);
    const lengths = await started(page);
    await page.getByTestId('desktop-tabs').getByRole('tab', { name: 'chords' }).click();
    return lengths;
  };

  test('choosing a preset makes no sound of its own, and is remembered after a reload', async ({ page }) => {
    await page.getByTestId('keys-reed').click();
    await expect(page.getByTestId('keys-reed')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByTestId('keys-suitcase')).toHaveAttribute('aria-pressed', 'false');
    // Nothing is auditioned: a chord sounded over a playing loop was a jump in
    // level every time a preset was tried.
    await page.waitForTimeout(400);
    expect(await started(page)).toEqual([]);

    await page.reload();
    await page.getByTestId('desktop-tabs').getByRole('tab', { name: 'chords' }).click();
    await expect(page.getByTestId('keys-reed')).toHaveAttribute('aria-pressed', 'true');
  });

  test('a different preset plays different notes', async ({ page }) => {
    // The same chord through two presets: the reed's notes ring shorter than
    // the stage's, so the buffers that start are not the same length.
    await page.getByTestId('keys-stage').click();
    const stage = await playChord(page);
    await page.getByTestId('keys-reed').click();
    const reed = await playChord(page);
    expect(Math.min(...reed)).toBeLessThan(Math.min(...stage));
  });
});
