<script lang="ts">
  // Song structures as proportional, colour-coded timelines: read each bar left
  // to right as the song from start to finish, block width as duration.
  import { useStore } from '../../../context';
  import Card from '../../ui/Card.svelte';
  import Tag from '../../ui/Tag.svelte';
  import Legend from '../../ui/Legend.svelte';
  const store = useStore();
  const v = $derived(store.view);
</script>

<p class="caption lead">Every genre answers the same question — <i>how do we keep a listener for the whole ride?</i> — with a different map. Block width is how long that section lasts. The arc below runs from tight 3-minute pop to its opposite extreme: the 20-minute fusion landscape.</p>

<div class="legend"><Legend items={v.formKindLegend} /></div>

<div class="stack">
  {#each v.songForms as f (f.id)}
    <Card>
      <div class="head">
        <span class="name">{f.name}</span>
        <Tag tone={f.id === 'fusion' ? 'accent' : 'tonic'}>{f.genre}</Tag>
        <span class="mono dur">{f.dur}</span>
      </div>
      <div class="timeline">
        {#each f.sections as s, i (i)}
          <div class="mono block" title={s.label} style:flex-basis="calc({s.pct}% - 2px)" style:background={s.bg}>{s.label}</div>
        {/each}
      </div>
      <div class="serif text">{f.text}</div>
      <div class="caption listen"><b>Hear it:</b> {f.listen}</div>
    </Card>
  {/each}
</div>

<style>
  .lead { font-size: 14px; color: #5c4a30; line-height: 1.5; max-width: 600px; margin: 0 0 12px; }
  .legend { margin-bottom: 14px; }
  .stack { display: flex; flex-direction: column; gap: 12px; max-width: 720px; }
  .head { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; margin-bottom: 9px; }
  .name { font-size: 17px; font-weight: 700; }
  .dur { font-size: 9px; color: #a08a64; }
  .timeline { display: flex; gap: 2px; height: 34px; margin-bottom: 9px; }
  .block {
    flex: 0 0 auto; border-radius: 4px; color: #fff; font-size: 7px; letter-spacing: .02em; line-height: 1.15;
    display: flex; align-items: center; justify-content: center; text-align: center; overflow: hidden; padding: 0 2px;
  }
  .text { font-size: 14.5px; color: #4a3d29; line-height: 1.55; margin-bottom: 7px; }
  .listen { font-size: 12px; color: #8a7350; }
  @media (min-width: 981px) { .dur { font-size: 10.5px; } .block { font-size: 8px; } }
</style>
