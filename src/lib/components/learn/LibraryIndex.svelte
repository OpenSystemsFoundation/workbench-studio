<script lang="ts">
  // The index page of a branch. The front desk lists every shelf with what is
  // on it; a shelf or a book lists its own contents. Same component at every
  // level, because every level is just "a node and its children".
  import { pageCount, type LibraryNode } from '../../learn/catalog';
  import Card from '../ui/Card.svelte';
  import Tag from '../ui/Tag.svelte';
  import SectionHead from '../ui/SectionHead.svelte';

  let { node, onselect }: { node: LibraryNode; onselect: (id: string) => void } = $props();
  const isRoot = $derived(node.id === '');
</script>

{#snippet entry(n: LibraryNode, num: number)}
  <Card grow="230px" onclick={() => onselect(n.id)} label={n.title}>
    <div class="entry-head">
      {#if node.children?.every((c) => c.page)}<span class="entry-num mono">{String(num).padStart(2, '0')}</span>{/if}
      <span class="entry-title">{n.title}</span>
    </div>
    <div class="entry-blurb caption">{n.blurb}</div>
    <div class="entry-foot mono">
      {#if n.children}
        <span>{pageCount(n)} pages</span>
      {:else if n.tag}
        <span>{n.tag}</span>
      {/if}
      <span class="entry-go" aria-hidden="true">›</span>
    </div>
  </Card>
{/snippet}

{#if isRoot}
  <div data-testid="learn-index">
    {#each node.children ?? [] as shelf, si (shelf.id)}
      <section class="shelf" class:first={si === 0}>
        <div class="shelf-head">
          <button class="shelf-title" onclick={() => onselect(shelf.id)}>{shelf.title}</button>
          {#if shelf.tag}<Tag tone="ink">{shelf.tag}</Tag>{/if}
          <span class="shelf-count mono">{pageCount(shelf)} pages</span>
        </div>
        <p class="shelf-blurb caption">{shelf.blurb}</p>
        <div class="entries">
          {#each shelf.children ?? [] as n, i (n.id)}{@render entry(n, i + 1)}{/each}
        </div>
      </section>
    {/each}
  </div>
{:else}
  <div data-testid="learn-index">
    <SectionHead level="page" title={node.title} tag={node.tag} tone="ink">{node.blurb}</SectionHead>
    <div class="entries">
      {#each node.children ?? [] as n, i (n.id)}{@render entry(n, i + 1)}{/each}
    </div>
  </div>
{/if}

<style>
  .shelf { border-top: 1px solid var(--line); margin-top: 22px; padding-top: 16px; }
  .shelf.first { border-top: 0; margin-top: 0; padding-top: 0; }
  .shelf-head { display: flex; align-items: baseline; gap: 10px; flex-wrap: wrap; }
  .shelf-title {
    border: 0; background: transparent; padding: 0; cursor: pointer; font: inherit;
    font-size: 22px; font-weight: 700; letter-spacing: -.01em; color: var(--ink);
  }
  .shelf-title:hover { color: var(--accent); }
  .shelf-title:focus-visible { outline: 2px solid var(--ink); outline-offset: 3px; }
  .shelf-count { font-size: 9px; letter-spacing: .1em; color: #a08a64; text-transform: uppercase; }
  .shelf-blurb { font-size: 14px; color: #5c4a30; max-width: 600px; margin: 4px 0 12px; }
  .entries { display: flex; flex-wrap: wrap; gap: 9px; }
  .entry-head { display: flex; align-items: baseline; gap: 8px; }
  .entry-num { font-size: 10px; color: var(--accent); letter-spacing: .04em; }
  .entry-title { font-size: 16.5px; font-weight: 700; line-height: 1.15; }
  .entry-blurb { font-size: 13px; color: #6b5a3e; margin: 5px 0 9px; }
  .entry-foot { display: flex; align-items: center; justify-content: space-between; gap: 8px; font-size: 8.5px; letter-spacing: .12em; color: #8a7350; text-transform: uppercase; }
  .entry-go { font-size: 14px; color: var(--accent); margin-left: auto; }
  @media (min-width: 981px) { .shelf-count, .entry-foot { font-size: 10px; } .entry-num { font-size: 11px; } }
</style>
