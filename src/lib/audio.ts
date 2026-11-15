// The studio's sound engine: a band of modelled instruments — electric piano,
// bass, guitar and the drum kit — rendered on the device (see synth/) and
// played through a small mixing desk. Isolated from state so it can be
// reasoned about (and stubbed in tests).
//
//   keys ── spread by pitch ─ chorus ─ tremolo ──────┐
//   guitar ── just off centre ───────────────────────┼─ band (master volume) ─┐
//   bass ── dead centre, dry ────────────────────────┘                        │
//   drums ── each voice at its own place in the kit ──────────────────────────┼─ master bus ─ speakers
//   keys, guitar and drums each send a little to one shared room ─ reverb ────┘
//
// Nothing here downloads anything: there are no audio assets, and the app
// sounds the same offline as on.

import { sharedAudioContext } from './audioContext';
import { drumVoice as drumVoiceDef } from './engine/drums';
import type { DrumVoiceId } from './engine/drums';
import { masterBus } from './master';
import { SampleBank, prewarm, type Instrument } from './synth/bank';
import { DEFAULT_KEYS, keysVoice, type KeysVoice } from './synth/keys';
import type { RoomSpec } from './synth/room';

export { softClipCurve } from './master';
export type { Instrument } from './synth/bank';
export { KEYS_VOICES, DEFAULT_KEYS } from './synth/keys';
export type { KeysVoice } from './synth/keys';

// How far ahead of the clock a scheduled event is placed: long enough that a
// busy main thread can't push a note into the past, short enough not to feel
// laggy under the finger.
const LEAD = 0.03;

/** Level of one note of each instrument, before the per-chord scaling. */
const LEVEL: Record<Instrument, number> = { keys: 0.5, bass: 0.26, guitar: 0.38 };
/**
 * How a note ends when its time is up, as a time constant in seconds: felt
 * dampers closing on a tine, a finger stopping a bass string, a palm on a
 * guitar. Until then a note rings with its own natural decay.
 */
const RELEASE: Record<Instrument, number> = { keys: 0.07, bass: 0.028, guitar: 0.05 };
/** Where across the stereo field the keyboard's registers sit: low keys left, high keys right. */
const KEY_PANS = [-0.3, -0.15, 0, 0.15, 0.3];
/** How much of the guitar goes to the room. The keys' send is part of their preset; the bass stays dry. */
const GUITAR_ROOM = 0.16;
const GUITAR_PAN = 0.12;
/** The room: a small, warm studio — enough to place the band, short enough to stay out of the way. */
const ROOM: RoomSpec = { seconds: 1.0 };
const DRUM_ROOM_DEFAULT = 0.1;

/**
 * The rate to render at before there is a context to ask: the one this device
 * ran at last time, or failing that what most phones, tablets and laptops run
 * their audio at. On a device that turns out to use another rate, what was
 * rendered still plays — resampled by the browser — while idle time renders it
 * again at the right one.
 */
const RATE_KEY = 'workbench.audioRate';
function likelyRate(): number {
  try {
    const r = Number(localStorage.getItem(RATE_KEY));
    if (r >= 8000 && r <= 192000) return r;
  } catch { /* storage unavailable */ }
  return 48000;
}
function rememberRate(rate: number): void {
  try { localStorage.setItem(RATE_KEY, String(rate)); } catch { /* storage unavailable */ }
}

export class AudioEngine {
  private actx: BaseAudioContext | null = null;
  private bank: SampleBank | null = null;
  private band: GainNode | null = null;
  private keyBuses: GainNode[] = [];
  private bassBus: GainNode | null = null;
  private guitarBus: GainNode | null = null;
  private drumBus: GainNode | null = null;
  private room: ConvolverNode | null = null;
  private drumStrips = new Map<DrumVoiceId, GainNode>();
  private keys: KeysVoice = DEFAULT_KEYS;
  /** The knobs of the keys' effects, set from the preset. */
  private keysFx: {
    room: AudioParam; level: AudioParam; chorus: AudioParam;
    tremRate: AudioParam; tremPan: AudioParam; tremAmp: AudioParam; tremBase: AudioParam;
  } | null = null;
  volume = 0.78;

  /**
   * @param given a context to play into instead of the app's shared one — an
   * OfflineAudioContext, to render the engine's output to a buffer and measure it.
   */
  constructor(private given?: BaseAudioContext) {}

  private ensure(): void {
    if (!this.actx) {
      // Shared with the metronome, so both run on one clock.
      const ctx = this.given ?? sharedAudioContext();
      this.actx = ctx;
      this.bank = new SampleBank(ctx);
      const out = masterBus(ctx);

      this.band = ctx.createGain();
      this.band.gain.value = this.volume;
      this.band.connect(out);

      // One room for everyone. Its response is generated (synth/room.ts) and
      // already scaled, so the node's own normalisation is off and a send
      // level means what it says.
      this.room = ctx.createConvolver();
      this.room.normalize = false;
      this.room.connect(out);
      // Handing a convolver its response is the one costly step in setting
      // up, so it waits until the tap that woke the engine has been answered
      // and painted. The first note of a session is a frame ahead of its room.
      const openRoom = () => { this.room!.buffer = this.bank!.room(ROOM); };
      if (this.given) openRoom();
      else requestAnimationFrame(() => setTimeout(openRoom, 0));

      // The keyboard, laid out left to right like the instrument, then through
      // the two effects an electric piano is rarely heard without:
      //
      //   keys ─┬───────────────────────────┬─ tremolo (level, then pan) ─ trim ─ band
      //         └─ chorus: two swept delays ┘
      //
      // The chorus is a pair of short delays whose length drifts slowly, one
      // to each side — the same notes a few cents either way, which is where
      // the width and the shimmer come from. The tremolo is one slow sine,
      // either dipping the level (a reed piano's throb) or swinging the sound
      // between the speakers (the "suitcase" vibrato). All of it is native
      // nodes, running whether or not a note is sounding, and costs nothing to
      // speak of. A preset is a setting of these knobs — see applyKeys().
      const keysRoom = ctx.createGain();
      keysRoom.connect(this.room);
      const keysMix = ctx.createGain();
      this.keyBuses = KEY_PANS.map((pan) => {
        const bus = ctx.createGain();
        const p = ctx.createStereoPanner();
        p.pan.value = pan;
        bus.connect(p).connect(keysMix);
        bus.connect(keysRoom);
        return bus;
      });
      const lfo = (hz: number) => {
        const o = ctx.createOscillator();
        o.frequency.value = hz;
        o.start();
        return o;
      };
      const chorus = ctx.createGain();
      ([[0.0115, 0.53, -0.85], [0.0155, 0.71, 0.85]] as const).forEach(([base, hz, pan]) => {
        const d = ctx.createDelay(0.05);
        d.delayTime.value = base;
        const sweep = ctx.createGain();
        sweep.gain.value = 0.0028;
        lfo(hz).connect(sweep).connect(d.delayTime);
        const p = ctx.createStereoPanner();
        p.pan.value = pan;
        keysMix.connect(d).connect(p).connect(chorus);
      });
      const tremLevel = ctx.createGain();
      const tremPan = ctx.createStereoPanner();
      const trim = ctx.createGain();
      keysMix.connect(tremLevel);
      chorus.connect(tremLevel);
      tremLevel.connect(tremPan).connect(trim).connect(this.band);
      const trem = lfo(4.3);
      const toLevel = ctx.createGain();
      const toPan = ctx.createGain();
      trem.connect(toLevel).connect(tremLevel.gain);
      trem.connect(toPan).connect(tremPan.pan);
      this.keysFx = {
        room: keysRoom.gain, level: trim.gain, chorus: chorus.gain,
        tremRate: trem.frequency, tremPan: toPan.gain, tremAmp: toLevel.gain, tremBase: tremLevel.gain,
      };
      this.bank.setKeys(this.keys);
      this.applyKeys(true);

      this.bassBus = ctx.createGain();
      this.bassBus.connect(this.band);

      this.guitarBus = ctx.createGain();
      const gp = ctx.createStereoPanner();
      gp.pan.value = GUITAR_PAN;
      this.guitarBus.connect(gp).connect(this.band);
      const guitarRoom = ctx.createGain();
      guitarRoom.gain.value = GUITAR_ROOM;
      this.guitarBus.connect(guitarRoom).connect(this.room);

      // The kit keeps its own fader, beside the band's rather than under it.
      this.drumBus = ctx.createGain();
      this.drumBus.gain.value = 0.9;
      this.drumBus.connect(out);

      // Carry on rendering at the rate this device actually runs at — a
      // no-op when the guess made at load was right. An offline render has no
      // idle time to do it in, and takes each sound as it is asked for.
      if (!this.given) {
        prewarm(ctx.sampleRate, ROOM, this.keys);
        rememberRate(ctx.sampleRate);
      }
    }
    const ctx = this.actx as AudioContext;
    if (ctx.state === 'suspended' && !this.given) void ctx.resume();
  }

  /**
   * Run scheduling work only once the context clock is actually advancing.
   * A freshly created context starts suspended with currentTime frozen at 0,
   * and resume() completes asynchronously; scheduling immediately would place
   * the first note's start and envelope in the past, glitching on first play.
   */
  private run(fn: () => void): void {
    this.ensure();
    const ctx = this.actx as AudioContext;
    if (ctx.state === 'running' || this.given) fn();
    else void ctx.resume().then(fn, fn);
  }

  /**
   * Per-voice scaling for an n-note hit. Triads (with their doubled bass root,
   * 4 voices) play at the instrument's own level; bigger stacks scale down so
   * the summed signal stays clear of full scale instead of clipping. The 0.7
   * exponent sits between equal-peak and equal-power, so a 13th chord sounds
   * about as loud as a triad — just clean.
   */
  private chordAmp(n: number): number {
    return n <= 4 ? 1 : Math.pow(4 / n, 0.7);
  }

  // Sources scheduled ahead of the clock. The transport now queues a whole bar
  // in advance, so stopping has to be able to drop what hasn't sounded yet
  // rather than let it ring on.
  private scheduled: Array<{ node: AudioScheduledSourceNode; at: number }> = [];

  private track(node: AudioScheduledSourceNode, at: number): void {
    this.scheduled.push({ node, at });
    if (this.scheduled.length > 512) {
      const now = this.actx!.currentTime;
      this.scheduled = this.scheduled.filter((s) => s.at > now);
    }
  }

  /**
   * Drop everything scheduled that hasn't started yet. Notes already sounding
   * are left to ring out naturally — cutting those would click.
   */
  cancelScheduled(): void {
    if (!this.actx) return;
    const now = this.actx.currentTime;
    this.scheduled.forEach(({ node, at }) => {
      // Per spec a stop at or before the start means the node never sounds.
      if (at > now) { try { node.stop(now); } catch { /* already stopped */ } }
    });
    this.scheduled = [];
  }

  /** The bus a note of an instrument plays into. */
  private busFor(inst: Instrument, midi: number): GainNode {
    if (inst === 'bass') return this.bassBus!;
    if (inst === 'guitar') return this.guitarBus!;
    // two octaves either side of middle C span the stereo spread
    const x = Math.max(0, Math.min(1, (midi - 36) / 48));
    return this.keyBuses[Math.round(x * (this.keyBuses.length - 1))];
  }

  /**
   * Start one note at `t`: a rendered buffer, tuned by its playback rate, into
   * a gain that stays put until the note is released. The buffer already holds
   * the instrument's attack and natural decay, so there is no envelope to draw
   * here — only the moment the player lets go.
   */
  private strike(inst: Instrument, midi: number, t: number, amp: number): { src: AudioBufferSourceNode; g: GainNode } {
    const ctx = this.actx!;
    const { buffer, rate } = this.bank!.note(inst, midi);
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    src.playbackRate.value = rate;
    const g = ctx.createGain();
    g.gain.value = amp;
    src.connect(g).connect(this.busFor(inst, midi));
    src.start(t);
    return { src, g };
  }

  /** Let go of a note at `at`, with the instrument's own damping (or `tau`, in seconds). */
  private letGo(v: { src: AudioBufferSourceNode; g: GainNode }, at: number, tau: number): void {
    v.g.gain.setTargetAtTime(0, at, tau);
    // eight time constants is 70 dB down: nothing left to cut off
    v.src.stop(at + tau * 8);
  }

  private voice(inst: Instrument, midi: number, t: number, dur: number, amp: number): void {
    const v = this.strike(inst, midi, t, amp);
    this.letGo(v, t + dur, RELEASE[inst]);
    this.track(v.src, t);
  }

  /** The audio clock, in seconds. Creates the context if it doesn't exist yet. */
  now(): number {
    this.ensure();
    return this.actx!.currentTime;
  }

  /**
   * The device's own output latency: the buffering between a rendered sample
   * and the speaker. Anything visual that has to line up with a sound belongs
   * at its scheduled time plus this — scheduling time is when we hand the note
   * over, not when it arrives.
   */
  latency(): number {
    const ctx = this.actx as AudioContext | null;
    return ctx ? ctx.outputLatency || ctx.baseLatency || 0 : 0;
  }

  /**
   * Play a set of MIDI notes, optionally strummed with a per-note stagger.
   * `at` places them at an exact time on the audio clock — that's how the
   * transport keeps a loop seamless. Without it they land a lead ahead of now,
   * which is what a one-off preview wants. A note rings for `dur` and is then
   * released; `inst` says who is playing it.
   */
  playMidis(midis: number[], dur = 1.2, stagger = 0, at?: number, inst: Instrument = 'keys'): void {
    this.run(() => {
      // Fetch every note first: one that has to be rendered on the spot takes
      // a few milliseconds, and those must not come out of the lead time.
      midis.forEach((m) => this.bank!.note(inst, m));
      const t0 = this.startTime(at);
      const amp = LEVEL[inst] * this.chordAmp(midis.length);
      midis.forEach((m, i) => this.voice(inst, m, t0 + i * stagger, dur, amp));
    });
  }

  /**
   * Resolve a requested time against the clock. A context that had to resume
   * first may have moved past it; never schedule into the past.
   */
  private startTime(at?: number): number {
    const now = this.actx!.currentTime;
    return at != null ? Math.max(at, now) : now + LEAD;
  }

  /**
   * Ghost note: the muted, pitchless "chk" a bassist plays between real notes.
   * The same string, stopped by the fretting hand almost as soon as it is
   * plucked — enough attack to mark the subdivision, gone before it reads as
   * a pitch.
   */
  ghost(midi: number, at?: number): void {
    this.run(() => {
      const t = this.startTime(at);
      const v = this.strike('bass', midi, t, LEVEL.bass * 0.42);
      this.letGo(v, t + 0.012, 0.009);
      this.track(v.src, t);
    });
  }

  // Voices currently sustained by a press-and-hold gesture.
  private held: Array<{ src: AudioBufferSourceNode; g: GainNode; start: number }> = [];
  // Bumped on every release; lets a hold that is still waiting for the context
  // to resume abort if it was superseded by a newer press or a quick release.
  private holdSeq = 0;

  /**
   * Start a set of notes and hold them (press-and-hold): they ring with the
   * instrument's natural decay for as long as the key is down. Any previously
   * held notes are released first. Call releaseHeld() on pointer-up.
   */
  holdMidis(midis: number[], stagger = 0, inst: Instrument = 'keys'): void {
    this.releaseHeld(); // silences previous notes and bumps holdSeq
    const id = this.holdSeq;
    this.run(() => {
      if (this.holdSeq !== id) return; // superseded before the context was ready
      midis.forEach((m) => this.bank!.note(inst, m));
      const t0 = this.actx!.currentTime + 0.02;
      const amp = LEVEL[inst] * this.chordAmp(midis.length);
      midis.forEach((m, i) => {
        const t = t0 + i * stagger;
        this.held.push({ ...this.strike(inst, m, t, amp), start: t });
      });
    });
  }

  /** Release any held notes with a short, natural tail (also covers quick taps). */
  releaseHeld(): void {
    this.holdSeq++; // cancel any hold still waiting for the context to resume
    if (!this.actx || !this.held.length) return;
    const t = this.actx.currentTime;
    const voices = this.held;
    this.held = [];
    voices.forEach((v) => {
      // Quick tap: let the attack speak so the note still rings, then damp it.
      try { this.letGo(v, Math.max(t, v.start + 0.15), 0.09); } catch { /* voice already stopped */ }
    });
  }

  // ---------------------------------------------------------------------
  // Drum kit — every voice is a recipe of layers in engine/kit.ts, rendered
  // once into a buffer (synth/drumkit.ts) and played from it.
  // ---------------------------------------------------------------------

  /** A kit voice's channel strip: its place in the stereo field and its send to the room. */
  private strip(v: DrumVoiceId): GainNode {
    let strip = this.drumStrips.get(v);
    if (!strip) {
      const ctx = this.actx!;
      const def: { pan?: number; room?: number } = drumVoiceDef(v);
      strip = ctx.createGain();
      const p = ctx.createStereoPanner();
      p.pan.value = def.pan ?? 0;
      strip.connect(p).connect(this.drumBus!);
      const send = ctx.createGain();
      send.gain.value = def.room ?? DRUM_ROOM_DEFAULT;
      strip.connect(send).connect(this.room!);
      this.drumStrips.set(v, strip);
    }
    return strip;
  }

  /**
   * A fresh strike of a kit voice: one with noise in it is rendered several
   * times over, so a repeated hat is metal being struck again rather than one
   * sample retriggering.
   */
  private strikeOf(v: DrumVoiceId): AudioBuffer {
    return this.bank!.drum(v);
  }

  /** One hit of a kit voice at absolute context time `t`, velocity 0..1. */
  private drumVoice(v: DrumVoiceId, t: number, vel: number, buffer = this.strikeOf(v)): void {
    const ctx = this.actx!;
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const g = ctx.createGain();
    g.gain.value = vel;
    src.connect(g).connect(this.strip(v));
    src.start(t);
    this.track(src, t);
  }

  /**
   * Schedule one bar of drum hits sample-accurately: `at` is each hit's
   * offset in seconds from the bar start. Called once per bar by the loop,
   * so within-bar timing never depends on setTimeout jitter.
   *
   * `start` pins the bar to an exact time on the audio clock, which is how the
   * transport keeps successive bars on one unbroken grid. Without it the bar
   * simply starts a lead ahead of now.
   */
  playDrums(hits: Array<{ v: DrumVoiceId; at: number; vel: number }>, start?: number): void {
    if (!hits.length) return;
    this.run(() => {
      // Buffers first, clock second — see playMidis.
      const strikes = hits.map((h) => this.strikeOf(h.v));
      const t0 = this.startTime(start);
      hits.forEach((h, i) => this.drumVoice(h.v, t0 + h.at, h.vel, strikes[i]));
    });
  }

  /** One immediate drum hit (cell-edit feedback, voice preview). */
  playDrumNow(v: DrumVoiceId, vel = 1): void {
    this.run(() => this.drumVoice(v, this.actx!.currentTime + 0.02, vel));
  }

  /** Set the keys' effects to the current preset — at once, or eased over a moment. */
  private applyKeys(immediate = false): void {
    const fx = this.keysFx;
    if (!fx || !this.actx) return;
    const f = this.keys.fx;
    const t = this.actx.currentTime;
    const set = (p: AudioParam, v: number) => {
      if (immediate) p.value = v;
      else p.setTargetAtTime(v, t, 0.03);
    };
    set(fx.room, f.room);
    set(fx.level, f.level);
    set(fx.chorus, f.chorus);
    set(fx.tremRate, f.tremRate);
    set(fx.tremPan, f.tremPan);
    // the level tremolo dips below full rather than swinging above it
    set(fx.tremAmp, f.tremAmp / 2);
    set(fx.tremBase, 1 - f.tremAmp / 2);
  }

  /** The keys preset in use. */
  get keysId(): string {
    return this.keys.id;
  }

  /**
   * Choose the keys preset (see KEYS_VOICES). Its notes are rendered in idle
   * time like the rest of the band; one played before then is rendered on the
   * spot. Safe to call before anything has sounded.
   */
  setKeys(id: string): void {
    const voice = keysVoice(id);
    if (voice.id === this.keys.id) return;
    this.keys = voice;
    this.bank?.setKeys(voice);
    this.applyKeys();
    prewarm(this.actx?.sampleRate ?? likelyRate(), ROOM, voice);
  }

  /**
   * Start rendering the instruments in idle time. Safe to call at page load:
   * it makes no sound and creates no AudioContext, so no autoplay policy is
   * involved — it only means the band is ready before the first tap.
   */
  warm(): void {
    prewarm(this.actx?.sampleRate ?? likelyRate(), ROOM, this.keys);
  }

  /**
   * Have these sounds ready to play: anything not yet rendered is rendered
   * now. Call it before reading the clock to schedule against, so the cost of
   * a first use never comes out of a note's lead time.
   */
  prepare(notes: Array<[Instrument, number]>, drums: DrumVoiceId[] = []): void {
    this.ensure();
    notes.forEach(([inst, midi]) => this.bank!.note(inst, midi));
    drums.forEach((v) => this.bank!.drumStrikes(v));
  }

  /** Resume the context in response to a user gesture (autoplay policies). */
  resume(): void {
    this.ensure();
  }
}
