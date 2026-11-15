<script lang="ts">
  // What the colours mean: a row of swatches and their names.
  let { items, shape = 'square' }: {
    items: ReadonlyArray<{ name: string; color: string }>;
    shape?: 'square' | 'dot';
  } = $props();
</script>

<div class="ui-legend mono">
  {#each items as l (l.name)}
    <span class="ui-legend-item"><span class="ui-legend-swatch {shape}" style:background={l.color}></span>{l.name}</span>
  {/each}
</div>

<style>
  .ui-legend { display: flex; gap: 8px 14px; flex-wrap: wrap; font-size: 9px; letter-spacing: .07em; color: #7a6b50; text-transform: uppercase; }
  .ui-legend-item { display: inline-flex; align-items: center; gap: 5px; }
  .ui-legend-swatch { width: 10px; height: 10px; border-radius: 3px; flex: none; }
  .ui-legend-swatch.dot { border-radius: 50%; }
  @media (min-width: 981px) { .ui-legend { font-size: 10.5px; } }
</style>
