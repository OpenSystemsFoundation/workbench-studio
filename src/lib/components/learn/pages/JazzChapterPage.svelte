<script lang="ts">
  // One chapter of the jazz & groove harmony book: prose, playable chords,
  // playable sequences and rules of thumb, in the order the chapter wrote them.
  import { useStore } from '../../../context';
  import ChordChip from '../../parts/ChordChip.svelte';
  import PlayButton from '../../ui/PlayButton.svelte';
  import Callout from '../../ui/Callout.svelte';
  import FieldLabel from '../../ui/FieldLabel.svelte';
  const store = useStore();
  const v = $derived(store.view);
</script>

<!-- The chapter intros mark emphasis with *asterisks*. -->
<p class="caption lead">{#each v.jazzIntro.split('*') as part, i (i)}{#if i % 2}<em>{part}</em>{:else}{part}{/if}{/each}</p>

{#each v.jazzBlocks as b, bi (bi)}
  {#if b.kind === 'h'}
    <div class="gap"><FieldLabel>{b.text}</FieldLabel></div>
  {:else if b.kind === 'p'}
    <p class="serif prose">{b.text}</p>
  {:else if b.kind === 'chords'}
    <div class="row">
      {#each b.items ?? [] as c, i (i)}
        <ChordChip size="lg" name={c.name} under={c.sub} color={c.fnColor} tint={c.tint} onplay={() => store.hitChord(c.ch)} />
      {/each}
    </div>
  {:else if b.kind === 'seq'}
    <div class="seq">
      <PlayButton label="PLAY" onclick={() => store.playSeq(b.seqChords ?? [])} />
      <div class="seq-body">
        <span class="mono seq-label">{b.label}</span>
        <div class="row tight">
          {#each b.items ?? [] as c, i (i)}
            <ChordChip name={c.name} under={c.sub} color={c.fnColor} tint={c.tint} onplay={() => store.hitChord(c.ch)} />
          {/each}
        </div>
      </div>
    </div>
  {:else if b.kind === 'callout'}
    <Callout>{b.text}</Callout>
  {/if}
{/each}

<style>
  .lead { font-size: 15px; color: #5c4a30; line-height: 1.5; max-width: 600px; margin: 0 0 18px; }
  .lead em { font-style: normal; font-weight: 600; }
  .prose { font-size: 14.5px; color: #4a3d29; line-height: 1.55; max-width: 600px; margin: 0 0 6px; }
  .gap { margin-top: 16px; }
  .row { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 8px; }
  .row.tight { gap: 7px; margin: 0; }
  .seq {
    display: flex; align-items: center; gap: 10px; flex-wrap: wrap; margin-bottom: 9px;
    background: #f3ead4; border: 1px solid #e0cfae; border-radius: 10px; padding: 11px 12px;
  }
  .seq-body { display: flex; flex-direction: column; gap: 5px; min-width: 0; }
  .seq-label { font-size: 9px; letter-spacing: .06em; color: #7a6b50; }
  @media (min-width: 981px) { .seq-label { font-size: 10.5px; } }
</style>
