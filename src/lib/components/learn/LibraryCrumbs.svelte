<script lang="ts">
  // Where you are, as a trail back to the front desk. Every step but the last
  // is a link, so any level of the library is one tap away.
  import { pathTo } from '../../learn/catalog';
  let { current, onselect }: { current: string; onselect: (id: string) => void } = $props();
  const trail = $derived(pathTo(current));
</script>

<nav class="crumbs mono" aria-label="breadcrumb" data-testid="learn-crumbs">
  {#each trail as n, i (n.id)}
    {#if i > 0}<span class="crumbs-sep" aria-hidden="true">›</span>{/if}
    {#if i === trail.length - 1}
      <span class="crumbs-here" aria-current="page">{n.title}</span>
    {:else}
      <button class="crumbs-link" onclick={() => onselect(n.id)}>{n.title}</button>
    {/if}
  {/each}
</nav>

<style>
  .crumbs { display: flex; align-items: center; flex-wrap: wrap; gap: 2px 6px; font-size: 10px; letter-spacing: .1em; text-transform: uppercase; min-width: 0; }
  .crumbs-sep { color: #b9a680; }
  .crumbs-here { color: #7a6540; }
  .crumbs-link { border: 0; background: transparent; padding: 4px 0; font: inherit; letter-spacing: inherit; text-transform: inherit; color: var(--accent); cursor: pointer; }
  .crumbs-link:hover { text-decoration: underline; }
  .crumbs-link:focus-visible { outline: 2px solid var(--ink); outline-offset: 2px; }
  @media (min-width: 981px) { .crumbs { font-size: 10.5px; } }
</style>
