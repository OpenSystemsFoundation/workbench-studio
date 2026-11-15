<script lang="ts">
  // A chord palette: the chords of a style, laid out by where they come from.
  // The jazz and classical palettes used to be two of the four styles of the
  // chord workshop; they were never really tools — they are the lesson — and
  // every chip still places its chord into the progression next door.
  import { useStore } from '../../../context';
  import ChordChip from '../../parts/ChordChip.svelte';
  import Chip from '../../ui/Chip.svelte';
  import FieldLabel from '../../ui/FieldLabel.svelte';
  import type { LibraryPage } from '../../../learn/catalog';
  let { page }: { page: LibraryPage } = $props();
  const store = useStore();
  const v = $derived(store.view);
  const jazz = $derived(page.kind === 'palette' && page.palette === 'jazz');
</script>

{#if jazz}
  <p class="caption lead">Jazz keeps the seven chords of the key and then reaches outside them in two directions: <b>borrowing</b> from the parallel minor for colour, and <b>tonicising</b> any degree with its own dominant. Tap to hear, <b>+</b> to place.</p>

  <FieldLabel>Starting points · append</FieldLabel>
  <div class="row">
    {#each v.quickProgs as p, i (i)}
      <Chip face="serif" tone="accent" outline onclick={() => store.addProg(p.defs)}>{p.name}</Chip>
    {/each}
  </div>

  <FieldLabel>Diatonic 7ths · {v.keyName}</FieldLabel>
  <div class="row">
    {#each v.jzDia as c, i (i)}
      <ChordChip variant="banded" size="sm" name={c.name} over={c.roman} color={c.fnColor} tint={c.tint} onplay={() => store.previewChord(c.ch)} onadd={() => store.addChange(c.ch)} />
    {/each}
  </div>

  <FieldLabel>Colour &amp; borrowed</FieldLabel>
  <div class="row">
    {#each v.jzBorrow as c, i (i)}
      <ChordChip variant="dashed" size="sm" name={c.name} over={c.roman} color="#b07d23" tint="#f3ead4" onplay={() => store.previewChord(c.ch)} onadd={() => store.addChange(c.ch)} />
    {/each}
  </div>

  <FieldLabel>Secondary dominants · tonicise any degree</FieldLabel>
  <div class="row">
    {#each v.jzSecondary as c, i (i)}
      <ChordChip size="sm" name={c.name} over={c.roman} color="#c2562e" tint="#f7e4db" onplay={() => store.previewChord(c.ch)} onadd={() => store.addChange(c.ch)} />
    {/each}
  </div>
{:else}
  <p class="caption lead">Plain triads, moved by the smallest step available. The cadences are the phrase endings the whole style is organised around; inversions are how the bass gets to walk instead of leap.</p>

  <FieldLabel>Period progressions · load</FieldLabel>
  <div class="row">
    {#each v.clProgs as p, i (i)}
      <Chip face="serif" tone="accent" outline onclick={() => store.setProgression(p.defs)}>{p.name}</Chip>
    {/each}
  </div>

  <FieldLabel>Cadences · append</FieldLabel>
  <div class="row">
    {#each v.cadences as c, i (i)}
      <Chip tone="tonic" outline onclick={() => store.addProg(c.defs)}>{c.name}</Chip>
    {/each}
  </div>

  <FieldLabel>Diatonic triads · {v.keyName}</FieldLabel>
  <div class="row">
    {#each v.clDia as c, i (i)}
      <ChordChip variant="banded" size="sm" name={c.name} over={c.roman} color={c.fnColor} tint={c.tint} onplay={() => store.previewChord(c.ch)} onadd={() => store.addChange(c.ch)} />
    {/each}
  </div>
{/if}

<style>
  .lead { font-size: 14px; color: #5c4a30; line-height: 1.5; max-width: 600px; margin: 0 0 16px; }
  .row { display: flex; flex-wrap: wrap; gap: 7px; margin-bottom: 16px; }
</style>
