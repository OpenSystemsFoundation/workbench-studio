<script lang="ts">
  // The mono small-caps line that names the row of controls under it.
  import type { Snippet } from 'svelte';
  let { children }: { children: Snippet } = $props();
</script>

<div class="ui-label mono">{@render children()}</div>

<style>
  .ui-label { font-size: 9px; letter-spacing: .12em; color: #8a7350; margin-bottom: 6px; text-transform: uppercase; }
  @media (min-width: 981px) { .ui-label { font-size: 10.5px; } }
</style>
