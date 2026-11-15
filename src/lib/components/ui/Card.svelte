<script lang="ts">
  // The parchment card every list in the studio is made of. Give it `onclick`
  // and the whole card becomes a button (Enter and Space included); leave it
  // off and it is a plain container.
  import type { Snippet } from 'svelte';
  import { activate } from './tones';
  let { onclick, active = false, label, grow = '', testid, children }: {
    onclick?: () => void;
    active?: boolean;
    /** Accessible name when the card is a button and its text is not enough. */
    label?: string;
    /** flex-basis for cards laid out in a wrapping row, e.g. '290px'. */
    grow?: string;
    testid?: string;
    children: Snippet;
  } = $props();
</script>

{#if onclick}
  <div
    class="ui-card click" class:active class:grow={!!grow} style:--basis={grow || null} data-testid={testid}
    role="button" tabindex="0" aria-label={label} {onclick} onkeydown={activate(onclick)}
  >{@render children()}</div>
{:else}
  <div class="ui-card" class:active class:grow={!!grow} style:--basis={grow || null} data-testid={testid}>{@render children()}</div>
{/if}

<style>
  .ui-card { border: 1px solid #e0cfae; background: #fbf6ea; border-radius: 10px; padding: 13px 15px; min-width: 0; }
  .ui-card.grow { flex: 1 1 var(--basis); min-width: min(100%, calc(var(--basis) - 20px)); max-width: calc(var(--basis) * 1.5); }
  @media (max-width: 600px) { .ui-card.grow { max-width: none; } }
  .ui-card.active { border-color: var(--accent); background: #fbeede; box-shadow: inset 0 0 0 .5px var(--accent); }
  .ui-card.click:hover { border-color: #cbb792; background: #fdf9ef; }
  .ui-card.click.active:hover { border-color: var(--accent); background: #fbeede; }
  .ui-card.click:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
</style>
