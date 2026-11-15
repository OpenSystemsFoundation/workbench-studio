<script lang="ts">
  // A tappable chip. `selected` makes it one of a set of choices (and tells
  // assistive tech which is on); without it, it is simply an action. `mono`
  // chips are controls, `serif` chips name musical things.
  import type { Snippet } from 'svelte';
  import { TONE_VAR, type Tone } from './tones';
  let { selected, tone = 'tonic', face = 'mono', outline = false, onclick, children }: {
    selected?: boolean;
    tone?: Tone;
    face?: 'mono' | 'serif';
    /** Keep the tone on the border even when not selected: an offer, not a choice. */
    outline?: boolean;
    onclick: () => void;
    children: Snippet;
  } = $props();
</script>

<button
  class="ui-chip {face}" class:selected class:outline style:--tone={TONE_VAR[tone]}
  aria-pressed={selected} {onclick}
>{@render children()}</button>

<style>
  .ui-chip {
    flex: none; border: 1.5px solid #cbb792; background: #f6efe0; color: #5c4a30;
    border-radius: 7px; padding: 8px 13px; cursor: pointer; white-space: nowrap; line-height: 1.2;
  }
  .ui-chip.mono { font-family: var(--mono); font-size: 10px; letter-spacing: .05em; }
  .ui-chip.serif { font-family: var(--serif); font-size: 14px; font-weight: 600; color: var(--ink); border-radius: 14px; }
  .ui-chip.outline { border-color: var(--tone); background: color-mix(in srgb, var(--tone) 9%, #fbf6ea); color: var(--ink); }
  .ui-chip.mono.selected { background: var(--tone); border-color: var(--tone); color: #fff; }
  .ui-chip.serif.selected { border-color: var(--tone); background: color-mix(in srgb, var(--tone) 12%, #fbf6ea); font-weight: 700; }
  .ui-chip:hover:not(.selected) { border-color: var(--tone); }
  .ui-chip:focus-visible { outline: 2px solid var(--ink); outline-offset: 2px; }
  @media (min-width: 981px) { .ui-chip.mono { font-size: 11px; } }
</style>
