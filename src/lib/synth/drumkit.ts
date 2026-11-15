// Renders a kit voice from its recipe (engine/kit.ts) into one buffer.
//
// The recipe is the same table of layers the kit has always been written in —
// a filtered noise burst, a swept oscillator — and each layer is rendered here
// with the envelope and filter shapes those layers were tuned against, so an
// existing recipe keeps its character. What rendering ahead of time buys:
//
//   · a hit is one buffer to play instead of up to thirty nodes to build, on
//     every hit, on the main thread of a phone;
//   · a recipe can afford layers a live graph could not — a hat's cluster of
//     metallic partials, a driven kick — because the cost is paid once;
//   · anything that creates harmonics is band-limited by construction.

import type { DrumMetalLayer, DrumNoiseLayer, DrumSynthLayer, DrumToneLayer, DrumWave } from '../engine/kit';
import { Biquad, TAU, rng } from './dsp';

/** Seconds of buffer a recipe needs: its last layer's decay plus the fade to zero. */
export function drumSeconds(layers: readonly DrumSynthLayer[]): number {
  return Math.max(...layers.map((l) => (l.at || 0) + l.dur)) + 0.03;
}

/**
 * The shared envelope: a few milliseconds up to `amp`, an exponential fall to
 * near-silence at `dur`, then a short straight line to exact zero — an
 * exponential never arrives, and stopping on its residue clicks. Returns a
 * function giving the level at each successive sample.
 */
function envelope(attack: number, dur: number, amp: number, sr: number): () => number {
  const a = Math.max(1, Math.round(attack * sr));
  const d = Math.max(a + 1, Math.round(dur * sr));
  const tail = Math.round(0.02 * sr);
  const up = Math.pow(amp / 0.0001, 1 / a);
  const down = Math.pow(0.0005 / amp, 1 / (d - a));
  let i = 0;
  let v = 0.0001;
  return () => {
    const out = i < d ? v : i < d + tail ? 0.0005 * (1 - (i - d) / tail) : 0;
    v *= i < a ? up : down;
    i++;
    return out;
  };
}

/** Weight of harmonic `h` in a band-limited wave, matching the Web Audio shapes. */
function harmonic(wave: DrumWave, h: number): number {
  if (wave === 'sine') return h === 1 ? 1 : 0;
  if (wave === 'square') return h % 2 ? 4 / Math.PI / h : 0;
  if (wave === 'triangle') return h % 2 ? (8 / (Math.PI * Math.PI) / (h * h)) * (h % 4 === 1 ? 1 : -1) : 0;
  return (2 / Math.PI / h) * (h % 2 ? 1 : -1);
}

function renderTone(out: Float32Array, l: DrumToneLayer, sr: number): void {
  const start = Math.floor((l.at || 0) * sr);
  const len = Math.min(out.length - start, Math.ceil((l.dur + 0.025) * sr));
  const sweep = Math.max(1, Math.floor((l.sweep ?? l.dur * 0.5) * sr));
  const wave = l.wave || 'sine';
  // Only the harmonics that stay below the Nyquist limit at the top of the sweep.
  const count = wave === 'sine' ? 1 : Math.min(48, Math.floor((sr * 0.45) / Math.max(l.f0, l.f1)));
  const weights = new Float64Array(count + 1);
  for (let h = 1; h <= count; h++) weights[h] = harmonic(wave, h);
  const drive = l.drive || 0;
  const norm = drive ? 1 / Math.tanh(1 + drive) : 1;
  // The pitch falls geometrically from f0 to f1, one ratio per sample.
  const glide = Math.pow(l.f1 / l.f0, 1 / sweep);
  const env = envelope(0.004, l.dur, l.amp, sr);
  let f = l.f0;
  let phase = 0;
  for (let i = 0; i < len; i++) {
    phase += (TAU * f) / sr;
    if (i < sweep) f *= glide;
    let s = Math.sin(phase);
    if (count > 1) {
      // sin(hθ) for every h from two values: sin((h+1)θ) = 2cosθ·sin(hθ) − sin((h−1)θ)
      const k = 2 * Math.cos(phase);
      let prev = 0;
      let cur = s;
      s *= weights[1];
      for (let h = 2; h <= count; h++) {
        const next = k * cur - prev;
        prev = cur; cur = next;
        s += weights[h] * cur;
      }
    }
    const e = env();
    // Drive follows the envelope: harmonics at the hit, a clean tail. It is
    // what lets a 50 Hz drum be heard at all on a speaker that stops at 200.
    out[start + i] += drive ? Math.tanh(((1 + drive) * s * e) / l.amp) * norm * l.amp : s * e;
  }
}

function renderNoise(out: Float32Array, l: DrumNoiseLayer, sr: number, rand: () => number): void {
  const start = Math.floor((l.at || 0) * sr);
  const len = Math.min(out.length - start, Math.ceil((l.dur + 0.025) * sr));
  const f = new Biquad(l.filter, l.freq, l.q ?? 1, sr);
  // Let the filter settle on noise before the hit, as a free-running source would.
  for (let i = 0; i < 64; i++) f.step(rand() * 2 - 1);
  const env = envelope(0.003, l.dur, l.amp, sr);
  for (let i = 0; i < len; i++) {
    out[start + i] += f.step(rand() * 2 - 1) * env();
  }
}

// Six square waves at ratios that share no harmonic series — the circuit at
// the heart of the classic drum machines' hats and cymbals. Their combined
// harmonics form a dense, fixed, inharmonic cluster: the difference between
// "tss" and hiss is that a cymbal has pitch-like partials and noise has none.
const METAL = [1, 1.4827, 1.8003, 2.546, 2.6303, 3.8967];

function renderMetal(out: Float32Array, l: DrumMetalLayer, sr: number, rand: () => number): void {
  const start = Math.floor((l.at || 0) * sr);
  const len = Math.min(out.length - start, Math.ceil((l.dur + 0.025) * sr));
  const cluster = new Float32Array(len);
  const top = sr * 0.45;
  // Nothing below the filter's skirt survives it, so those partials are skipped.
  const bottom = l.filter === 'lowpass' ? 0 : l.freq * 0.35;
  for (const ratio of METAL) {
    const f0 = l.base * ratio;
    const phase0 = rand() * TAU; // a fresh strike never catches the oscillators the same way twice
    for (let h = 1; h * f0 < top; h += 2) {
      const f = h * f0;
      if (f < bottom) continue;
      // one harmonic of a square: a free-running sine, by recurrence
      const w = (TAU * f) / sr;
      const c = 2 * Math.cos(w);
      let y2 = Math.sin(h * phase0 - w);
      let y1 = Math.sin(h * phase0);
      const a = 4 / Math.PI / h / METAL.length;
      cluster[0] += a * y1;
      for (let i = 1; i < len; i++) {
        const y = c * y1 - y2;
        y2 = y1; y1 = y;
        cluster[i] += a * y;
      }
    }
  }
  // Level it like filtered noise, so a recipe's `amp` means the same loudness
  // for a metal layer as for the noise layer beside it.
  new Biquad(l.filter, l.freq, l.q ?? 1, sr).run(cluster);
  let power = 0;
  for (let i = 0; i < len; i++) power += cluster[i] * cluster[i];
  const level = power > 0 ? 0.4 / Math.sqrt(power / len) : 0;
  const env = envelope(0.002, l.dur, l.amp, sr);
  for (let i = 0; i < len; i++) {
    out[start + i] += cluster[i] * level * env();
  }
}

/**
 * One hit of a kit voice at full velocity. `seed` picks the noise: the same
 * seed renders the same hit, a different one renders another strike of the
 * same drum — same spectrum, different sample.
 */
export function renderDrum(layers: readonly DrumSynthLayer[], sampleRate: number, seed = 1): Float32Array {
  const out = new Float32Array(Math.ceil(drumSeconds(layers) * sampleRate));
  const rand = rng(seed * 2654435761);
  for (const l of layers) {
    if (l.kind === 'noise') renderNoise(out, l, sampleRate, rand);
    else if (l.kind === 'metal') renderMetal(out, l, sampleRate, rand);
    else renderTone(out, l, sampleRate);
  }
  return out;
}

/** Whether another seed would render a different buffer — only noise and metal vary. */
export function drumVaries(layers: readonly DrumSynthLayer[]): boolean {
  return layers.some((l) => l.kind !== 'tone');
}
