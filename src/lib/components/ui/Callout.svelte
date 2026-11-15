<script lang="ts">
  // The aside: a rule of thumb, or a note on how to do it in a box. With a
  // `label` it reads as a tagged note; without, as a starred margin note.
  import type { Snippet } from 'svelte';
  import Tag from './Tag.svelte';
  import { TONE_VAR, type Tone } from './tones';
  let { tone = 'accent', label = '', testid, children }: {
    tone?: Tone; label?: string; testid?: string; children: Snippet;
  } = $props();
</script>

<div class="ui-callout" class:boxed={!!label} data-testid={testid} style:--tone={TONE_VAR[tone]}>
  {#if label}<Tag {tone}>{label}</Tag>{:else}<span class="ui-callout-star mono">★</span>{/if}
  <span class="ui-callout-text caption">{@render children()}</span>
</div>

<style>
  .ui-callout {
    display: flex; gap: 10px; align-items: flex-start; max-width: 600px; margin: 10px 0;
    background: #efe2c8; border-left: 3px solid var(--tone); border-radius: 0 8px 8px 0; padding: 12px 14px;
  }
  .ui-callout.boxed { background: #f3ead4; border: 1px solid #e0cfae; border-radius: 8px; }
  .ui-callout-star { flex: none; font-size: 11px; color: var(--tone); }
  .ui-callout-text { font-size: 14px; color: #4a3d29; line-height: 1.5; }
</style>
