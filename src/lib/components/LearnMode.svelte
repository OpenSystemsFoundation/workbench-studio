<script lang="ts">
  // The teaching half of the studio, laid out as a library. A tree of shelves,
  // books and pages sits beside whatever you are reading; a breadcrumb says
  // where that is; a pager turns to the next page. All three read the one
  // catalogue (learn/catalog.ts), and the page itself comes from the registry
  // (learn/pages.ts) — so this component is only the reading room: it knows
  // how the furniture is arranged, not what is on the shelves.
  //
  // Wide enough, the tree is a rail on the left. Narrower — a phone, or a
  // desktop with the instrument panel open at a small window — it folds away
  // behind BROWSE and the index pages do the navigating instead.
  import { useStore } from '../context';
  import { PAGES } from './learn/pages';
  import LibraryTree from './learn/LibraryTree.svelte';
  import LibraryCrumbs from './learn/LibraryCrumbs.svelte';
  import LibraryIndex from './learn/LibraryIndex.svelte';
  import LibraryPager from './learn/LibraryPager.svelte';
  import SectionHead from './ui/SectionHead.svelte';

  const store = useStore();
  const node = $derived(store.learnNode);
  const Page = $derived(node.page ? PAGES[node.page.kind] : null);

  let browsing = $state(false);
  let top: HTMLElement | undefined = $state();

  function go(id: string) {
    browsing = false;
    if (id === store.learnPage) return;
    store.setLearnPage(id);
    // A new page starts at its top, not wherever the last one was scrolled to.
    const y = top?.getBoundingClientRect().top ?? 0;
    if (y < 0) top?.scrollIntoView({ block: 'start' });
  }
</script>

<div class="learn" bind:this={top}>
  <div class="learn-frame" class:browsing>
    <!-- Bar, rail, page — in that order, so on a phone the tree opens right
         under the button that opened it; the wide layout lifts the rail into
         its own column. -->
    <div class="learn-bar">
      <button class="learn-browse mono" data-testid="learn-browse" aria-expanded={browsing} onclick={() => (browsing = !browsing)}>{browsing ? '× CLOSE' : '☰ BROWSE'}</button>
      <LibraryCrumbs current={node.id} onselect={go} />
    </div>

    <aside class="learn-rail">
      <LibraryTree current={node.id} onselect={go} />
    </aside>

    <div class="learn-main">
      {#if Page && node.page}
        <article data-testid="learn-page" data-page={node.id}>
          <SectionHead level="page" title={node.title} tag={node.tag} tone="accent" />
          <Page page={node.page} />
        </article>
        <LibraryPager current={node.id} onselect={go} />
      {:else}
        {#if node.id === ''}
          <SectionHead level="page" title="The library">{node.blurb}</SectionHead>
        {/if}
        <LibraryIndex {node} onselect={go} />
      {/if}
    </div>
  </div>
</div>

<style>
  /* The rail appears by the room Learn actually has, not by the window: with
     the instrument panel open a 1100px window leaves the content ~550px. */
  .learn { container-type: inline-size; scroll-margin-top: 150px; }
  @media (max-width: 980px) { .learn { scroll-margin-top: calc(70px + var(--sat)); } }
  .learn-frame { display: block; }
  .learn-rail {
    display: none; margin-bottom: 16px; padding: 12px;
    background: #f3ead4; border: 1px solid #e0cfae; border-radius: 10px;
  }
  .learn-frame.browsing .learn-rail { display: block; }
  .learn-bar { display: flex; align-items: center; gap: 12px; margin-bottom: 14px; }
  .learn-browse {
    flex: none; font-size: 10px; letter-spacing: .1em; color: #5c4a30; cursor: pointer;
    background: #f6efe0; border: 1.5px solid #cbb792; border-radius: 7px; padding: 9px 12px;
  }
  .learn-browse[aria-expanded='true'] { background: var(--tonic); border-color: var(--tonic); color: #fff; }
  .learn-browse:focus-visible { outline: 2px solid var(--ink); outline-offset: 2px; }
  .learn-main { min-width: 0; }

  @container (min-width: 700px) {
    .learn-frame { display: grid; grid-template-columns: 224px minmax(0, 1fr); gap: 0 26px; align-items: start; }
    .learn-bar, .learn-main { grid-column: 2; }
    .learn-rail, .learn-frame.browsing .learn-rail {
      display: block; grid-column: 1; grid-row: 1 / span 2; position: sticky; top: 134px; margin: 0; padding: 0 14px 0 0;
      max-height: calc(100dvh - 160px); overflow-y: auto;
      background: transparent; border: 0; border-right: 1px solid var(--line); border-radius: 0;
    }
    .learn-browse { display: none; }
  }
</style>
