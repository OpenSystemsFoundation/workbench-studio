// A plucked string, from the physics rather than from a recording.
//
// A string fixed at both ends and released from a pluck rings as a sum of
// modes, and every number in that sum falls out of the instrument:
//
//   · mode k sits at k·f0·√(1 + B·k²): stiffness (B) stretches the upper modes
//     a little sharp of the harmonic series, which is the faint "wire" in a
//     real string that a pure sawtooth lacks;
//   · where you pluck sets how strongly each mode is excited — sin(kπp)/k² —
//     so plucking a fifth of the way along silences every fifth harmonic;
//   · a magnetic pickup hears string velocity (another factor of k) and only
//     the modes that move over it — sin(kπq) — the comb that makes a neck
//     pickup round and a bridge pickup nasal;
//   · each mode loses energy at its own rate, the high ones fastest, so a note
//     starts bright and mellows as it rings, instead of fading like a tape.
//
// That closed form is rendered directly (see `addPartial`), so every note is
// exactly in tune and has no aliasing: modes above the audible band are simply
// not summed.

import { Biquad, addPartial, fadeOut, midiToHz, normalize, rng, whiteNoise } from './dsp';

export interface StringModel {
  /** open-string pitches, low to high — a fretted note is placed on one of them */
  open: readonly number[];
  /** stiffness of an open string (the B in √(1 + B·k²)) */
  inharmonicity: number;
  /** where the finger or pick releases the string, as a fraction of the open length from the bridge */
  pluck: number;
  /** where the pickup sits, the same way */
  pickup: number;
  /** seconds for the fundamental of the lowest string to fall 60 dB */
  t60: number;
  /** extra decay per second for every kHz² of a mode's frequency — the string's own treble loss */
  damping: number;
  /** tone-control roll-off in Hz */
  tone: number;
  /** how round the plucking surface is: a fingertip is a low-pass, a pick barely one */
  soft: number;
  /** level and colour of the finger/pick noise at the attack */
  noise: { level: number; freq: number; seconds: number };
  /** soft saturation into the amp — 0 is clean */
  drive: number;
  /** seconds the string takes to leave the finger or pick: the hardness of the attack */
  rise: number;
  /** length of the rendered note */
  seconds: number;
}

/** A fingerstyle electric bass on its neck-side pickup: round, with a clear fundamental. */
export const BASS: StringModel = {
  open: [28, 33, 38, 43],
  inharmonicity: 1.1e-4,
  pluck: 0.2,
  pickup: 0.17,
  t60: 9,
  damping: 1.1,
  tone: 2600,
  soft: 2200,
  noise: { level: 0.035, freq: 900, seconds: 0.012 },
  drive: 0.9,
  rise: 0.003,
  seconds: 3.2,
};

/** A clean electric guitar, picked, between the neck and middle positions. */
export const GUITAR: StringModel = {
  open: [40, 45, 50, 55, 59, 64],
  inharmonicity: 3.5e-5,
  pluck: 0.13,
  pickup: 0.24,
  t60: 6.5,
  damping: 0.42,
  tone: 5200,
  soft: 7500,
  noise: { level: 0.05, freq: 2600, seconds: 0.006 },
  drive: 0.35,
  rise: 0.0012,
  seconds: 3,
};

/** How many frets up its string a note is played: the lowest position that reaches it. */
export function fretOf(model: StringModel, midi: number): number {
  let fret = midi - model.open[0];
  for (const o of model.open) if (midi >= o) fret = midi - o;
  return Math.max(0, fret);
}

/** One note of a plucked string, peak-normalised, ending on exact silence. */
export function renderString(model: StringModel, midi: number, sampleRate: number): Float32Array {
  const n = Math.floor(model.seconds * sampleRate);
  const sum = new Float64Array(n);
  const f0 = midiToHz(midi);

  // Fretting shortens the string, so the fixed pluck point and pickup sit
  // proportionally further along what is left of it — why the same bass
  // sounds rounder and hollower the higher up the neck it is played.
  const stretch = Math.pow(2, fretOf(model, midi) / 12);
  const p = Math.min(0.5, model.pluck * stretch);
  const q = Math.min(0.5, model.pickup * stretch);
  const B = model.inharmonicity * stretch * stretch;

  // Higher notes ring shorter: less mass, same losses.
  const lowest = midiToHz(model.open[0]);
  const base = Math.log(1000) / (model.t60 * Math.pow(lowest / f0, 0.6));
  const top = Math.min(sampleRate * 0.45, 16000);

  const modes: Array<{ f: number; amp: number; rate: number }> = [];
  let loudest = 0;
  for (let k = 1; k < 600; k++) {
    const f = k * f0 * Math.sqrt(1 + B * k * k);
    if (f > top) break;
    const excite = Math.sin(k * Math.PI * p) / k;        // pluck shape × velocity pickup
    const comb = Math.sin(k * Math.PI * q);              // pickup position
    const tone = 1 / Math.sqrt(1 + Math.pow(f / model.tone, 4));
    const soft = 1 / (1 + (f / model.soft) * (f / model.soft));
    const khz = f / 1000;
    const amp = excite * comb * tone * soft;
    modes.push({ f, amp, rate: base + model.damping * khz * khz + 0.35 * khz });
    loudest = Math.max(loudest, Math.abs(amp));
  }
  // Each mode is followed down to 80 dB below the loudest one and no further,
  // and one that starts out below 70 dB is not worth summing at all.
  for (const m of modes) {
    if (Math.abs(m.amp) > loudest * 3e-4) addPartial(sum, sampleRate, m.f, m.amp / loudest, m.rate, 1e-4);
  }
  const out = normalize(Float32Array.from(sum));

  // The finger leaving the string: a few milliseconds of band-limited noise,
  // low enough to be felt as an attack rather than heard as a sound.
  const nz = model.noise;
  const len = Math.min(n, Math.floor(nz.seconds * 4 * sampleRate));
  const burst = new Biquad('bandpass', nz.freq, 0.8, sampleRate).run(whiteNoise(len, rng(midi * 7919 + 13)));
  for (let i = 0; i < len; i++) {
    const t = i / sampleRate;
    out[i] += burst[i] * nz.level * (t / (t + 0.0006)) * Math.exp(-t / nz.seconds);
  }

  // The release itself takes a moment — a string let go is not a step.
  const rise = Math.floor(model.rise * sampleRate);
  for (let i = 0; i < rise; i++) out[i] *= 0.5 - 0.5 * Math.cos((Math.PI * i) / rise);

  if (model.drive > 0) {
    const k = 1 + model.drive;
    for (let i = 0; i < n; i++) out[i] = Math.tanh(k * out[i]);
  }
  // A long fade rather than a short one: the low strings are still ringing when
  // the buffer runs out, and a note held that long should die away, not stop.
  return normalize(fadeOut(out, Math.floor(0.6 * sampleRate)));
}
