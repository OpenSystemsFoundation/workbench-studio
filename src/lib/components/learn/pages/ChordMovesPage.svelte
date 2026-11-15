<script lang="ts">
  // The chord inspector, with the reasoning attached: the same controls the
  // Chords tab gives you, acting on the same selected chord.
  import { useStore } from '../../../context';
  import ChordInspector from '../../parts/ChordInspector.svelte';
  import Chip from '../../ui/Chip.svelte';
  const store = useStore();
  const v = $derived(store.view);
</script>

{#if v.exploreOpen}
  <p class="caption lead">These are the same controls the Chords tab gives you — here with the reasoning attached. Every change lands in your progression immediately.</p>
  <ChordInspector teaching />
{:else}
  <p class="caption lead">Nothing is selected yet. Place a chord with a <b>+</b> on one of the palettes, or select one in <b>Chords</b>, and every move you can make on it appears here — recolour, invert, lead into it, or substitute — each one explained.</p>
  <div class="row">
    <Chip outline tone="accent" onclick={() => store.setLearnPage('harmony/palettes/jazz')}>The jazz palette →</Chip>
    <Chip outline onclick={() => store.setLearnPage('harmony/palettes/classical')}>The classical palette →</Chip>
    <Chip onclick={() => store.setMode('chords')}>Open Chords →</Chip>
  </div>
{/if}

<style>
  .lead { font-size: 14px; color: #5c4a30; line-height: 1.5; max-width: 600px; margin: 0 0 14px; }
  .row { display: flex; flex-wrap: wrap; gap: 7px; }
</style>
