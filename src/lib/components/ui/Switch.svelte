<script lang="ts">
  // An on/off toggle. `checked` is bindable; `onchange` is for callers whose
  // setter does more than assign.
  let {
    checked = $bindable(false),
    label,
    onchange,
  }: {
    checked: boolean;
    /** what it toggles, for screen readers */
    label: string;
    onchange?: (on: boolean) => void;
  } = $props();

  function flip() {
    const next = !checked;
    if (onchange) onchange(next);
    else checked = next;
  }
</script>

<button type="button" class="switch" class:on={checked} aria-pressed={checked} aria-label={label} onclick={flip}></button>

<style>
  .switch {
    flex: none; width: 44px; height: 26px; border-radius: 999px; cursor: pointer;
    border: 1px solid var(--line2); background: var(--parch2); position: relative;
    transition: background 0.15s ease;
  }
  .switch::after {
    content: ''; position: absolute; top: 2px; left: 2px; width: 20px; height: 20px;
    border-radius: 50%; background: #fff; box-shadow: 0 1px 3px rgba(60, 40, 16, 0.35);
    transition: left 0.15s ease;
  }
  .switch:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
  .switch.on { background: var(--tonic); border-color: var(--tonic); }
  .switch.on::after { left: 20px; }
</style>
