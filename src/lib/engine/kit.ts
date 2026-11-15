// The groovebox kit: one table of instruments, each entry carrying BOTH its row
// metadata (name, colour, where it sits in the stack) AND the recipe the audio
// engine uses to synthesize it. Adding an instrument is a single entry here —
// no switch statement to extend, no other file to touch, and the id union and
// grid shape widen automatically.
//
// A voice is built from layers. Each layer is a filtered noise burst, a pitched
// oscillator swept from f0 to f1, or a cluster of metallic partials, all with
// an exponential decay: stack two or three and you have a convincing
// drum-machine voice. The layers are rendered once into a buffer
// (synth/drumkit.ts), so a recipe can be as rich as it likes — a hit costs the
// same to play however many layers went into it.

/** Filter shapes and waveforms, named here so the engine stays DOM-free. */
export type DrumFilter = 'lowpass' | 'highpass' | 'bandpass';
export type DrumWave = 'sine' | 'square' | 'triangle' | 'sawtooth';

export interface DrumNoiseLayer {
  readonly kind: 'noise';
  readonly dur: number;    // seconds to decay
  readonly amp: number;    // 0..1, scaled by velocity
  readonly filter: DrumFilter;
  readonly freq: number;   // filter cutoff / centre in Hz
  readonly q?: number;     // filter resonance (bandpass width)
  readonly at?: number;    // offset from the hit, for flams and clap spreads
}

export interface DrumToneLayer {
  readonly kind: 'tone';
  readonly dur: number;
  readonly amp: number;
  readonly f0: number;     // start frequency
  readonly f1: number;     // frequency it sweeps down (or up) to
  readonly wave?: DrumWave; // default 'sine'
  readonly at?: number;
  readonly sweep?: number; // seconds the pitch takes to fall from f0 to f1 (default: half of dur)
  readonly drive?: number; // saturation at the hit, easing to clean as it decays (default: none)
}

/**
 * The metallic cluster of a drum machine's hats and cymbals: six square waves
 * at inharmonic ratios above `base`, through a filter. Noise has no partials
 * and reads as hiss; this has hundreds, fixed and unrelated, and reads as metal.
 */
export interface DrumMetalLayer {
  readonly kind: 'metal';
  readonly dur: number;
  readonly amp: number;
  readonly base: number;   // frequency of the lowest of the six squares, in Hz
  readonly filter: DrumFilter;
  readonly freq: number;
  readonly q?: number;
  readonly at?: number;
}

export type DrumSynthLayer = DrumNoiseLayer | DrumToneLayer | DrumMetalLayer;

/** Row families, used to keep the grid stacked the way a kit reads on paper. */
export type DrumVoiceKind = 'cymbal' | 'hat' | 'perc' | 'drum' | 'bass';

export interface DrumVoiceDef {
  readonly id: string;
  readonly name: string;   // full row label
  readonly short: string;  // compact label for tight layouts
  readonly color: string;  // cell colour when the step is on
  readonly kind: DrumVoiceKind;
  readonly hint: string;   // what it is / when to reach for it, shown in the add-row picker
  readonly synth: readonly DrumSynthLayer[];
  readonly pan?: number;   // where it sits across the stereo field, -1 (left) … 1 (right); default centre
  readonly room?: number;  // how much of it is sent to the room reverb, 0 … 1; default 0.1
}

// Top-to-bottom order of the groovebox rows: cymbals up top, kick on the floor,
// sub below it — the way a kit is read on paper. Insert a new instrument at the
// position where it belongs in that stack.
export const DRUM_VOICES = [
  {
    id: 'ride', name: 'Ride / Crash', short: 'CY', color: '#b07d23', kind: 'cymbal',
    hint: 'The one cymbal: ride timekeeping, the bell for African timelines, and accents on downbeats and phrase ends.',
    // What makes metal sound like metal is a dense cluster of INHARMONIC
    // partials — many modes of a struck plate, at ratios that belong to no
    // harmonic series. Two things follow, and this voice has been wrong in both
    // directions by getting one right and the other wrong.
    //
    // Squares (the first recipe) gave density but at harmonic ratios, and their
    // odd harmonics from 3.1/4.7 kHz fundamentals land on 9.4k, 14k and 15.7k
    // with no filter in the tone path to tame them: shrill.
    //
    // Wide-band noise (the second) has no partials at all, so it read as hiss.
    // Measured as spectral flatness — geometric over arithmetic mean of the
    // power spectrum, where 1.0 is white noise — it scored 0.42, noisier than
    // the open hat's 0.20 and every other noise voice in the kit.
    //
    // So: density from many sine partials, which are inharmonic by choice and
    // carry no harmonics of their own to be shrill with, over noise beds narrow
    // enough (q 4–5.6) to ring rather than hiss. That lands at 0.08 — the
    // metallic character of the original without its top end.
    synth: [
      // The stick. Short and broad, and the only wide-band layer here: this is
      // what makes the hit read as struck rather than swelling.
      { kind: 'noise', dur: 0.025, amp: 0.1, filter: 'bandpass', freq: 5200, q: 1.2 },
      // The modes of the bow. Higher partials decay faster, as they do on a
      // real plate, which is what keeps the tail from turning shrill as it
      // rings out.
      { kind: 'tone', dur: 0.5, amp: 0.04, f0: 1180, f1: 1172, wave: 'sine' },
      { kind: 'tone', dur: 0.42, amp: 0.03, f0: 1690, f1: 1678, wave: 'sine' },
      { kind: 'tone', dur: 0.34, amp: 0.026, f0: 2740, f1: 2721, wave: 'sine' },
      { kind: 'tone', dur: 0.28, amp: 0.021, f0: 3560, f1: 3535, wave: 'sine' },
      { kind: 'tone', dur: 0.22, amp: 0.016, f0: 4620, f1: 4588, wave: 'sine' },
      { kind: 'tone', dur: 0.18, amp: 0.011, f0: 6100, f1: 6057, wave: 'sine' },
      // The shimmer between the partials: resonant beds, not a wash. Widening
      // these is what turned the voice into noise last time — at q 0.4 they are
      // barely-shaped white noise; at q 4+ each one rings with the partials.
      { kind: 'noise', dur: 0.55, amp: 0.1, filter: 'bandpass', freq: 3300, q: 4 },
      { kind: 'noise', dur: 0.8, amp: 0.09, filter: 'bandpass', freq: 5100, q: 4.8 },
      { kind: 'noise', dur: 1.1, amp: 0.07, filter: 'bandpass', freq: 7400, q: 5.6 },
    ],
    pan: 0.3, room: 0.12,
  },
  {
    id: 'ohat', name: 'Open Hat', short: 'OH', color: '#8a6d3b', kind: 'hat',
    hint: 'The off-beat answer in house, techno and disco.',
    // Noise for the wash, the metallic cluster under it for the ring: on its
    // own the noise is hiss, and the cluster is what makes it a cymbal.
    synth: [
      { kind: 'noise', dur: 0.32, amp: 0.2, filter: 'highpass', freq: 6500 },
      { kind: 'metal', dur: 0.3, amp: 0.2, base: 205.3, filter: 'highpass', freq: 6800 },
    ],
    pan: -0.22, room: 0.08,
  },
  {
    id: 'chat', name: 'Closed Hat', short: 'HH', color: '#7a5ea8', kind: 'hat',
    hint: 'The default subdivision layer — 8ths or 16ths.',
    synth: [
      { kind: 'noise', dur: 0.045, amp: 0.25, filter: 'highpass', freq: 7500 },
      { kind: 'metal', dur: 0.04, amp: 0.24, base: 205.3, filter: 'highpass', freq: 7800 },
    ],
    pan: -0.22, room: 0.06,
  },
  {
    id: 'shaker', name: 'Shaker / Tambourine', short: 'SH', color: '#9b86c4', kind: 'hat',
    hint: 'The hand percussion layer, softer than a hat: house and samba 16ths, Motown off-beat jingle.',
    synth: [
      { kind: 'noise', dur: 0.07, amp: 0.2, filter: 'bandpass', freq: 6200, q: 0.9 },
      { kind: 'noise', dur: 0.03, amp: 0.1, filter: 'highpass', freq: 9500 },
    ],
    pan: 0.32, room: 0.12,
  },
  {
    id: 'cowbell', name: 'Cowbell / Block', short: 'CB', color: '#7d8a4f', kind: 'perc',
    hint: 'The 808 bell and the clave/agogo timeline sound.',
    // Levelled down against the rest of the kit. Two squares put a lot of
    // harmonic energy in the 500 Hz–5 kHz band the ear weights most heavily, so
    // the bell read far louder than its amplitude suggested next to the drums.
    synth: [
      { kind: 'tone', dur: 0.3, amp: 0.085, f0: 540, f1: 535, wave: 'square' },
      { kind: 'tone', dur: 0.26, amp: 0.07, f0: 800, f1: 795, wave: 'square' },
      { kind: 'noise', dur: 0.02, amp: 0.04, filter: 'highpass', freq: 5000 },
    ],
    pan: -0.3, room: 0.16,
  },
  {
    id: 'clap', name: 'Clap', short: 'CP', color: '#a84a6e', kind: 'perc',
    hint: 'The dance-music backbeat; layer it under a snare to widen it.',
    synth: [
      { kind: 'noise', dur: 0.03, amp: 0.4, filter: 'bandpass', freq: 1400, q: 1.4 },
      { kind: 'noise', dur: 0.03, amp: 0.4, filter: 'bandpass', freq: 1400, q: 1.4, at: 0.011 },
      { kind: 'noise', dur: 0.03, amp: 0.4, filter: 'bandpass', freq: 1400, q: 1.4, at: 0.022 },
      { kind: 'noise', dur: 0.16, amp: 0.35, filter: 'bandpass', freq: 1300, q: 1.2, at: 0.033 },
    ],
    room: 0.3,
  },
  {
    id: 'rim', name: 'Rim / Stick', short: 'RM', color: '#97a59c', kind: 'perc',
    hint: 'Cross-stick backbeats and dry percussive clicks.',
    synth: [
      { kind: 'tone', dur: 0.05, amp: 0.4, f0: 830, f1: 780, wave: 'triangle' },
      { kind: 'noise', dur: 0.02, amp: 0.15, filter: 'highpass', freq: 3200 },
    ],
    pan: 0.12, room: 0.22,
  },
  {
    id: 'snare', name: 'Snare', short: 'SD', color: '#3f6b5f', kind: 'drum',
    hint: 'The backbeat, and every ghost note around it.',
    synth: [
      // The shell: its two lowest modes, the upper one gone almost at once.
      { kind: 'tone', dur: 0.12, amp: 0.3, f0: 220, f1: 165, wave: 'triangle' },
      { kind: 'tone', dur: 0.06, amp: 0.14, f0: 372, f1: 330 },
      // The wires: the body of the rattle, and the crisp top that carries it
      // through a mix and out of a small speaker.
      { kind: 'noise', dur: 0.19, amp: 0.45, filter: 'bandpass', freq: 1900, q: 0.7 },
      { kind: 'noise', dur: 0.13, amp: 0.16, filter: 'highpass', freq: 5600 },
    ],
    room: 0.22,
  },
  {
    id: 'htom', name: 'High Tom / Conga', short: 'HT', color: '#7f9bbd', kind: 'drum',
    hint: 'The higher of two hand drums — conga open tones, tom fills.',
    synth: [
      { kind: 'tone', dur: 0.22, amp: 0.55, f0: 300, f1: 180 },
      // a drumhead's second mode sits near 1.6× the first, and dies sooner
      { kind: 'tone', dur: 0.09, amp: 0.1, f0: 480, f1: 288 },
      { kind: 'noise', dur: 0.014, amp: 0.1, filter: 'lowpass', freq: 3000 },
    ],
    pan: -0.28, room: 0.2,
  },
  {
    id: 'ltom', name: 'Low Tom', short: 'LT', color: '#5b7a9e', kind: 'drum',
    hint: 'Floor tom and the low hand drum answering it.',
    synth: [
      { kind: 'tone', dur: 0.28, amp: 0.65, f0: 160, f1: 92 },
      { kind: 'tone', dur: 0.11, amp: 0.11, f0: 256, f1: 147 },
      { kind: 'noise', dur: 0.014, amp: 0.1, filter: 'lowpass', freq: 2400 },
    ],
    pan: 0.3, room: 0.2,
  },
  {
    id: 'kick', name: 'Kick', short: 'BD', color: '#c2562e', kind: 'drum',
    hint: 'The foundation. Start every pattern here.',
    synth: [
      // The body. Driven at the hit, so the first few cycles carry harmonics a
      // phone speaker can reproduce; by the tail it is the clean sine it was.
      { kind: 'tone', dur: 0.4, amp: 0.74, f0: 150, f1: 48, drive: 0.7 },
      // The beater: a fast knock from the mids down into the body.
      { kind: 'tone', dur: 0.03, amp: 0.16, f0: 420, f1: 110, sweep: 0.018 },
      { kind: 'noise', dur: 0.02, amp: 0.25, filter: 'lowpass', freq: 3500 },
    ],
    room: 0.03,
  },
  {
    id: 'sub', name: 'Sub / 808', short: '808', color: '#8c3a1f', kind: 'bass',
    hint: 'Long pitched sub: 808 lines, hardstyle reverse bass, amapiano log drum.',
    synth: [{ kind: 'tone', dur: 0.6, amp: 0.7, f0: 92, f1: 44, drive: 0.5 }],
    room: 0,
  },
] as const satisfies readonly DrumVoiceDef[];

export type DrumVoice = (typeof DRUM_VOICES)[number];
/** Every instrument id in the kit — widens automatically when you add one. */
export type DrumVoiceId = DrumVoice['id'];

const BY_ID = new Map<DrumVoiceId, DrumVoice>(DRUM_VOICES.map((v) => [v.id, v] as [DrumVoiceId, DrumVoice]));

/** The kit entry for an id — row metadata plus its synthesis recipe. */
export function drumVoice(id: DrumVoiceId): DrumVoice {
  return BY_ID.get(id)!;
}

/** Kit order for an arbitrary set of ids, so rows always stack cymbals→sub. */
export function inKitOrder(ids: readonly DrumVoiceId[]): DrumVoiceId[] {
  const want = new Set<string>(ids);
  return DRUM_VOICES.filter((v) => want.has(v.id)).map((v) => v.id);
}
