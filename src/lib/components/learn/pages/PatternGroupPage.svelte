<script lang="ts">
  // One group of the pattern library — scales, arpeggios, licks — with the
  // chosen pattern lit on bass, guitar and piano.
  import { useStore } from '../../../context';
  import Chip from '../../ui/Chip.svelte';
  import PlayButton from '../../ui/PlayButton.svelte';
  import FieldLabel from '../../ui/FieldLabel.svelte';
  import Legend from '../../ui/Legend.svelte';
  import { activate } from '../../ui/tones';
  const store = useStore();
  const v = $derived(store.view);
</script>

<p class="caption lead">Memorise the shape against its chord — then you know exactly where it sits in the music. Lit on bass · guitar · piano, in {v.keyName}.</p>

<div class="chips" data-testid="pattern-chips">
  {#each v.patChips as p (p.id)}
    <Chip face="serif" tone="accent" selected={p.on} onclick={() => store.setPatId(p.id)}>{p.name}</Chip>
  {/each}
</div>

<div class="detail">
  <div class="detail-name">
    <div class="name">{v.patName}</div>
    <div class="over">
      <span class="mono small">PLAYS OVER</span>
      <span class="click over-chord" role="button" tabindex="0" onclick={() => store.playPatChord()} onkeydown={activate(() => store.playPatChord())}>{v.patChordName}</span>
    </div>
  </div>
  <div class="detail-body">
    <FieldLabel>Formula</FieldLabel>
    <div class="degrees">
      {#each v.patDegrees as d, i (i)}
        <div class="mono degree" style:color={d.color} style:background={d.bg} style:border-color={d.bd}>{d.d}</div>
      {/each}
    </div>
    {#if v.patHasSeq}
      <div class="mono phrase">PHRASE · {v.patSeqNotes}</div>
    {/if}
    <div class="caption tip">{v.patTip}</div>
  </div>
  <div class="detail-play"><PlayButton label="HEAR PATTERN" onclick={() => store.playPattern(v.activePat)} /></div>
</div>

<Legend shape="dot" items={[{ name: 'Root', color: '#c2562e' }, { name: 'Chord tone', color: '#3f6b5f' }, { name: 'Scale tone', color: '#97a59c' }]} />

<style>
  .lead { font-size: 14px; color: #5c4a30; line-height: 1.5; max-width: 600px; margin: 0 0 14px; }
  .chips { display: flex; flex-wrap: wrap; gap: 7px; margin-bottom: 18px; padding-bottom: 16px; border-bottom: 1px solid var(--line); }
  .detail { display: flex; gap: 22px; align-items: flex-start; flex-wrap: wrap; margin-bottom: 18px; }
  .detail-name { flex: none; }
  .name { font-size: 30px; font-weight: 700; line-height: 1.05; letter-spacing: -.01em; }
  .over { display: flex; align-items: center; gap: 8px; margin-top: 10px; }
  .small { font-size: 9px; letter-spacing: .1em; color: #8a7350; }
  .over-chord { font-size: 17px; font-weight: 700; background: #efe2c8; border: 1px solid #cbb792; border-radius: 6px; padding: 6px 12px; }
  .detail-body { flex: 1 1 240px; min-width: 230px; }
  .degrees { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 8px; min-height: 30px; }
  .degree { font-size: 12px; font-weight: 700; border: 1px solid; border-radius: 5px; padding: 6px 10px; }
  .phrase { font-size: 11px; color: #7a6b50; letter-spacing: .04em; margin-bottom: 8px; }
  .tip { font-size: 14px; color: #5c4a30; max-width: 480px; }
  .detail-play { flex: none; align-self: center; }
  @media (min-width: 981px) { .small { font-size: 10.5px; } }
</style>
