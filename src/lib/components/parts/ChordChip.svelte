<script lang="ts">
  // One chord you can hear and, optionally, keep. Tap the chip to play it; the
  // `+` (present when `onadd` is given) places it into the progression. The
  // lessons, both palettes and the chapter examples all draw this same chip,
  // so a chord looks and behaves the same wherever it is taught.
  import { activate } from '../ui/tones';
  let { name, over = '', under = '', color = '#3f6b5f', tint = '#f6efe0', variant = 'solid', size = 'md', onplay, onadd }: {
    name: string;
    /** Small line above the name: usually the roman numeral. */
    over?: string;
    /** Small line below the name: the chord tones, or a note on its colour. */
    under?: string;
    color?: string;
    tint?: string;
    /** `banded` carries a function-colour bar on top; `dashed` marks a chord from outside the key. */
    variant?: 'solid' | 'banded' | 'dashed';
    size?: 'sm' | 'md' | 'lg';
    onplay: () => void;
    onadd?: () => void;
  } = $props();

  function add(e: Event) { e.stopPropagation(); onadd?.(); }
</script>

<div
  class="chord-chip click {variant} {size}" class:addable={!!onadd} style:--c={color} style:--tint={tint}
  role="button" tabindex="0" aria-label={'play ' + name} onclick={onplay} onkeydown={activate(onplay)}
>
  {#if variant === 'banded'}<div class="chord-chip-band"></div>{/if}
  {#if over}<div class="chord-chip-small over mono">{over}</div>{/if}
  <div class="chord-chip-name">{name}</div>
  {#if under}<div class="chord-chip-small mono">{under}</div>{/if}
  {#if onadd}
    <div class="chord-chip-add mono" role="button" tabindex="0" aria-label={'add ' + name + ' to the progression'} onclick={add} onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); add(e); } }}>+</div>
  {/if}
</div>

<style>
  .chord-chip {
    position: relative; text-align: center; overflow: hidden;
    border: 1.5px solid var(--c); background: var(--tint); border-radius: 7px; padding: 7px 12px;
  }
  .chord-chip.dashed { border-style: dashed; }
  .chord-chip.addable { padding-right: 25px; }
  .chord-chip.banded { flex: 1 1 76px; min-width: 72px; padding: 0 4px 7px; }
  .chord-chip.banded.addable { padding-right: 4px; }
  .chord-chip-band { height: 4px; margin: 0 -4px 6px; background: var(--c); }
  .chord-chip-name { font-size: 15px; font-weight: 700; color: var(--ink); line-height: 1.1; white-space: nowrap; }
  .chord-chip.sm .chord-chip-name { font-size: 14px; font-weight: 600; }
  .chord-chip.lg { min-width: 96px; padding: 9px 13px; border-radius: 8px; }
  .chord-chip.lg .chord-chip-name { font-size: 18px; }
  .chord-chip-small { font-size: 8.5px; letter-spacing: .02em; color: var(--c); margin: 2px 0; }
  /* The numeral steps aside for the + rather than sliding under it. */
  .chord-chip.banded.addable .over { text-align: left; padding-left: 3px; }
  .chord-chip-add {
    position: absolute; top: 5px; right: 4px; width: 17px; height: 17px; border-radius: 50%;
    background: #fff; border: 1px solid var(--c); color: var(--c); font-size: 11px; line-height: 15px; text-align: center;
  }
  .chord-chip-add:hover { background: var(--c); color: #fff; }
  .chord-chip:focus-visible, .chord-chip-add:focus-visible { outline: 2px solid var(--ink); outline-offset: 2px; }
  @media (min-width: 981px) { .chord-chip-small { font-size: 10px; } }
</style>
