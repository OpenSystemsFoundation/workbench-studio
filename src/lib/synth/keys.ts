// An electric piano, modelled the way the instrument makes its sound.
//
// A hammer strikes a tine — a stiff steel rod — which then swings almost as a
// pure sine, slowly dying away. On its own that is a dull tone. What gives the
// instrument its voice is the pickup: a magnet the tine swings past, whose
// field is strongly non-linear in the tine's position. A hard strike swings
// the tine right across the pole, and the pickup folds that motion into a
// bright, barking attack; as the swing dies down it stays in the gentle part
// of the field and the tone relaxes into a bell-like hum. The timbre follows
// the loudness with no filter envelope at all, because that is the physics.
//
// The model is exactly that: tine motion → field shape → induced voltage (the
// rate of change of the field), plus the tine's own short-lived overtones for
// the chime at the start of the note and a soft hammer thump.

import { Biquad, TAU, addPartial, fadeOut, midiToHz, normalize, rng } from './dsp';

/** Seconds of the slow part of a note's decay: long in the bass, short up top. */
export function keysDecay(midi: number): number {
  return 2.4 * Math.pow(2, -(midi - 48) / 26);
}

/** One electric-piano note, peak-normalised, ending on exact silence. */
export function renderKeys(midi: number, sampleRate: number): Float32Array {
  const sr = sampleRate;
  const f = midiToHz(midi);
  const slow = keysDecay(midi);
  const fast = slow * 0.16;
  const seconds = Math.min(4, Math.max(1.2, slow * 2.4));
  const n = Math.floor(seconds * sr);
  const out = new Float32Array(n);

  // Voicing across the keyboard: the bass barks, the top chimes. Easing the
  // swing off towards the top also keeps what the pickup generates inside the
  // audible band — its harmonics fall away geometrically, and by the highest
  // notes there are too few of them below the Nyquist limit to spare any.
  const high = Math.min(1, Math.max(0, (midi - 60) / 36));
  const depth = 1.0 - 0.4 * high;     // how far across the pole the tine swings
  const offset = 0.55 + 0.15 * high;  // how far off the pole's axis it rests

  // A cantilevered rod's overtones are not harmonics: they sit at 6.27× and
  // 17.55× the fundamental, and ring for only a few hundredths of a second.
  const chime = new Float32Array(Math.min(n, Math.floor(0.4 * sr)));
  if (f * 6.27 < 15000) addPartial(chime, sr, f * 6.27, 0.1, 1 / 0.045);
  if (f * 17.55 < 15000) addPartial(chime, sr, f * 17.55, 0.035, 1 / 0.018);

  // The tine itself: a sine under a two-stage decay, advanced by rotation
  // rather than by calling sin() and exp() a few hundred thousand times.
  const w = (TAU * f) / sr;
  const cw = Math.cos(w);
  const sw = Math.sin(w);
  let s = 0;
  let c = 1;
  let eFast = 0.5;
  let eSlow = 0.5;
  const kFast = Math.exp(-1 / (fast * sr));
  const kSlow = Math.exp(-1 / (slow * sr));
  const scale = 1 / w; // differentiation gains 6 dB/octave — undo it at the fundamental
  let prev = 1 / (1 + offset * offset);
  for (let i = 0; i < n; i++) {
    const x = (eFast + eSlow) * s + (i < chime.length ? chime[i] : 0);
    const u = offset + depth * x;
    const y = 1 / (1 + u * u);       // the pickup's field at the tine's position…
    out[i] = (y - prev) * scale;     // …and the voltage is how fast that changes
    prev = y;
    const s2 = s * cw + c * sw;
    c = c * cw - s * sw;
    s = s2;
    eFast *= kFast;
    eSlow *= kSlow;
  }

  // The hammer: a thump, not a click.
  const rand = rng(midi * 104729 + 7);
  const thump = new Biquad('lowpass', 700 + f, 0, sr);
  const len = Math.min(n, Math.floor(0.04 * sr));
  for (let i = 0; i < len; i++) {
    out[i] += thump.step(rand() * 2 - 1) * 0.05 * Math.exp(-i / (0.006 * sr));
  }

  // A hammer is felt, and stays on the tine for a couple of milliseconds: the
  // note speaks quickly but does not begin on a step.
  const rise = Math.floor(0.0025 * sr);
  for (let i = 0; i < rise; i++) out[i] *= 0.5 - 0.5 * Math.cos((Math.PI * i) / rise);

  // The amp and cabinet: nothing below the instrument's range, a gentle top.
  new Biquad('highpass', 45, 0, sr).run(out);
  new Biquad('lowpass', 6500, 0, sr).run(out);
  return normalize(fadeOut(out, Math.floor(Math.min(0.9, seconds * 0.3) * sr)));
}
