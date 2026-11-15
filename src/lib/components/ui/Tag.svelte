<script lang="ts">
  // The small-caps pill that labels what a thing is: BASSLINE MOVES, LIVE, 70s & 80s.
  import type { Snippet } from 'svelte';
  import { TONE_VAR, type Tone } from './tones';
  let { tone = 'tonic', children }: { tone?: Tone; children: Snippet } = $props();
</script>

<span class="ui-tag mono" style:background={TONE_VAR[tone]}>{@render children()}</span>

<style>
  .ui-tag {
    display: inline-block; flex: none; font-size: 8px; letter-spacing: .14em; line-height: 1.2;
    color: #fff; padding: 3px 8px; border-radius: 9px; white-space: nowrap;
  }
  @media (min-width: 981px) { .ui-tag { font-size: 10px; } }
</style>
