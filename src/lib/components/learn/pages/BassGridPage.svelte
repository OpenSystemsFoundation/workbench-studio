<script lang="ts">
  // The legend that explains what the coloured cells in the Bass tab's grids
  // actually mean.
  import { useStore } from '../../../context';
  import Legend from '../../ui/Legend.svelte';
  const store = useStore();
  const v = $derived(store.view);
</script>

<p class="caption lead">A line is written as one bar of sixteenths, and each cell holds a <i>degree</i> rather than a note — so the same line transposes itself through every change. Each note sustains up to the next, which is what makes a written-out line sound legato rather than plucked.</p>
<div class="legend"><Legend items={v.bassLegend} /></div>
<p class="caption lead">↑↓ approach the next chord by a semitone; → lands its root early. On <b>½ BAR</b> changes each half of the line resolves against its own chord, so the approach notes always walk into whatever is actually coming. Use <b>MIX</b> in the Bass tab to mute the chords and study the line alone.</p>

<style>
  .lead { font-size: 14px; color: #5c4a30; line-height: 1.5; max-width: 600px; margin: 0 0 14px; }
  .legend { margin-bottom: 14px; }
</style>
