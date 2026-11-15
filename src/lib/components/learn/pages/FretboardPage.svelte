<script lang="ts">
  // Neck diagrams: movable shapes anchored to the current key. Every diagram
  // plays when tapped.
  import { useStore } from '../../../context';
  import FretDiagram from '../../FretDiagram.svelte';
  import Card from '../../ui/Card.svelte';
  import Tag from '../../ui/Tag.svelte';
  import PlayButton from '../../ui/PlayButton.svelte';
  import Legend from '../../ui/Legend.svelte';
  import { activate } from '../../ui/tones';
  const store = useStore();
  const v = $derived(store.view);
  const LEGEND = [
    { name: 'Root', color: '#c2562e' }, { name: '3rd', color: '#3f6b5f' }, { name: '5th', color: '#97a59c' },
    { name: '7th', color: '#b07d23' }, { name: 'Colour (2·4·6)', color: '#7a5ea8' }, { name: 'Barre', color: '#4a3a28' },
  ];
</script>

<p class="caption lead">{v.patFretIntro}</p>

<div class="cards">
  {#each v.patFretCards as card (card.id)}
    <Card grow="300px">
      <div class="head">
        <span class="name">{card.name}</span>
        <Tag>{card.tag}</Tag>
      </div>
      <div class="diagrams">
        {#each card.diagrams as d, di (di)}
          <div class="click diagram" role="button" tabindex="0" aria-label={'play ' + card.name + ' ' + d.name} onclick={() => store.playFretDiagram(d)} onkeydown={activate(() => store.playFretDiagram(d))}>
            <div class="mono diagram-name">{d.name.toUpperCase()} · ▶</div>
            <FretDiagram {d} />
          </div>
        {/each}
        {#if !card.diagrams.length && card.phrase}
          <PlayButton label="HEAR THE PHRASE" onclick={() => store.playPattern({ seq: card.phrase })} />
        {/if}
      </div>
      <div class="caption tip">{card.tip}</div>
    </Card>
  {/each}
</div>

<Legend shape="dot" items={LEGEND} />

<style>
  .lead { font-size: 14px; color: #5c4a30; line-height: 1.5; max-width: 600px; margin: 0 0 14px; }
  .cards { display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 18px; }
  .head { display: flex; align-items: center; gap: 9px; flex-wrap: wrap; margin-bottom: 8px; }
  .name { font-size: 16px; font-weight: 700; line-height: 1.1; }
  .diagrams { display: flex; gap: 14px; flex-wrap: wrap; align-items: flex-start; margin-bottom: 8px; }
  .diagram { flex: none; }
  .diagram-name { font-size: 7.5px; letter-spacing: .08em; color: #a08a64; margin-bottom: 3px; }
  .tip { font-size: 12.5px; color: #6b5a3e; line-height: 1.45; }
  @media (min-width: 981px) { .diagram-name { font-size: 9.5px; } }
</style>
