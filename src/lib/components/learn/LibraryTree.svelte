<script lang="ts">
  // The library's side rail: a search box over a collapsible tree of shelves,
  // books and pages. It draws whatever the catalogue holds, to any depth, and
  // knows nothing about what a page contains.
  //
  // A branch row has two targets: its name opens the branch's index page, its
  // caret only folds it. The branches above the page you are on are always
  // open, so the tree can never hide where you are.
  import { LIBRARY, pathTo, pathLabel, searchLibrary, type LibraryNode } from '../../learn/catalog';

  let { current, onselect }: { current: string; onselect: (id: string) => void } = $props();

  let query = $state('');
  // Only what the reader has explicitly folded or unfolded; everything else
  // falls back to the default (shelves open, books closed).
  let folded = $state<Record<string, boolean>>({});

  const trail = $derived(new Set(pathTo(current).map((n) => n.id)));
  const hits = $derived(searchLibrary(query));

  function isOpen(n: LibraryNode, depth: number): boolean {
    if (trail.has(n.id)) return true;
    return n.id in folded ? !folded[n.id] : depth === 0;
  }
  function toggle(n: LibraryNode, depth: number) { folded[n.id] = isOpen(n, depth); }
  function go(id: string) { query = ''; onselect(id); }

  // Up and Down walk the visible rows, so the tree reads as one list from the
  // keyboard instead of a tab stop per row.
  function onKey(e: KeyboardEvent) {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
    const rows = Array.from((e.currentTarget as HTMLElement).querySelectorAll<HTMLElement>('[data-row]'));
    const i = rows.indexOf(document.activeElement as HTMLElement);
    const next = rows[e.key === 'ArrowDown' ? i + 1 : i - 1];
    if (next) { e.preventDefault(); next.focus(); }
  }
</script>

<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<nav class="tree" aria-label="Learn library" data-testid="learn-tree" onkeydown={onKey}>
  <input
    class="tree-search" type="search" placeholder="Search the library" aria-label="search the library"
    data-testid="learn-search" data-row bind:value={query}
  />

  {#if query.trim()}
    <ul class="tree-list" data-testid="learn-search-results">
      {#each hits as n (n.id)}
        <li>
          <button class="tree-hit" data-row onclick={() => go(n.id)}>
            <span class="tree-hit-title">{n.title}</span>
            <span class="tree-hit-path mono">{pathLabel(n.id)}</span>
          </button>
        </li>
      {:else}
        <li class="tree-empty caption">Nothing on the shelves matches “{query.trim()}”.</li>
      {/each}
    </ul>
  {:else}
    <button class="tree-row tree-home" class:current={current === ''} aria-current={current === '' ? 'page' : undefined} data-row onclick={() => go('')}>
      <span class="tree-glyph" aria-hidden="true">♭</span>Library
    </button>
    {@render branch(LIBRARY.children ?? [], 0)}
  {/if}
</nav>

{#snippet branch(nodes: LibraryNode[], depth: number)}
  <ul class="tree-list" class:nested={depth > 0}>
    {#each nodes as n (n.id)}
      {@const open = !!n.children && isOpen(n, depth)}
      <li>
        <div class="tree-line">
          {#if n.children}
            <button
              class="tree-caret" aria-label={(open ? 'collapse ' : 'expand ') + n.title} aria-expanded={open}
              disabled={trail.has(n.id)} onclick={() => toggle(n, depth)}
            >{open ? '▾' : '▸'}</button>
          {:else}
            <span class="tree-caret leaf" aria-hidden="true">·</span>
          {/if}
          <button
            class="tree-row" class:shelf={depth === 0} class:book={depth > 0 && !!n.children}
            class:current={current === n.id} class:within={trail.has(n.id) && current !== n.id}
            aria-current={current === n.id ? 'page' : undefined} data-row onclick={() => go(n.id)}
          >{n.title}</button>
        </div>
        {#if open}{@render branch(n.children!, depth + 1)}{/if}
      </li>
    {/each}
  </ul>
{/snippet}

<style>
  .tree { font-family: var(--serif); }
  .tree-search {
    width: 100%; margin-bottom: 10px; padding: 8px 10px; font: inherit; font-size: 14px; color: var(--ink);
    background: #fbf6ea; border: 1px solid #cbb792; border-radius: 7px;
  }
  .tree-search:focus-visible { outline: 2px solid var(--accent); outline-offset: 1px; }
  .tree-list { list-style: none; margin: 0; padding: 0; }
  .tree-list.nested { margin-left: 11px; padding-left: 7px; border-left: 1px solid var(--line); }
  .tree-line { display: flex; align-items: stretch; }
  .tree-caret {
    flex: none; width: 22px; padding: 0; border: 0; background: transparent; cursor: pointer;
    font-size: 11px; color: #8a7350; border-radius: 5px;
  }
  .tree-caret:disabled { cursor: default; color: #b9a680; }
  .tree-caret:not(:disabled):hover { background: #efe2c8; }
  .tree-caret.leaf { display: inline-flex; align-items: center; justify-content: center; cursor: default; color: #cbb792; }
  .tree-row {
    flex: 1 1 auto; min-width: 0; text-align: left; border: 0; background: transparent; cursor: pointer;
    font: inherit; font-size: 14.5px; line-height: 1.25; color: #5c4a30; padding: 7px 8px; border-radius: 6px;
  }
  .tree-row:hover { background: #efe2c8; }
  .tree-row.shelf {
    font-family: var(--mono); font-size: 10.5px; letter-spacing: .12em; text-transform: uppercase; color: #7a6540;
    padding-top: 9px; padding-bottom: 9px;
  }
  .tree-row.book { font-weight: 600; color: var(--ink); }
  .tree-row.within { color: var(--accent); }
  .tree-row.current { background: var(--accent); color: #fff; }
  .tree-home { display: flex; align-items: center; gap: 8px; width: 100%; font-weight: 700; color: var(--ink); margin-bottom: 2px; }
  .tree-glyph { width: 14px; text-align: center; color: var(--accent); }
  .tree-home.current .tree-glyph { color: #fff; }
  .tree-row:focus-visible, .tree-caret:focus-visible, .tree-hit:focus-visible { outline: 2px solid var(--ink); outline-offset: -2px; }
  .tree-hit {
    display: flex; flex-direction: column; gap: 2px; width: 100%; text-align: left; cursor: pointer;
    border: 0; background: transparent; font: inherit; padding: 8px; border-radius: 6px;
  }
  .tree-hit:hover { background: #efe2c8; }
  .tree-hit-title { font-size: 14.5px; font-weight: 600; color: var(--ink); }
  .tree-hit-path { font-size: 9px; letter-spacing: .05em; color: #8a7350; }
  .tree-empty { font-size: 13.5px; padding: 8px; }
  /* Touch layouts get a full-size target per row. */
  @media (max-width: 980px) {
    .tree-row { padding-top: 11px; padding-bottom: 11px; font-size: 15.5px; }
    .tree-row.shelf { font-size: 11px; padding-top: 12px; padding-bottom: 12px; }
    .tree-caret { width: 34px; font-size: 13px; }
    .tree-search { font-size: 16px; padding: 10px 12px; }
  }
</style>
