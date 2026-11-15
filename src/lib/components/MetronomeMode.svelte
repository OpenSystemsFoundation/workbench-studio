<script lang="ts">
  // The Metronome tab: the click on one side, always in reach, and everything
  // that shapes a practice session in tabbed sections beside (or under) it.
  import './metronome/metronome.css';
  import { useStore } from '../context';
  import ClickTransport from './metronome/ClickTransport.svelte';
  import PracticePanel from './metronome/PracticePanel.svelte';
  import TrainerPanel from './metronome/TrainerPanel.svelte';
  import DronePanel from './metronome/DronePanel.svelte';
  import ListenPanel from './metronome/ListenPanel.svelte';
  import { METRO_TABS, type MetroTab } from './metronome/tabs';

  const store = useStore();
  const met = store.met;

  // The engine + persistence spin up lazily the first time the tab mounts.
  met.init();

  // Which section is open is a per-viewer convenience, so storage failures are ignored.
  const TAB_KEY = 'wb.metTab';
  function readTab(): MetroTab {
    try {
      const t = localStorage.getItem(TAB_KEY);
      if (METRO_TABS.some((x) => x.id === t)) return t as MetroTab;
    } catch { /* private mode */ }
    return 'practice';
  }
  let tab = $state<MetroTab>(readTab());
  function open(t: MetroTab) {
    tab = t;
    try { localStorage.setItem(TAB_KEY, t); } catch { /* private mode */ }
  }
  // A dot on a section's tab says something in it is switched on.
  const live = $derived<Record<MetroTab, boolean>>({
    practice: met.goalType !== 'none',
    trainer: met.automationMode !== 'off' || met.gapEnabled,
    drone: met.droneSounding || met.droneWithClick,
    mic: met.micActive,
  });
  function onTabKey(e: KeyboardEvent) {
    const dir = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
    if (!dir) return;
    e.preventDefault();
    const i = METRO_TABS.findIndex((x) => x.id === tab);
    const next = METRO_TABS[(i + dir + METRO_TABS.length) % METRO_TABS.length];
    open(next.id);
    document.getElementById(`mt-tab-${next.id}`)?.focus();
  }

  // ↑ / ↓ nudge the tempo (Shift for 5) and T taps it, unless a field has the keys.
  $effect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const el = e.target as HTMLElement | null;
      if (el && (/^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName) || el.isContentEditable)) return;
      if (document.querySelector('.wb-cmd')) return; // an overlay owns the keyboard
      if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        e.preventDefault();
        met.nudgeBpm((e.key === 'ArrowUp' ? 1 : -1) * (e.shiftKey ? 5 : 1));
      } else if (e.key.toLowerCase() === 't' && !e.repeat) {
        met.tap();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  // Keep the screen awake while the click is running so the beat stays visible.
  let wakeLock: { release?: () => Promise<void> } | null = null;
  async function requestWakeLock() {
    try {
      const nav = navigator as Navigator & {
        wakeLock?: { request: (t: string) => Promise<{ release?: () => Promise<void> }> };
      };
      if (nav.wakeLock && !wakeLock) wakeLock = await nav.wakeLock.request('screen');
    } catch {
      /* not supported / denied — harmless */
    }
  }
  function releaseWakeLock() {
    try {
      void wakeLock?.release?.();
    } catch {
      /* ignore */
    }
    wakeLock = null;
  }
  $effect(() => {
    if (met.isPlaying) void requestWakeLock();
    else releaseWakeLock();
    return () => releaseWakeLock();
  });
  $effect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible' && met.isPlaying) void requestWakeLock();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  });
</script>

<div class="mt-wrap">
  <div class="mt-grid">
    <div class="mt-side">
      <ClickTransport onOpen={open} />
    </div>

    <div class="mt-panel">
      <!-- svelte-ignore a11y_interactive_supports_focus -->
      <div class="mt-tabs" role="tablist" aria-label="Metronome sections" onkeydown={onTabKey}>
        {#each METRO_TABS as t (t.id)}
          <button
            type="button"
            role="tab"
            id="mt-tab-{t.id}"
            class="mt-tab mono"
            class:on={tab === t.id}
            aria-selected={tab === t.id}
            aria-controls="mt-tabpanel"
            tabindex={tab === t.id ? 0 : -1}
            data-testid="metronome-tab-{t.id}"
            onclick={() => open(t.id)}
          >{t.label}{#if live[t.id]}<span class="mt-dot" title="on" aria-label="on"></span>{/if}</button>
        {/each}
      </div>

      <div id="mt-tabpanel" role="tabpanel" aria-labelledby="mt-tab-{tab}">
        {#if tab === 'practice'}
          <PracticePanel />
        {:else if tab === 'trainer'}
          <TrainerPanel />
        {:else if tab === 'drone'}
          <DronePanel />
        {:else}
          <ListenPanel />
        {/if}
      </div>
    </div>
  </div>
</div>

<style>
  .mt-wrap { container: mt / inline-size; }
  .mt-grid { display: grid; grid-template-columns: minmax(0, 1fr); gap: 16px; max-width: 900px; margin: 0 auto; }
  .mt-side { container: mt-hero / inline-size; min-width: 0; }
  .mt-panel { container: mt-panel / inline-size; min-width: 0; display: flex; flex-direction: column; gap: 14px; }
  /* Wide enough for two columns: the click stays pinned on the left while the
     open section scrolls beside it, so START is never a scroll away. */
  @container mt (min-width: 900px) {
    .mt-grid { grid-template-columns: minmax(360px, 420px) minmax(0, 1fr); gap: 20px; align-items: start; max-width: none; }
    .mt-side { position: sticky; top: 134px; }
  }

  .mt-tabs { display: flex; gap: 2px; border-bottom: 1px solid var(--line2); }
  .mt-tab {
    flex: 1 1 0; min-width: 0; cursor: pointer; white-space: nowrap;
    font-size: 11.5px; letter-spacing: 0.1em; text-transform: uppercase; color: #6e5f45;
    padding: 12px 6px 10px; background: transparent; border: 0; border-bottom: 3px solid transparent;
    margin-bottom: -1px; border-radius: 6px 6px 0 0;
  }
  .mt-tab:hover { background: rgba(194, 86, 46, 0.07); }
  .mt-tab:focus-visible { outline: 2px solid var(--accent); outline-offset: -2px; }
  .mt-tab.on { color: var(--accent); border-bottom-color: var(--accent); font-weight: 700; }
  .mt-dot {
    display: inline-block; width: 6px; height: 6px; margin-left: 6px; border-radius: 50%;
    background: var(--tonic); vertical-align: 2px;
  }
  @container mt (min-width: 900px) {
    .mt-tab { flex: 0 1 auto; padding: 12px 18px 10px; }
  }
</style>
