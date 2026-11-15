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
//
// Voicing one of these is mostly a matter of where the pickup sits and how the
// instrument is amplified, and the presets below are exactly that: the same
// model with the pickup moved, the tine made to ring longer or chime harder,
// and a different effect on the way out (applied live by the engine — see
// `fx`). One preset swaps the tine and magnet for a reed and a charged plate,
// which is the other classic electric piano.

import { Biquad, TAU, addPartial, fadeOut, midiToHz, normalize, rng } from './dsp';

export interface KeysFx {
  /** tremolo speed in Hz */
  tremRate: number;
  /** how far the tremolo swings the sound between the speakers, 0…1 — the "suitcase" vibrato */
  tremPan: number;
  /** how deep the tremolo dips the level, 0…1 — the reed piano's kind */
  tremAmp: number;
  /** level of the stereo chorus, 0…1 */
  chorus: number;
  /** send to the room */
  room: number;
  /** output trim, so the presets sit at the same loudness */
  level: number;
}

export interface KeysVoice {
  id: string;
  name: string;
  /** what it is, for the picker */
  hint: string;
  /** a tine past a magnet, or a reed beside a charged plate */
  pickup: 'magnetic' | 'reed';
  /** how far the tine swings across the pickup, at the bottom and the top of the keyboard: the bark */
  depth: readonly [number, number];
  /** how far off the pickup's axis it rests, bottom and top: nearer is hollower, further is rounder */
  offset: readonly [number, number];
  /** level of the tine's own overtones — the bell at the start of the note */
  chime: number;
  /** how long that bell rings, as a multiple of the model's own */
  chimeRing: number;
  /** seconds of the slow part of the decay, at C3 */
  sustain: number;
  /** share of the note that dies away quickly after the strike, 0…1 */
  bite: number;
  /** level of the hammer thump */
  thump: number;
  /** top-end roll-off of the amp, in Hz */
  top: number;
  fx: KeysFx;
}

export const KEYS_VOICES: readonly KeysVoice[] = [
  {
    // The lush one: a pickup voiced round, a long sustain, a clear bell on the
    // attack, and the stereo vibrato and chorus that the sound is known for.
    id: 'suitcase', name: 'Suitcase', hint: 'Lush and wide: round tines, a bell on the attack, stereo vibrato and chorus',
    pickup: 'magnetic', depth: [0.58, 0.42], offset: [0.36, 0.5],
    chime: 1.5, chimeRing: 1.4, sustain: 3.4, bite: 0.36, thump: 0.035, top: 5600,
    fx: { tremRate: 4.3, tremPan: 0.55, tremAmp: 0, chorus: 0.4, room: 0.3, level: 0.55 },
  },
  {
    // Straight into the desk: more bark, no effects.
    id: 'stage', name: 'Stage', hint: 'Dry and direct: more bark on the attack, no effects',
    pickup: 'magnetic', depth: [1.0, 0.6], offset: [0.55, 0.7],
    chime: 1, chimeRing: 1, sustain: 2.4, bite: 0.5, thump: 0.05, top: 6500,
    fx: { tremRate: 4.3, tremPan: 0, tremAmp: 0, chorus: 0, room: 0.2, level: 1 },
  },
  {
    // The glassy 80s ballad voicing: all bell, a thin body, wide chorus.
    id: 'bell', name: 'Bell', hint: 'Glassy and bright: a strong bell over a light body, wide chorus',
    pickup: 'magnetic', depth: [0.6, 0.42], offset: [0.82, 0.9],
    chime: 3.2, chimeRing: 2.2, sustain: 2.8, bite: 0.42, thump: 0.02, top: 9000,
    fx: { tremRate: 0.9, tremPan: 0.3, tremAmp: 0, chorus: 0.55, room: 0.32, level: 0.8 },
  },
  {
    // The other electric piano: a reed, nasal and biting, with its throb.
    id: 'reed', name: 'Reed', hint: 'Nasal and punchy: a reed piano with its tremolo throb',
    pickup: 'reed', depth: [0.72, 0.5], offset: [0, 0],
    chime: 0.5, chimeRing: 0.6, sustain: 1.5, bite: 0.45, thump: 0.07, top: 5000,
    fx: { tremRate: 5.6, tremPan: 0, tremAmp: 0.32, chorus: 0, room: 0.18, level: 1.5 },
  },
];

export const DEFAULT_KEYS = KEYS_VOICES[0];

export function keysVoice(id: string | null | undefined): KeysVoice {
  return KEYS_VOICES.find((v) => v.id === id) ?? DEFAULT_KEYS;
}

/** Seconds of the slow part of a note's decay: long in the bass, short up top. */
export function keysDecay(midi: number, voice: KeysVoice = DEFAULT_KEYS): number {
  return voice.sustain * Math.pow(2, -(midi - 48) / 26);
}

/** One electric-piano note, peak-normalised, ending on exact silence. */
export function renderKeys(midi: number, sampleRate: number, voice: KeysVoice = DEFAULT_KEYS): Float32Array {
  const sr = sampleRate;
  const f = midiToHz(midi);
  const slow = keysDecay(midi, voice);
  const fast = slow * 0.16;
  const seconds = Math.min(4, Math.max(1.2, slow * 2.4));
  const n = Math.floor(seconds * sr);
  const out = new Float32Array(n);

  // Voicing across the keyboard: the bass barks, the top chimes. Easing the
  // swing off towards the top also keeps what the pickup generates inside the
  // audible band — its harmonics fall away geometrically, and by the highest
  // notes there are too few of them below the Nyquist limit to spare any.
  const high = Math.min(1, Math.max(0, (midi - 60) / 36));
  const depth = voice.depth[0] + (voice.depth[1] - voice.depth[0]) * high;
  const offset = voice.offset[0] + (voice.offset[1] - voice.offset[0]) * high;

  // A cantilevered rod's overtones are not harmonics: they sit at 6.27× and
  // 17.55× the fundamental, and ring for only a few hundredths of a second.
  const chime = new Float32Array(Math.min(n, Math.floor(0.6 * sr)));
  if (f * 6.27 < 15000) addPartial(chime, sr, f * 6.27, 0.1 * voice.chime, 1 / (0.045 * voice.chimeRing));
  if (f * 17.55 < 15000) addPartial(chime, sr, f * 17.55, 0.035 * voice.chime, 1 / (0.018 * voice.chimeRing));

  // The tine itself: a sine under a two-stage decay, advanced by rotation
  // rather than by calling sin() and exp() a few hundred thousand times.
  const w = (TAU * f) / sr;
  const cw = Math.cos(w);
  const sw = Math.sin(w);
  let s = 0;
  let c = 1;
  let eFast = voice.bite;
  let eSlow = 1 - voice.bite;
  const kFast = Math.exp(-1 / (fast * sr));
  const kSlow = Math.exp(-1 / (slow * sr));
  if (voice.pickup === 'reed') {
    // A reed beside a charged plate: the signal follows the gap between them,
    // which closes much faster than it opens — every harmonic, odd and even,
    // and a nasal edge that a magnet does not have.
    for (let i = 0; i < n; i++) {
      const x = (eFast + eSlow) * s + (i < chime.length ? chime[i] : 0);
      out[i] = 1 / (1 + Math.max(-0.92, depth * x)) - 1;
      const s2 = s * cw + c * sw;
      c = c * cw - s * sw;
      s = s2;
      eFast *= kFast;
      eSlow *= kSlow;
    }
  } else {
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
  }

  // The hammer: a thump, not a click.
  const rand = rng(midi * 104729 + 7);
  const thump = new Biquad('lowpass', 700 + f, 0, sr);
  const len = Math.min(n, Math.floor(0.04 * sr));
  for (let i = 0; i < len; i++) {
    out[i] += thump.step(rand() * 2 - 1) * voice.thump * Math.exp(-i / (0.006 * sr));
  }

  // A hammer is felt, and stays on the tine for a couple of milliseconds: the
  // note speaks quickly but does not begin on a step.
  const rise = Math.floor(0.0025 * sr);
  for (let i = 0; i < rise; i++) out[i] *= 0.5 - 0.5 * Math.cos((Math.PI * i) / rise);

  // The amp and cabinet: nothing below the instrument's range, a gentle top.
  new Biquad('highpass', 45, 0, sr).run(out);
  new Biquad('lowpass', voice.top, 0, sr).run(out);
  return normalize(fadeOut(out, Math.floor(Math.min(0.9, seconds * 0.3) * sr)));
}
