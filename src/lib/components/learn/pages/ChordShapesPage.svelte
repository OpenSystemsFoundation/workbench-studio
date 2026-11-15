<script lang="ts">
  // Chord qualities as polygons on the circle of fifths.
  import { useStore } from '../../../context';
  import Card from '../../ui/Card.svelte';
  import Legend from '../../ui/Legend.svelte';
  const store = useStore();
  const v = $derived(store.view);
</script>

<p class="caption lead">Plot a chord’s notes on the circle of fifths and join them up: every quality draws one fixed shape. Change the root and the shape just rotates — here the wheel is turned so your tonic sits at 12 o’clock, so each shape is the quality’s fingerprint. Tap one to hear it and see it light up on bass · guitar · piano.</p>

<div class="row">
  {#each v.patShapes as s (s.q)}
    <Card onclick={() => store.hitChord(s.ch)} label={'play ' + s.name}>
      <div class="shape">
        <svg viewBox="0 0 80 80" width="80" height="80" aria-hidden="true">
          <circle cx="40" cy="40" r="30" fill="none" stroke="#e0cfae" stroke-width="1.5" />
          <polygon points={s.poly} fill="rgba(63,107,95,.16)" stroke="#3f6b5f" stroke-width="1.6" stroke-linejoin="round" />
          {#each s.dots as d, di (di)}
            <circle cx={d.x} cy={d.y} r={d.on ? 4 : 1.8} fill={d.root ? '#c2562e' : d.on ? '#3f6b5f' : '#d8c7a8'} />
          {/each}
        </svg>
        <div class="shape-name">{s.name}</div>
        <div class="shape-label mono">{s.label}</div>
      </div>
    </Card>
  {/each}
</div>

<Legend shape="dot" items={[{ name: 'Root', color: '#c2562e' }, { name: 'Chord tone', color: '#3f6b5f' }]} />

<style>
  .lead { font-size: 14px; color: #5c4a30; line-height: 1.5; max-width: 600px; margin: 0 0 14px; }
  .row { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 18px; }
  .shape { width: 84px; text-align: center; }
  .shape svg { display: block; margin: 0 auto; }
  .shape-name { font-size: 14px; font-weight: 700; line-height: 1.1; margin-top: 4px; white-space: nowrap; }
  .shape-label { font-size: 8px; letter-spacing: .06em; color: #8a7350; margin-top: 2px; }
  @media (min-width: 981px) { .shape-label { font-size: 10px; } }
</style>
