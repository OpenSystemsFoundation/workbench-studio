// The one way out. Every sound the app makes — the band, the kit, the drone,
// the click — is summed here and passes through a single safety clamp on its
// way to the speakers.
//
// It matters that it is one. Each part used to guard its own output and then
// connect to the destination separately, so each was safe alone and nothing
// watched the sum: a drone under a full band and a click could add up past
// full scale and hard-clip at the converter, the one distortion nothing in the
// app had asked for.

/** Below this the safety clamp is exactly linear; above it, a soft knee to 1.0. */
const CLIP_KNEE = 0.8;

/**
 * Transfer curve for the master safety clamp: identity up to CLIP_KNEE, then a
 * tanh knee that approaches ±1.0 without ever reaching it. Ordinary playing
 * lives entirely in the linear part and comes through bit-for-bit; only a
 * genuine overshoot is bent, and it saturates gently instead of hard-clipping.
 */
export function softClipCurve(n = 2048, knee = CLIP_KNEE) {
  const c = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const x = (i / (n - 1)) * 2 - 1;
    const a = Math.abs(x);
    c[i] = Math.sign(x) * (a <= knee ? a : knee + (1 - knee) * Math.tanh((a - knee) / (1 - knee)));
  }
  return c;
}

const buses = new WeakMap<BaseAudioContext, GainNode>();

/**
 * The shared output of a context: connect here instead of to `destination`.
 *
 * The clamp is a waveshaper, not a compressor, on purpose. A compressor is a
 * time-domain detector, so it turns down the *whole* mix for a release-time
 * after any transient, and Chrome pre-emphasises highs in its detector — a
 * bright chord or hat attack used to duck everything by more than 10 dB. A
 * waveshaper has no detector and no memory: it reshapes only the samples that
 * actually approach the ceiling and passes everything below it untouched, so
 * nothing can ever duck anything else.
 */
export function masterBus(ctx: BaseAudioContext): GainNode {
  let bus = buses.get(ctx);
  if (!bus) {
    bus = ctx.createGain();
    const safety = ctx.createWaveShaper();
    safety.curve = softClipCurve();
    safety.oversample = '4x';
    bus.connect(safety);
    safety.connect(ctx.destination);
    buses.set(ctx, bus);
  }
  return bus;
}
