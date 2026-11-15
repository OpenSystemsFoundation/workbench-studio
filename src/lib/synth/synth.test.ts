import { describe, it, expect } from 'vitest';
import { DRUM_VOICES } from '../engine/kit';
import { inRange, renderNote, zoneRoot, type Instrument } from './bank';
import { addPartial, midiToHz, peak } from './dsp';
import { drumSeconds, drumVaries, renderDrum } from './drumkit';
import { roomImpulse } from './room';
import { BASS, GUITAR, fretOf } from './strings';

const SR = 48000;

/** Strength of one frequency in a stretch of signal (a single windowed DFT bin). */
function strength(d: Float32Array, freq: number, from = 0.05, seconds = 1): number {
  const n = Math.min(d.length - Math.floor(from * SR), Math.floor(seconds * SR));
  const off = Math.floor(from * SR);
  let re = 0;
  let im = 0;
  for (let i = 0; i < n; i++) {
    const w = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / n);
    const ph = (2 * Math.PI * freq * i) / SR;
    re += d[off + i] * w * Math.cos(ph);
    im += d[off + i] * w * Math.sin(ph);
  }
  return Math.hypot(re, im) / n;
}

/** How far, in cents, the strongest frequency near `freq` is from it. */
function centsOff(d: Float32Array, freq: number): number {
  let best = -1;
  let at = 0;
  for (let c = -30; c <= 30; c += 1) {
    const m = strength(d, freq * Math.pow(2, c / 1200));
    if (m > best) { best = m; at = c; }
  }
  return at;
}

function rms(d: Float32Array, from: number, to: number): number {
  let e = 0;
  const a = Math.floor(from * SR);
  const b = Math.min(d.length, Math.floor(to * SR));
  for (let i = a; i < b; i++) e += d[i] * d[i];
  return Math.sqrt(e / Math.max(1, b - a));
}

const finite = (d: Float32Array) => d.every((v) => Number.isFinite(v));

/** Sample-for-sample equality, without asking the matcher to diff 150,000 numbers. */
function same(a: Float32Array, b: Float32Array): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}

describe('a decaying partial', () => {
  it('is the sine it claims to be: right frequency, right decay, starting from zero', () => {
    const out = new Float32Array(SR);
    addPartial(out, SR, 440, 0.5, 3);
    expect(out[0]).toBe(0);
    for (const i of [100, 4800, 24000]) {
      const t = i / SR;
      expect(out[i]).toBeCloseTo(0.5 * Math.exp(-3 * t) * Math.sin(2 * Math.PI * 440 * t), 4);
    }
  });

  it('refuses a frequency that could not be represented, rather than aliasing it', () => {
    const out = new Float32Array(1000);
    addPartial(out, SR, SR * 0.6, 1, 1);
    expect(peak(out)).toBe(0);
  });
});

describe('the pitched instruments', () => {
  const cases: Array<[Instrument, number[]]> = [
    ['keys', [37, 49, 61, 73, 85]],
    ['bass', [28, 34, 43, 52]],
    ['guitar', [40, 52, 64, 76]],
  ];

  for (const [inst, midis] of cases) {
    it(`${inst}: every note is in tune, full-scale, finite, and ends on silence`, () => {
      for (const m of midis) {
        const d = renderNote(inst, m, SR);
        expect(finite(d), `${inst} ${m} finite`).toBe(true);
        expect(peak(d), `${inst} ${m} peak`).toBeCloseTo(1, 5);
        expect(Math.abs(d[d.length - 1]), `${inst} ${m} last sample`).toBe(0);
        expect(Math.abs(centsOff(d, midiToHz(m))), `${inst} ${m} tuning`).toBeLessThanOrEqual(2);
      }
    });

    it(`${inst}: a note starts without a step and dies away as it rings`, () => {
      for (const m of midis) {
        const d = renderNote(inst, m, SR);
        // the first sample is silence, and the first tenth of a millisecond stays small
        expect(d[0]).toBe(0);
        expect(Math.abs(d[4]), `${inst} ${m} onset`).toBeLessThan(0.05);
        expect(rms(d, 1.2, 1.4), `${inst} ${m} decays`).toBeLessThan(rms(d, 0.05, 0.25));
      }
    });
  }

  it('gets mellower as it rings: the upper harmonics die before the fundamental', () => {
    for (const [inst, m] of [['keys', 49], ['bass', 31], ['guitar', 52]] as const) {
      const d = renderNote(inst, m, SR);
      const f = midiToHz(m);
      const tilt = (from: number) => strength(d, f * 6, from, 0.2) / strength(d, f, from, 0.2);
      expect(tilt(1.2), `${inst} ${m}`).toBeLessThan(tilt(0.03));
    }
  });

  it('renders the same note the same way every time', () => {
    expect(same(renderNote('bass', 40, SR), renderNote('bass', 40, SR))).toBe(true);
    expect(same(renderNote('keys', 60, SR), renderNote('keys', 60, SR))).toBe(true);
  });

  it('holds its tuning at other sample rates', () => {
    for (const rate of [24000, 44100]) {
      const d = renderNote('bass', 33, rate);
      // measured against the rate it was rendered at
      const n = Math.floor(rate);
      let best = -1;
      let at = 0;
      for (let c = -30; c <= 30; c++) {
        const f = midiToHz(33) * Math.pow(2, c / 1200);
        let re = 0;
        let im = 0;
        for (let i = 0; i < n; i++) {
          const w = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / n);
          re += d[2000 + i] * w * Math.cos((2 * Math.PI * f * i) / rate);
          im += d[2000 + i] * w * Math.sin((2 * Math.PI * f * i) / rate);
        }
        if (Math.hypot(re, im) > best) { best = Math.hypot(re, im); at = c; }
      }
      expect(Math.abs(at), `${rate} Hz`).toBeLessThanOrEqual(2);
    }
  });
});

describe('placing a note on the neck', () => {
  it('plays each note on the highest string that reaches it', () => {
    expect(fretOf(BASS, 28)).toBe(0);  // open E
    expect(fretOf(BASS, 32)).toBe(4);  // G# on the E string
    expect(fretOf(BASS, 33)).toBe(0);  // open A
    expect(fretOf(BASS, 50)).toBe(7);  // up the G string
    expect(fretOf(GUITAR, 64)).toBe(0); // open top E
    expect(fretOf(GUITAR, 20)).toBe(0); // below the instrument: treated as open
  });
});

describe('mapping pitches onto rendered notes', () => {
  it('never re-pitches a rendered note by more than a semitone', () => {
    for (let m = 20; m <= 108; m++) {
      const root = zoneRoot(m);
      expect(Math.abs(m - root), `midi ${m}`).toBeLessThanOrEqual(1);
      expect(zoneRoot(root)).toBe(root);
    }
  });

  it('folds a pitch outside an instrument into its range by octaves', () => {
    for (const inst of ['keys', 'bass', 'guitar'] as const) {
      for (const m of [0, 12, 60, 110, 127]) {
        const r = inRange(inst, m);
        expect((r - m) % 12 === 0, `${inst} ${m} → ${r}`).toBe(true);
      }
    }
    expect(inRange('bass', 40)).toBe(40);
  });
});

describe('the drum kit', () => {
  it('renders every voice: finite, audible, inside full scale, ending on silence', () => {
    DRUM_VOICES.forEach((v) => {
      const d = renderDrum(v.synth, SR, 1);
      expect(d.length, v.id).toBe(Math.ceil(drumSeconds(v.synth) * SR));
      expect(finite(d), v.id).toBe(true);
      expect(peak(d), `${v.id} audible`).toBeGreaterThan(0.05);
      expect(peak(d), `${v.id} headroom`).toBeLessThan(1);
      expect(Math.abs(d[d.length - 1]), `${v.id} last sample`).toBeLessThan(1e-4);
      expect(Math.abs(d[0]), `${v.id} first sample`).toBeLessThan(0.01);
    });
  });

  it('strikes a noisy voice differently each time, and a pure tone identically', () => {
    DRUM_VOICES.forEach((v) => {
      const a = renderDrum(v.synth, SR, 1);
      const b = renderDrum(v.synth, SR, 2);
      let diff = 0;
      for (let i = 0; i < a.length; i++) diff += Math.abs(a[i] - b[i]);
      if (drumVaries(v.synth)) expect(diff, v.id).toBeGreaterThan(0);
      else expect(diff, v.id).toBe(0);
      // …but the same strike is the same strike
      expect(same(renderDrum(v.synth, SR, 1), a), v.id).toBe(true);
    });
  });

  it('keeps a voice as loud across strikes, so round-robin never reads as an accent', () => {
    DRUM_VOICES.filter((v) => drumVaries(v.synth)).forEach((v) => {
      const levels = [1, 2, 3].map((seed) => rms(renderDrum(v.synth, SR, seed), 0, 2));
      const spread = Math.max(...levels) / Math.min(...levels);
      expect(spread, v.id).toBeLessThan(1.25);
    });
  });

  it('gives the kick harmonics a small speaker can reproduce', () => {
    const kick = DRUM_VOICES.find((v) => v.id === 'kick')!;
    const d = renderDrum(kick.synth, SR, 1);
    // energy between 150 and 600 Hz in the first 60 ms, against the sub below it
    let mids = 0;
    for (let f = 150; f <= 600; f += 25) mids += strength(d, f, 0, 0.06) ** 2;
    let sub = 0;
    for (let f = 40; f < 150; f += 25) sub += strength(d, f, 0, 0.06) ** 2;
    expect(mids / sub).toBeGreaterThan(0.05);
  });
});

describe('the room', () => {
  const [l, r] = roomImpulse(SR, { seconds: 1 });
  const energy = (d: Float32Array, from = 0, to = d.length) => {
    let e = 0;
    for (let i = from; i < to; i++) e += d[i] * d[i];
    return e;
  };

  it('has unit energy in each ear, so a send level means what it says', () => {
    expect(energy(l)).toBeCloseTo(1, 3);
    expect(energy(r)).toBeCloseTo(1, 3);
    expect(finite(l) && finite(r)).toBe(true);
  });

  it('starts after a gap and ends on silence', () => {
    expect(peak(l.subarray(0, Math.floor(0.008 * SR)))).toBeLessThan(1e-3);
    expect(Math.abs(l[l.length - 1])).toBe(0);
  });

  it('decays about 60 dB over its stated time', () => {
    const win = Math.floor(0.1 * SR);
    const early = energy(l, Math.floor(0.1 * SR), Math.floor(0.1 * SR) + win);
    const late = energy(l, Math.floor(0.6 * SR), Math.floor(0.6 * SR) + win);
    // half a second of a one-second room is 30 dB
    const db = 10 * Math.log10(early / late);
    expect(db).toBeGreaterThan(24);
    expect(db).toBeLessThan(40);
  });

  it('is different in each ear — that is where the width comes from', () => {
    let dot = 0;
    for (let i = 0; i < l.length; i++) dot += l[i] * r[i];
    expect(Math.abs(dot)).toBeLessThan(0.2);
  });

  it('is the same room every time', () => {
    expect(same(roomImpulse(SR, { seconds: 1 })[0], l)).toBe(true);
  });
});
