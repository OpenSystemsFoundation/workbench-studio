<script lang="ts" generics="T extends string | number">
  // A row of mutually exclusive choices. One is always selected; `value` is
  // bindable, and `onchange` fires for callers that need a side effect.
  type Option = { id: T; label: string };
  let {
    options,
    value = $bindable(),
    label,
    wrap = false,
    onchange,
  }: {
    options: readonly Option[];
    value: T;
    /** what the group chooses, for screen readers */
    label: string;
    /** many or long labels: let the row wrap instead of squeezing */
    wrap?: boolean;
    onchange?: (id: T) => void;
  } = $props();

  function pick(id: T) {
    value = id;
    onchange?.(id);
  }
</script>

<div class="seg" class:wrap role="tablist" aria-label={label}>
  {#each options as o (o.id)}
    <button type="button" role="tab" aria-selected={value === o.id} class:on={value === o.id} onclick={() => pick(o.id)}>{o.label}</button>
  {/each}
</div>

<style>
  .seg {
    display: flex; gap: 4px; flex-wrap: wrap; padding: 4px;
    background: var(--parch2); border: 1px solid var(--line2); border-radius: 8px;
  }
  button {
    flex: 1; min-width: 0; white-space: nowrap; cursor: pointer;
    font-family: var(--mono); font-size: 11px; letter-spacing: 0.04em;
    padding: 8px 6px; border-radius: 6px; border: 0; background: transparent; color: #5c4a30;
  }
  button:hover:not(.on) { background: rgba(194, 86, 46, 0.1); }
  button:focus-visible { outline: 2px solid var(--accent); outline-offset: 1px; }
  button.on { background: var(--accent); color: #fff; }
  .wrap button { flex: 1 0 auto; padding: 8px 10px; }
</style>
