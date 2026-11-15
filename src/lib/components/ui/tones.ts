// The four voices the studio's small UI parts speak in. They follow the
// functional-harmony colours in app.css: accent (dominant), tonic, sub
// (subdominant), plus a neutral ink for labels that carry no function.
export type Tone = 'accent' | 'tonic' | 'sub' | 'ink';

export const TONE_VAR: Record<Tone, string> = {
  accent: 'var(--accent)',
  tonic: 'var(--tonic)',
  sub: 'var(--sub)',
  ink: '#5c4a30',
};

/** Enter and Space both activate, as they do on a native button. */
export function activate(run: () => void) {
  return (e: KeyboardEvent) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    e.preventDefault();
    run();
  };
}
