<script lang="ts">
  // A heading with its tag and its lead paragraph: the top of a page, or of a
  // section within one. `divided` draws the rule that separates it from what
  // came before.
  import type { Snippet } from 'svelte';
  import Tag from './Tag.svelte';
  import type { Tone } from './tones';
  let { title, tag = '', tone = 'tonic', level = 'section', eyebrow = '', divided = false, children }: {
    title: string;
    tag?: string;
    tone?: Tone;
    level?: 'page' | 'section';
    eyebrow?: string;
    divided?: boolean;
    children?: Snippet;
  } = $props();
</script>

<div class="ui-head" class:divided>
  <div class="ui-head-row">
    {#if eyebrow}<span class="ui-head-eyebrow mono">{eyebrow}</span>{/if}
    <svelte:element this={level === 'page' ? 'h1' : 'h2'} class="ui-head-title" class:page={level === 'page'}>{title}</svelte:element>
    {#if tag}<Tag {tone}>{tag}</Tag>{/if}
  </div>
  {#if children}<div class="ui-head-lead caption">{@render children()}</div>{/if}
</div>

<style>
  .ui-head { margin-bottom: 14px; }
  .ui-head.divided { border-top: 1px solid var(--line); margin-top: 26px; padding-top: 18px; }
  .ui-head-row { display: flex; align-items: baseline; gap: 11px; flex-wrap: wrap; }
  .ui-head-title { margin: 0; font-size: 22px; font-weight: 700; letter-spacing: -.01em; line-height: 1.15; }
  .ui-head-title.page { font-size: 27px; }
  .ui-head-eyebrow { font-size: 9px; letter-spacing: .12em; color: #8a7350; }
  .ui-head-lead { font-size: 14px; color: #5c4a30; line-height: 1.5; max-width: 600px; margin-top: 6px; }
  @media (min-width: 981px) { .ui-head-eyebrow { font-size: 10.5px; } }
</style>
