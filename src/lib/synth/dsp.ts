// Small DSP building blocks shared by the instrument models. Everything here is
// plain arithmetic on Float32Arrays — no Web Audio, no DOM — so the models can
// be rendered and measured in a unit test exactly as they are in the browser.

export const TAU = Math.PI * 2;

export function midiToHz(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

/** A small, fast, seedable generator: the same seed renders the same sample. */
export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Uniform white noise in ±1. */
export function whiteNoise(n: number, rand: () => number): Float32Array {
  const d = new Float32Array(n);
  for (let i = 0; i < n; i++) d[i] = rand() * 2 - 1;
  return d;
}

export type FilterType = 'lowpass' | 'highpass' | 'bandpass';

/**
 * A biquad with the same coefficient conventions as the Web Audio
 * BiquadFilterNode, so a recipe written for one sounds the same through the
 * other: for low- and high-pass `q` is resonance in dB, for band-pass it is the
 * ordinary quality factor (centre over bandwidth) with 0 dB gain at the centre.
 */
export class Biquad {
  private b0 = 1; private b1 = 0; private b2 = 0; private a1 = 0; private a2 = 0;
  private x1 = 0; private x2 = 0; private y1 = 0; private y2 = 0;

  constructor(type: FilterType, freq: number, q: number, sampleRate: number) {
    const w = TAU * Math.min(freq, sampleRate * 0.49) / sampleRate;
    const cos = Math.cos(w);
    const sin = Math.sin(w);
    let a0: number;
    if (type === 'bandpass') {
      const alpha = sin / (2 * Math.max(q, 0.0001));
      a0 = 1 + alpha;
      this.b0 = alpha / a0; this.b1 = 0; this.b2 = -alpha / a0;
      this.a1 = (-2 * cos) / a0; this.a2 = (1 - alpha) / a0;
      return;
    }
    const alpha = sin / (2 * Math.pow(10, q / 20));
    a0 = 1 + alpha;
    if (type === 'lowpass') {
      this.b0 = (1 - cos) / 2 / a0; this.b1 = (1 - cos) / a0; this.b2 = this.b0;
    } else {
      this.b0 = (1 + cos) / 2 / a0; this.b1 = -(1 + cos) / a0; this.b2 = this.b0;
    }
    this.a1 = (-2 * cos) / a0; this.a2 = (1 - alpha) / a0;
  }

  step(x: number): number {
    const y = this.b0 * x + this.b1 * this.x1 + this.b2 * this.x2 - this.a1 * this.y1 - this.a2 * this.y2;
    this.x2 = this.x1; this.x1 = x; this.y2 = this.y1; this.y1 = y;
    return y;
  }

  run(d: Float32Array): Float32Array {
    for (let i = 0; i < d.length; i++) d[i] = this.step(d[i]);
    return d;
  }
}

/**
 * Add one exponentially decaying sine partial to `out`, starting at sample
 * `from`: amp · e^(−rate·t) · sin(2π·freq·t).
 *
 * A decaying sinusoid is the impulse response of a two-pole resonator, so each
 * sample costs two multiplies instead of a sin() and an exp(). It stops as soon
 * as the partial has decayed below audibility, which is what makes summing a
 * few hundred of them per note cheap: the high ones die in milliseconds.
 */
export function addPartial(
  out: Float32Array | Float64Array, sampleRate: number, freq: number, amp: number, rate: number,
  floor = 1e-5, from = 0,
): void {
  if (freq <= 0 || freq >= sampleRate * 0.5 || amp === 0) return;
  const w = (TAU * freq) / sampleRate;
  const r = Math.exp(-rate / sampleRate);
  const c1 = 2 * r * Math.cos(w);
  const c2 = r * r;
  const a = Math.abs(amp);
  if (a <= floor) return;
  const life = rate > 0 ? Math.ceil((Math.log(a / floor) / rate) * sampleRate) : out.length;
  const end = Math.min(out.length, from + Math.max(2, life));
  let y2 = 0;                       // the sine starts at zero…
  let y1 = amp * r * Math.sin(w);   // …and this is its second sample
  if (from + 1 < end) out[from + 1] += y1;
  for (let i = from + 2; i < end; i++) {
    const y = c1 * y1 - c2 * y2;
    y2 = y1; y1 = y;
    out[i] += y;
  }
}

export function peak(d: Float32Array | Float64Array): number {
  let p = 0;
  for (let i = 0; i < d.length; i++) { const a = Math.abs(d[i]); if (a > p) p = a; }
  return p;
}

/** Scale so the loudest sample sits at `to`. A silent buffer is left alone. */
export function normalize(d: Float32Array, to = 1): Float32Array {
  const p = peak(d);
  if (p > 0) { const k = to / p; for (let i = 0; i < d.length; i++) d[i] *= k; }
  return d;
}

/** Raised-cosine fade to exact zero over the last `n` samples, so a buffer never ends on a step. */
export function fadeOut(d: Float32Array, n: number): Float32Array {
  const len = Math.min(n, d.length);
  for (let i = 0; i < len; i++) {
    d[d.length - len + i] *= 0.5 * (1 + Math.cos((Math.PI * (i + 1)) / len));
  }
  return d;
}
