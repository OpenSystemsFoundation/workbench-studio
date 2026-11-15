import { test, expect } from '@playwright/test';

test.use({ viewport: { width: 1280, height: 900 } });

// What the band sounds like is a matter for ears, but some of it is arithmetic,
// and these tests hold the arithmetic still: the mix has headroom, it is in
// stereo, and everything leaves through the one master bus.

test.describe('the sound engine', () => {
  // The real engine, played into an offline context: four bars of a full band
  // — six-note chords, a busy bass line and the kit — rendered to a buffer and
  // measured. A change to a level, a recipe or a model that pushes the mix into
  // the safety clamp shows up here as a number rather than as a crackle.
  test('a full band leaves headroom and fills the stereo field', async ({ page }) => {
    await page.goto('/');
    const m = await page.evaluate(`(async () => {
      const SR = 48000;
      const off = new OfflineAudioContext(2, SR * 10, SR);
      const { AudioEngine } = await import('/src/lib/audio.ts');
      const eng = new AudioEngine(off);
      const step = 60 / 104 / 4, bar = step * 16;
      const chords = [[38, 50, 53, 57, 60, 64], [43, 53, 59, 64, 69], [36, 52, 55, 59, 62], [45, 55, 61, 64, 67]];
      const roots = [38, 31, 36, 33];
      for (let b = 0; b < 4; b++) {
        const at = 0.1 + b * bar;
        eng.playMidis(chords[b], bar * 0.97, 0.02, at, 'keys');
        [[0, 0, 3], [4, 7, 1.6], [6, 12, 1.6], [8, 0, 3], [11, 10, 1.2], [12, 7, 2], [14, 5, 1.6]]
          .forEach(([s, iv, len]) => eng.playMidis([roots[b] + iv], len * step, 0, at + s * step, 'bass'));
        eng.ghost(roots[b], at + 10 * step);
        const hits = [];
        for (let s = 0; s < 16; s += 2) hits.push({ v: 'chat', at: s * step, vel: s % 4 ? 0.6 : 1 });
        [0, 7, 10].forEach((s) => hits.push({ v: 'kick', at: s * step, vel: 1 }));
        [4, 12].forEach((s) => hits.push({ v: 'snare', at: s * step, vel: 1 }));
        hits.push({ v: 'ohat', at: 14 * step, vel: 0.8 }, { v: 'ride', at: 0, vel: 0.8 }, { v: 'clap', at: 12 * step, vel: 0.8 });
        eng.playDrums(hits, at);
      }
      const buf = await off.startRendering();
      const L = buf.getChannelData(0), R = buf.getChannelData(1);
      let peak = 0, over = 0, energy = 0, side = 0, bad = 0;
      for (let i = 0; i < L.length; i++) {
        if (!Number.isFinite(L[i]) || !Number.isFinite(R[i])) bad++;
        const a = Math.max(Math.abs(L[i]), Math.abs(R[i]));
        if (a > peak) peak = a;
        if (a > 0.8) over++;
        energy += (L[i] * L[i] + R[i] * R[i]) / 2;
        side += (L[i] - R[i]) * (L[i] - R[i]) / 4;
      }
      // the room: what is left a quarter of a second after the last note is let go
      let tail = 0;
      const from = Math.floor((0.1 + 4 * bar + 0.25) * SR);
      for (let i = from; i < from + SR / 10; i++) tail += L[i] * L[i];
      return { peak, over: over / L.length, rms: Math.sqrt(energy / L.length), side: Math.sqrt(side / L.length), tail: Math.sqrt(tail / (SR / 10)), bad };
    })()`) as { peak: number; over: number; rms: number; side: number; tail: number; bad: number };

    expect(m.bad, 'every sample is a number').toBe(0);
    // loud enough to be a mix…
    expect(m.rms, 'overall level').toBeGreaterThan(0.1);
    // …with its peaks under full scale, and all but a handful of samples in
    // the part of the clamp that changes nothing at all
    expect(m.peak, 'peak').toBeLessThan(0.97);
    expect(m.over, 'share of samples above the clamp knee').toBeLessThan(0.0005);
    // the two channels differ: the kit is spread out, the keys are, and the room is
    expect(m.side / m.rms, 'stereo width').toBeGreaterThan(0.08);
    // there is a room, and it is a room rather than a wash
    expect(m.tail, 'reverb tail').toBeGreaterThan(0.0005);
    expect(m.tail, 'reverb tail').toBeLessThan(0.05);
  });

  // Each part used to guard its own output and connect to the speakers on its
  // own, so nothing watched the sum. Now there is one node allowed to reach
  // the destination, and the band, the click and the drone all pass through it.
  test('the band, the click and the drone all leave through one master bus', async ({ page }) => {
    await page.addInitScript(() => {
      const direct: string[] = [];
      (window as unknown as { __direct: string[] }).__direct = direct;
      const connect = AudioNode.prototype.connect;
      AudioNode.prototype.connect = function (this: AudioNode, ...a: unknown[]) {
        if (a[0] instanceof AudioDestinationNode) direct.push(this.constructor.name);
        return (connect as (...x: unknown[]) => unknown).apply(this, a);
      } as typeof AudioNode.prototype.connect;
    });
    await page.goto('/');
    await page.getByTestId('studio-play').click();                  // the band
    await page.getByTestId('desktop-tabs').getByRole('tab', { name: 'metronome' }).click();
    await page.getByTestId('metronome-drone-toggle').click();       // the drone
    await expect(page.getByTestId('metronome-drone-toggle')).toHaveText(/Stop drone/);
    await page.getByTestId('metronome-play').click();               // the click
    await page.waitForTimeout(600);

    const direct = await page.evaluate(() => (window as unknown as { __direct: string[] }).__direct);
    expect(direct).toEqual(['WaveShaperNode']);
  });
});
