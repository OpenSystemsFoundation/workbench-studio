<script lang="ts">
  // The anatomy of whichever groove is loaded next door: what the pattern is,
  // what each layer adds, how to programme it in a box. It stays pointed at the
  // user's actual groove rather than becoming a generic essay, and the LAYERS
  // chips are live, so reading about a layer and hearing it are the same tap.
  import { useStore } from '../../../context';
  import Chip from '../../ui/Chip.svelte';
  import Callout from '../../ui/Callout.svelte';
  import FieldLabel from '../../ui/FieldLabel.svelte';
  import SectionHead from '../../ui/SectionHead.svelte';
  const store = useStore();
  const v = $derived(store.view);
</script>

<SectionHead title={v.drTplName} eyebrow={v.drGenreName + ' ·'} tag="LOADED IN DRUMS">{v.drTip}</SectionHead>

<FieldLabel>Layers — tap to rebuild the groove up to that point</FieldLabel>
<div class="row" data-testid="learn-drum-layers">
  {#each v.drLayers as l (l.i)}
    <Chip selected={l.on} onclick={() => store.setDrLayers(l.i + 1)}>{l.i + 1} · {l.name}</Chip>
  {/each}
</div>
<Callout tone="tonic">{v.drLayerWhy}</Callout>
<Callout tone="accent" label="IN THE BOX" testid="drum-maschine">{v.drGenreMaschine}</Callout>

<p class="caption foot">Go build it in <b>Drums</b> — the same layers, the same grid, and every cell editable.</p>
<Chip onclick={() => store.setMode('drums')}>Open Drums →</Chip>

<style>
  .row { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 9px; }
  .foot { font-size: 13px; color: #8a7350; margin: 14px 0 10px; max-width: 600px; }
</style>
