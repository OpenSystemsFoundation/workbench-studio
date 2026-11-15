import { test, expect } from '@playwright/test';

test.use({ viewport: { width: 1280, height: 900 } });

test.describe('metronome tab', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('Workbench Studio')).toBeVisible();
    await page.getByTestId('desktop-tabs').getByRole('tab', { name: 'metronome' }).click();
    await expect(page.getByTestId('metronome-transport')).toBeVisible();
  });

  test('keeps the click in view and puts the rest in sections', async ({ page }) => {
    await expect(page.getByTestId('metronome-bpm')).toHaveText('120');
    await expect(page.getByTestId('metronome-sound')).toBeVisible();
    // the session goal and the log open first
    await expect(page.getByTestId('metronome-goal')).toBeVisible();
    await expect(page.getByTestId('metronome-history')).toBeVisible();

    await page.getByTestId('metronome-tab-trainer').click();
    await expect(page.getByTestId('metronome-automation')).toBeVisible();
    await expect(page.getByTestId('metronome-goal')).toHaveCount(0);
    await page.getByTestId('metronome-tab-drone').click();
    await expect(page.getByTestId('metronome-drone')).toBeVisible();
    await page.getByTestId('metronome-tab-mic').click();
    await expect(page.getByTestId('metronome-mic')).toBeVisible();
    // the click never leaves
    await expect(page.getByTestId('metronome-play')).toBeVisible();

    // the open section is remembered
    await page.reload();
    await page.getByTestId('desktop-tabs').getByRole('tab', { name: 'metronome' }).click();
    await expect(page.getByTestId('metronome-mic')).toBeVisible();
  });

  test('type a tempo into the big number, or nudge it from the keyboard', async ({ page }) => {
    await page.getByTestId('metronome-bpm').click();
    await page.getByLabel('Type a tempo').fill('96');
    await page.keyboard.press('Enter');
    await expect(page.getByTestId('metronome-bpm')).toHaveText('96');
    await expect(page.getByTestId('metronome-transport')).toContainText('Andante');

    await page.getByTestId('metronome-transport').getByText('Practice click').click(); // focus off the field
    await page.keyboard.press('ArrowUp');
    await expect(page.getByTestId('metronome-bpm')).toHaveText('97');
    await page.keyboard.press('Shift+ArrowDown');
    await expect(page.getByTestId('metronome-bpm')).toHaveText('92');
  });

  test('time signature chips set the meter and the beat display', async ({ page }) => {
    const sound = page.getByTestId('metronome-sound');
    const beats = page.getByTestId('metronome-transport').getByRole('img');
    await expect(beats).toHaveAttribute('aria-label', '4 beats per bar');
    await sound.getByRole('button', { name: '6/8' }).click();
    await expect(beats).toHaveAttribute('aria-label', '6 beats per bar');
    await expect(page.getByTestId('metronome-transport')).toContainText('6/8');
    // anything else is one step away
    await sound.getByRole('button', { name: 'Other' }).click();
    await sound.getByLabel('Beats per bar').fill('11');
    await expect(beats).toHaveAttribute('aria-label', '11 beats per bar');
  });

  test('whatever is switched on shows under the click and jumps to its section', async ({ page }) => {
    await page.getByTestId('metronome-tab-trainer').click();
    await page.getByRole('tab', { name: 'Ramp / bars' }).click();
    await page.getByTestId('metronome-tab-mic').click();
    const active = page.getByTestId('metronome-active');
    await expect(active).toContainText('Ramp 80→140 over 32 bars');
    await active.getByRole('button', { name: /Ramp/ }).click();
    await expect(page.getByTestId('metronome-automation')).toBeVisible();
  });

  test('nudge buttons change the tempo', async ({ page }) => {
    await page.getByRole('button', { name: '+5' }).click();
    await expect(page.getByTestId('metronome-bpm')).toHaveText('125');
    await page.getByRole('button', { name: '−1' }).click();
    await expect(page.getByTestId('metronome-bpm')).toHaveText('124');
  });

  test('automation modes reveal their settings', async ({ page }) => {
    await page.getByTestId('metronome-tab-trainer').click();
    const auto = page.getByTestId('metronome-automation');
    await auto.getByRole('tab', { name: 'Step' }).click();
    await expect(auto.getByLabel('Start BPM')).toBeVisible();
    await expect(auto.getByLabel('Every (bars)')).toBeVisible();

    await auto.getByRole('tab', { name: 'Ramp / time' }).click();
    await expect(auto.getByLabel('Over (seconds)')).toBeVisible();

    await auto.getByRole('tab', { name: 'Ramp / bars' }).click();
    await expect(auto.getByLabel('Over (bars)')).toBeVisible();

    // gap-click trainer settings appear once enabled
    await auto.getByRole('button', { name: 'Toggle gap-click trainer' }).click();
    await expect(auto.getByLabel('Play (bars)')).toBeVisible();
    await auto.getByRole('tab', { name: 'Random' }).click();
    await expect(auto.getByLabel(/Mute chance/)).toBeVisible();
  });

  test('tempo sync copies BPM between the studio transport and the click', async ({ page }) => {
    // studio default is 104 — pull it into the click
    await expect(page.getByText('Studio tempo 104')).toBeVisible();
    await page.getByTestId('metronome-sync-from').click();
    await expect(page.getByTestId('metronome-bpm')).toHaveText('104');

    // push a new click tempo back to the studio
    await page.locator('input[aria-label="Tempo in beats per minute"]').fill('132');
    await page.getByTestId('metronome-sync-to').click();
    await expect(page.getByText('Studio tempo 132')).toBeVisible();
    // the drums groovebox shows the shared transport tempo
    await page.getByTestId('desktop-tabs').getByRole('tab', { name: 'drums' }).click();
    await expect(page.getByTestId('studio-bpm')).toHaveText('132');
  });

  test('link toggle keeps click and studio tempo together, and pauses for drills', async ({ page }) => {
    await page.getByTestId('metronome-link').click();
    await expect(page.getByTestId('metronome-bpm')).toHaveText('104');
    // click -> studio
    await page.locator('input[aria-label="Tempo in beats per minute"]').fill('132');
    await expect(page.getByText('Studio tempo 132')).toBeVisible();
    // studio -> click
    await page.getByTestId('desktop-tabs').getByRole('tab', { name: 'drums' }).click();
    await page.locator('input[aria-label="studio tempo"]').fill('90');
    await page.getByTestId('desktop-tabs').getByRole('tab', { name: 'metronome' }).click();
    await expect(page.getByTestId('metronome-bpm')).toHaveText('90');
    // a ramp drill pauses the link
    await page.getByTestId('metronome-tab-trainer').click();
    await page.getByRole('tab', { name: 'Ramp / time' }).click();
    await expect(page.getByTestId('metronome-link')).toContainText('paused');
  });

  test('goal by bars shows a target and progress readout', async ({ page }) => {
    const goal = page.getByTestId('metronome-goal');
    await goal.getByRole('tab', { name: 'By bars' }).click();
    await expect(goal.getByLabel('Target — bars to play')).toHaveValue('32');
    await expect(goal.getByText('32 bars left')).toBeVisible();
  });

  test('start runs the click and counts bars; stop logs the session', async ({ page }) => {
    // fast tempo so a bar completes quickly (4 beats at 300 BPM = 0.8 s)
    const bpm = page.getByTestId('metronome-bpm');
    await page.locator('input[aria-label="Tempo in beats per minute"]').fill('300');
    await expect(bpm).toHaveText('300');

    await page.getByTestId('metronome-play').click();
    await expect(page.getByTestId('metronome-play')).toHaveText(/STOP/);
    await expect(page.getByTestId('metronome-bars')).not.toHaveText('0', { timeout: 5000 });

    // let it run past the 1 s session-save threshold, then stop
    await page.waitForTimeout(1200);
    await page.getByTestId('metronome-play').click();
    await expect(page.getByTestId('metronome-play')).toHaveText(/START/);
    await expect(page.getByTestId('metronome-history').getByText(/\d+ bars/).first()).toBeVisible();
  });

  test('the click keeps running while browsing other tabs', async ({ page }) => {
    await page.locator('input[aria-label="Tempo in beats per minute"]').fill('300');
    await page.getByTestId('metronome-play').click();
    await expect(page.getByTestId('metronome-play')).toHaveText(/STOP/);

    const tabs = page.getByTestId('desktop-tabs');
    await tabs.getByRole('tab', { name: 'circle' }).click();
    await expect(page.getByText('CIRCLE OF 5THS')).toBeVisible();
    await page.waitForTimeout(1000);
    await tabs.getByRole('tab', { name: 'metronome' }).click();

    await expect(page.getByTestId('metronome-play')).toHaveText(/STOP/);
    await expect(page.getByTestId('metronome-bars')).not.toHaveText('0');
    await page.getByTestId('metronome-play').click();
  });
});
