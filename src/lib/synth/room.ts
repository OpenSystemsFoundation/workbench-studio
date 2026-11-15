// The room the band plays in: a stereo impulse response, generated.
//
// Dry synthesis sounds like it is happening inside the speaker. A little shared
// room puts every part in the same space, and gives the stereo field something
// to carry even when every source is mono. The response is built the way a room
// behaves rather than as a block of fading noise:
//
//   · a short gap, then a handful of discrete early reflections — different in
//     each ear, which is where the sense of width comes from;
//   · a diffuse tail that builds in behind them and decays exponentially, as
//     real reverberation does (a tail that falls in a straight line or a
//     power curve sounds gated);
//   · treble that dies faster than the mids, because air and walls absorb it —
//     the tail darkens as it fades instead of hissing;
//   · nothing below the low mids, so it never muddies the kick and the bass.

import { Biquad, rng } from './dsp';

export interface RoomSpec {
  /** seconds for the tail to fall 60 dB */
  seconds: number;
  /** gap before the first reflection, in seconds */
  predelay?: number;
  /** where the tail's treble roll-off starts and ends, in Hz */
  bright?: number;
  dark?: number;
  /** low cut in Hz */
  lowCut?: number;
  seed?: number;
}

/**
 * A stereo room impulse response, each channel scaled to unit energy — so a
 * send level means the same thing whatever the room's length, and the node
 * that plays it is used with its own normalisation switched off.
 */
export function roomImpulse(sampleRate: number, spec: RoomSpec): [Float32Array, Float32Array] {
  const { seconds, predelay = 0.012, bright = 11000, dark = 2200, lowCut = 220, seed = 1 } = spec;
  const n = Math.max(1, Math.floor((predelay + seconds * 1.15) * sampleRate));
  const pre = Math.floor(predelay * sampleRate);
  const rate = Math.log(1000) / seconds;
  const build = 0.03; // seconds for the diffuse tail to fill in behind the early reflections

  const channel = (ch: number): Float32Array => {
    const rand = rng(seed * 7919 + ch * 104729 + 1);
    const d = new Float32Array(n);
    let a = 1;
    let lp = 0;
    let decay = 1;                       // e^(−rate·t), stepped rather than recomputed
    let brightness = 1;                  // how far the cutoff still is from its dark end
    let filling = 1;                     // 1 − this is the tail building in
    const kDecay = Math.exp(-rate / sampleRate);
    const kBright = Math.exp(-3 / (seconds * sampleRate));
    const kFill = Math.exp(-1 / (build * sampleRate));
    const kCut = (-2 * Math.PI) / sampleRate;
    for (let i = pre; i < n; i++) {
      // three uniforms summed are near enough Gaussian: a denser, smoother
      // tail than plain uniform noise gives
      const noise = rand() + rand() + rand() - 1.5;
      // a one-pole low-pass whose cutoff slides down as the tail decays; its
      // coefficient only needs refreshing a few hundred times a second
      if (((i - pre) & 63) === 0) a = 1 - Math.exp(kCut * (dark + (bright - dark) * brightness));
      lp += a * (noise - lp);
      d[i] = lp * decay * (1 - filling);
      decay *= kDecay;
      brightness *= kBright;
      filling *= kFill;
    }
    // Early reflections: sparse, signed, and placed differently in each ear.
    const taps = 9;
    for (let k = 0; k < taps; k++) {
      const t = 0.004 + (0.055 * (k + rand())) / taps;
      const i = pre + Math.floor(t * sampleRate);
      if (i < n) d[i] += (rand() < 0.5 ? -1 : 1) * 1.6 * Math.exp(-t * 28);
    }
    new Biquad('highpass', lowCut, 0, sampleRate).run(d);
    // settle the very end to exact zero
    const fade = Math.min(n, Math.floor(0.05 * sampleRate));
    for (let i = 0; i < fade; i++) d[n - fade + i] *= 1 - (i + 1) / fade;
    let e = 0;
    for (let i = 0; i < n; i++) e += d[i] * d[i];
    const k = e > 0 ? 1 / Math.sqrt(e) : 0;
    for (let i = 0; i < n; i++) d[i] *= k;
    return d;
  };
  return [channel(0), channel(1)];
}
