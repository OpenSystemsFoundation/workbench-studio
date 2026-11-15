<script lang="ts">
  // Previous and next page, in the catalogue's reading order. It crosses book
  // and shelf boundaries, so the whole library reads front to back; when the
  // neighbour sits on another shelf the label says which.
  import { neighbours, pathTo, type LibraryNode } from '../../learn/catalog';
  let { current, onselect }: { current: string; onselect: (id: string) => void } = $props();
  const nb = $derived(neighbours(current));
  const here = $derived(parentTitle(current));
  function parentTitle(id: string): string { return pathTo(id).at(-2)?.title ?? ''; }
  // Name the neighbour's book only when it is a different one.
  function where(n: LibraryNode): string {
    const p = parentTitle(n.id);
    return p !== here ? p : '';
  }
</script>

{#if nb.prev || nb.next}
  <nav class="pager" aria-label="previous and next page" data-testid="learn-pager">
    {#if nb.prev}
      {@const n = nb.prev}
      <button class="pager-link" onclick={() => onselect(n.id)}>
        <span class="pager-dir mono">← Previous{where(n) ? ' · ' + where(n) : ''}</span>
        <span class="pager-title">{n.title}</span>
      </button>
    {:else}<span class="pager-gap"></span>{/if}
    {#if nb.next}
      {@const n = nb.next}
      <button class="pager-link next" onclick={() => onselect(n.id)}>
        <span class="pager-dir mono">Next{where(n) ? ' · ' + where(n) : ''} →</span>
        <span class="pager-title">{n.title}</span>
      </button>
    {/if}
  </nav>
{/if}

<style>
  .pager { display: flex; gap: 10px; margin-top: 30px; padding-top: 16px; border-top: 1px solid var(--line); max-width: 720px; }
  .pager-gap { flex: 1 1 0; }
  .pager-link {
    flex: 1 1 0; min-width: 0; display: flex; flex-direction: column; gap: 3px; text-align: left; cursor: pointer;
    font: inherit; color: var(--ink); background: #fbf6ea; border: 1px solid #e0cfae; border-radius: 9px; padding: 10px 13px;
  }
  .pager-link.next { text-align: right; }
  .pager-link:hover { border-color: var(--accent); }
  .pager-link:focus-visible { outline: 2px solid var(--ink); outline-offset: 2px; }
  .pager-dir { font-size: 8.5px; letter-spacing: .12em; color: #8a7350; text-transform: uppercase; }
  .pager-title { font-size: 15.5px; font-weight: 700; line-height: 1.2; }
  @media (min-width: 981px) { .pager-dir { font-size: 10px; } }
</style>
