<script lang="ts">
  // Rhythm theory: one card per idea, each with a one-bar demo through the kit.
  import { useStore } from '../../../context';
  import Card from '../../ui/Card.svelte';
  import Tag from '../../ui/Tag.svelte';
  import PlayButton from '../../ui/PlayButton.svelte';
  const store = useStore();
  const v = $derived(store.view);
</script>

<p class="caption lead">How drum &amp; percussion patterns are constructed — from the 16-step grid up to clave timelines and swing. Every card plays a one-bar demo through the kit.</p>

<div class="stack">
  {#each v.rhythmConcepts as c (c.id)}
    <Card>
      <div class="head">
        <span class="name">{c.name}</span>
        <Tag>{c.tag}</Tag>
        <span class="mono bpm">{c.bpm} BPM</span>
        <span class="play"><PlayButton tone="accent" ariaLabel={'hear ' + c.name} onclick={() => store.playRhythmDemo(c.id)} /></span>
      </div>
      <div class="serif text">{c.text}</div>
    </Card>
  {/each}
</div>

<style>
  .lead { font-size: 14px; color: #5c4a30; line-height: 1.5; max-width: 600px; margin: 0 0 16px; }
  .stack { display: flex; flex-direction: column; gap: 12px; max-width: 680px; }
  .head { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; margin-bottom: 6px; }
  .name { font-size: 17px; font-weight: 700; }
  .bpm { font-size: 9px; color: #a08a64; }
  .play { margin-left: auto; }
  .text { font-size: 14.5px; color: #4a3d29; line-height: 1.55; }
  @media (min-width: 981px) { .bpm { font-size: 10.5px; } }
</style>
