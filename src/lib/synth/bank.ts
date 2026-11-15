// The sample bank: every sound the band plays, rendered on the device.
//
// This is a sampler with no samples to download. Each instrument is a model
// (strings.ts, keys.ts, drumkit.ts) that is rendered into an AudioBuffer the
// first time it is needed, kept, and from then on played by the browser's own
// native buffer player — the cheapest, most glitch-proof thing Web Audio can
// do. The expensive part (hundreds of partials per note) happens once, off the
// audio thread; playing a note costs the same as playing a recording of one.
//
// Pitched instruments are rendered every third semitone and re-pitched by at
// most one semitone either way, the way a sampled instrument is mapped. That
// keeps a whole keyboard to a few megabytes of memory.
//
// Rendering starts in idle time as soon as the page has loaded, before there
// is an AudioContext to play anything through (a browser will not start one
// until the first tap). So the work is split in two: the models render plain
// arrays of samples whenever the page has a moment (`prewarm`), and a bank
// turns them into buffers for a context when a note is first asked for.
//
// Before there is a context its sample rate can only be guessed. A wrong guess
// is not wasted: a buffer plays at any rate (the browser resamples it), so
// what was rendered stands in — nothing has to be rendered in the middle of a
// bar — while idle time renders the band again at the device's own rate.

import { DRUM_VOICES, drumVoice, type DrumVoiceId } from '../engine/kit';
import { drumVaries, renderDrum } from './drumkit';
import { DEFAULT_KEYS, renderKeys, type KeysVoice } from './keys';
import { roomImpulse, type RoomSpec } from './room';
import { BASS, GUITAR, renderString } from './strings';

export type Instrument = 'keys' | 'bass' | 'guitar';

const RANGE: Record<Instrument, [number, number]> = {
  keys: [24, 103],
  bass: [16, 67],
  guitar: [28, 96],
};

/** The rendered note a pitch is played from: the nearest of every third semitone. */
export function zoneRoot(midi: number): number {
  return 3 * Math.round((midi - 1) / 3) + 1;
}

/** A pitch pulled by octaves into the range an instrument is modelled over. */
export function inRange(inst: Instrument, midi: number): number {
  const [lo, hi] = RANGE[inst];
  let m = Math.round(midi);
  while (m < lo) m += 12;
  while (m > hi) m -= 12;
  return m;
}

export function renderNote(inst: Instrument, midi: number, sampleRate: number, keys: KeysVoice = DEFAULT_KEYS): Float32Array {
  if (inst === 'keys') return renderKeys(midi, sampleRate, keys);
  return renderString(inst === 'bass' ? BASS : GUITAR, midi, sampleRate);
}

/** Strikes rendered per drum voice, so a repeated hit is never the same sample twice running. */
const STRIKES = 3;

/**
 * The bass is rendered at half the output rate. Nothing it produces reaches a
 * quarter of the way to that rate's limit, so nothing is lost, and it halves
 * both the work and the memory of the longest-ringing instrument in the band.
 */
function noteRate(inst: Instrument, sampleRate: number): number {
  return inst === 'bass' && sampleRate >= 44100 ? sampleRate / 2 : sampleRate;
}

// ---- rendering ahead ----

/** Rendered at the rate being warmed, and waiting for a context to become a buffer in. */
const pending = new Map<string, Float32Array[]>();
/** Rendered at an earlier guess of the rate: playable, until the real thing is ready. */
const standIns = new Map<string, { channels: Float32Array[]; rate: number }>();
/** Everything rendered so far, so idle time never renders a thing twice. */
const made = new Set<string>();

// A sound is `name@rate`: the name says what it is, the rate what it was rendered at.
// The keys are named by their preset as well: each one is a different set of notes.
const noteName = (inst: Instrument, root: number, keys: KeysVoice) =>
  inst === 'keys' ? `keys.${keys.id}:${root}` : `${inst}:${root}`;
const drumName = (v: DrumVoiceId, strike: number) => `${v}#${strike}`;
const roomName = (seconds: number) => `room:${seconds}`;
const at = (name: string, rate: number) => `${name}@${rate}`;

let queue: Array<() => void> = [];
let warmRate = 0;
let warmKeys = '';
let scheduled = false;

function pump(): void {
  scheduled = false;
  // One sound at least, more only while they are quick, then yield: on a fast
  // machine the whole band is ready in a few frames, and on a slow one each
  // turn is a single render, so a tap is never kept waiting behind a queue.
  const until = performance.now() + 8;
  do queue.shift()?.();
  while (queue.length && performance.now() < until);
  schedule();
}

function schedule(): void {
  if (scheduled || !queue.length) return;
  scheduled = true;
  if (typeof requestIdleCallback === 'function') requestIdleCallback(pump, { timeout: 400 });
  else setTimeout(pump, 8);
}

/**
 * Render what the band is about to need, a sound at a time, whenever the page
 * is idle. `sampleRate` is the rate the AudioContext will run at — or, before
 * there is one, a guess; if the guess turns out wrong the work is simply done
 * again at the right rate, as if it had never been started.
 */
export function prewarm(sampleRate: number, room?: RoomSpec, keys: KeysVoice = DEFAULT_KEYS): void {
  if (warmRate === sampleRate && warmKeys === keys.id) return;
  if (warmRate !== sampleRate) {
    // What the last guess rendered becomes the stand-ins for this one.
    for (const [key, channels] of pending) {
      const [name, rate] = key.split('@');
      standIns.set(name, { channels, rate: Number(rate) });
    }
    pending.clear();
  }
  // Another keys preset is another set of notes: let go of the old one's.
  for (const map of [pending, standIns]) {
    for (const key of [...map.keys()]) if (key.startsWith('keys.') && !key.startsWith(`keys.${keys.id}:`)) map.delete(key);
  }
  for (const key of [...made]) if (key.startsWith('keys.') && !key.startsWith(`keys.${keys.id}:`)) made.delete(key);
  warmRate = sampleRate;
  warmKeys = keys.id;
  const current = () => warmRate === sampleRate && warmKeys === keys.id;
  const later = (name: string, rate: number, render: () => Float32Array[]) => () => {
    const key = at(name, rate);
    if (!current() || made.has(key)) return;
    made.add(key);
    pending.set(key, render());
  };
  const note = (inst: Instrument, midi: number) => {
    const root = zoneRoot(midi);
    const rate = noteRate(inst, sampleRate);
    return later(noteName(inst, root, keys), rate, () => [renderNote(inst, root, rate, keys)]);
  };
  const drum = (v: DrumVoiceId, strike: number) =>
    later(drumName(v, strike), sampleRate, () => [renderDrum(drumVoice(v).synth, sampleRate, strike + 1)]);

  queue = [];
  // where chords sit, from the middle outwards
  for (const m of [49, 52, 55, 58, 46, 61, 43, 64, 40, 67, 37, 70, 73, 76, 79]) queue.push(note('keys', m));
  DRUM_VOICES.forEach((v) => queue.push(drum(v.id, 0)));
  if (room) queue.push(later(roomName(room.seconds), sampleRate, () => roomImpulse(sampleRate, room)));
  for (let m = 28; m <= 49; m += 3) queue.push(note('bass', m));
  DRUM_VOICES.forEach((v) => {
    if (drumVaries(v.synth)) for (let i = 1; i < STRIKES; i++) queue.push(drum(v.id, i));
  });
  schedule();
}

// ---- playing ----

export class SampleBank {
  private buffers = new Map<string, AudioBuffer>();
  /** Buffers made from stand-ins, by name, in use until the real one arrives. */
  private borrowed = new Map<string, AudioBuffer>();
  private lastStrike = new Map<DrumVoiceId, number>();
  private ctx: BaseAudioContext;
  private keys: KeysVoice = DEFAULT_KEYS;

  /** Change the keys preset: its notes are rendered afresh, and the old preset's are let go. */
  setKeys(voice: KeysVoice): void {
    if (voice.id === this.keys.id) return;
    this.keys = voice;
    for (const map of [this.buffers, this.borrowed]) {
      for (const key of [...map.keys()]) if (key.startsWith('keys.')) map.delete(key);
    }
  }

  constructor(ctx: BaseAudioContext) {
    this.ctx = ctx;
  }

  private buffer(channels: Float32Array[], sampleRate: number): AudioBuffer {
    const buf = this.ctx.createBuffer(channels.length, channels[0].length, sampleRate);
    channels.forEach((d, ch) => buf.getChannelData(ch).set(d));
    return buf;
  }

  /**
   * The buffer for a sound, by the cheapest route there is: one already made,
   * one rendered in idle time, a stand-in rendered at another rate — and only
   * if there is none of those, a render on the spot.
   */
  private sound(name: string, rate: number, render: () => Float32Array[]): AudioBuffer {
    const key = at(name, rate);
    let buf = this.buffers.get(key);
    if (buf) return buf;
    const ready = pending.get(key);
    if (ready) {
      pending.delete(key);
    } else {
      const borrowed = this.borrowed.get(name);
      if (borrowed) return borrowed;
      const standIn = standIns.get(name);
      if (standIn) {
        buf = this.buffer(standIn.channels, standIn.rate);
        this.borrowed.set(name, buf);
        return buf;
      }
      made.add(key);
    }
    buf = this.buffer(ready ?? render(), rate);
    this.buffers.set(key, buf);
    // the real thing is here: let the stand-in go
    this.borrowed.delete(name);
    standIns.delete(name);
    return buf;
  }

  /** The buffer for a pitch, and the playback rate that tunes it. */
  note(inst: Instrument, midi: number): { buffer: AudioBuffer; rate: number } {
    const m = inRange(inst, midi);
    const root = zoneRoot(m);
    const rate = noteRate(inst, this.ctx.sampleRate);
    const buffer = this.sound(noteName(inst, root, this.keys), rate, () => [renderNote(inst, root, rate, this.keys)]);
    return { buffer, rate: Math.pow(2, (m - root) / 12) };
  }

  private strike(v: DrumVoiceId, i: number): AudioBuffer {
    const rate = this.ctx.sampleRate;
    return this.sound(drumName(v, i), rate, () => [renderDrum(drumVoice(v).synth, rate, i + 1)]);
  }

  /** One strike of a kit voice — a different one from last time, where the voice has noise in it. */
  drum(v: DrumVoiceId): AudioBuffer {
    if (!drumVaries(drumVoice(v).synth)) return this.strike(v, 0);
    const last = this.lastStrike.get(v) ?? -1;
    let i = Math.floor(Math.random() * (STRIKES - 1));
    if (i >= last && last >= 0) i++;
    this.lastStrike.set(v, i);
    return this.strike(v, i);
  }

  /** Every strike of a kit voice, made ready. */
  drumStrikes(v: DrumVoiceId): void {
    const n = drumVaries(drumVoice(v).synth) ? STRIKES : 1;
    for (let i = 0; i < n; i++) this.strike(v, i);
  }

  /**
   * The stereo impulse response of a room, as a buffer for a ConvolverNode.
   * A convolver only accepts a response at its context's own rate, so this
   * one is never a stand-in.
   */
  room(spec: RoomSpec): AudioBuffer {
    const rate = this.ctx.sampleRate;
    const key = at(roomName(spec.seconds), rate);
    const ready = pending.get(key);
    pending.delete(key);
    return this.buffer(ready ?? roomImpulse(rate, spec), rate);
  }
}
