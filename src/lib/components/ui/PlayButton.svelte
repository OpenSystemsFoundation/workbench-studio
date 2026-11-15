<script lang="ts">
  // ▶ and a label: the one way a lesson makes a sound.
  import { TONE_VAR, type Tone } from './tones';
  let { label = 'HEAR IT', tone = 'tonic', onclick, ariaLabel }: {
    label?: string; tone?: Tone; onclick: () => void; ariaLabel?: string;
  } = $props();
</script>

<button class="ui-play mono" style:--tone={TONE_VAR[tone]} aria-label={ariaLabel} {onclick}>▶ {label}</button>

<style>
  .ui-play {
    flex: none; font-size: 10px; letter-spacing: .06em; color: #fff; background: var(--tone);
    border: 0; padding: 10px 15px; border-radius: 7px; cursor: pointer; white-space: nowrap;
    box-shadow: 0 3px 0 color-mix(in srgb, var(--tone) 72%, #000);
  }
  .ui-play:active { transform: translateY(2px); box-shadow: 0 1px 0 color-mix(in srgb, var(--tone) 72%, #000); }
  .ui-play:focus-visible { outline: 2px solid var(--ink); outline-offset: 2px; }
  @media (min-width: 981px) { .ui-play { font-size: 11px; } }
</style>
