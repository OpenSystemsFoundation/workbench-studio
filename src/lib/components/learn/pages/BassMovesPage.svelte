<script lang="ts">
  // The handful of moves behind every bassline, each with a one-bar demo over
  // the current key.
  import { useStore } from '../../../context';
  import Card from '../../ui/Card.svelte';
  import Chip from '../../ui/Chip.svelte';
  const store = useStore();
  const v = $derived(store.view);
</script>

<p class="caption lead">Tap one to hear a one-bar demo in {v.keyName}. Build lines from them over in <b>Bass</b>.</p>

<div class="row">
  {#each v.bassTricks as tk (tk.id)}
    <Card grow="205px" onclick={() => store.playTrick(tk.id)} label={'hear ' + tk.name}>
      <div class="head">
        <span class="name">{tk.name}</span>
        <span class="mono glyph">▶</span>
      </div>
      <div class="caption why">{tk.why}</div>
    </Card>
  {/each}
</div>

<Chip onclick={() => store.setMode('bass')}>Open Bass →</Chip>

<style>
  .lead { font-size: 14px; color: #5c4a30; line-height: 1.5; max-width: 600px; margin: 0 0 14px; }
  .row { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 18px; }
  .head { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 3px; }
  .name { font-size: 15px; font-weight: 700; }
  .glyph { font-size: 9px; color: var(--accent); }
  .why { font-size: 12px; color: #6b5a3e; }
</style>
