<script lang="ts">
  // The click itself: tempo, the beat display, start/stop and tap, with the
  // meter and the studio tempo link right beside them. Everything you touch
  // while playing lives here so it never scrolls out of reach.
  import { useStore } from '../../context';
  import { tempoMarking } from '../../metronome/timing';
  import { keyNameStr } from '../../engine/theory';
  import Segmented from '../ui/Segmented.svelte';
  import Switch from '../ui/Switch.svelte';
  import type { MetroTab } from './tabs';

  let { onOpen }: { onOpen: (tab: MetroTab) => void } = $props();

  const store = useStore();
  const met = store.met;

  const beats = $derived(Array.from({ length: Math.max(1, met.beatsPerBar) }, (_, i) => i));
  const showLive = $derived(
    met.isPlaying && (met.automationMode !== 'off' || (met.micActive && met.micFollow)),
  );
  const nowBpm = $derived(met.isPlaying ? met.liveBpm : met.bpm);

  // ---- type a tempo straight into the big number ----
  let editing = $state(false);
  let draft = $state<number | null>(null); // a number input binds numbers
  function startEdit() {
    draft = met.bpm;
    editing = true;
  }
  function commitEdit() {
    if (editing && draft != null && Number.isFinite(draft)) met.setBpm(draft);
    editing = false;
  }
  function focusSelect(el: HTMLInputElement) {
    el.focus();
    el.select();
  }

  // ---- tap tempo, with a flash so each tap visibly lands ----
  let tapFlash = $state(0);
  function tap() {
    met.tap();
    tapFlash++;
  }

  // On a phone the meter and tempo link fold away so the sections below the
  // click stay within a thumb's reach; wider layouts always show them.
  let setupOpen = $state(false);

  // ---- meter ----
  const SIGNATURES: [number, number][] = [[2, 4], [3, 4], [4, 4], [5, 4], [6, 8], [7, 8], [12, 8]];
  const isPreset = $derived(SIGNATURES.some(([n, d]) => n === met.beatsPerBar && d === met.beatUnit));
  let customOpen = $state(false);
  const showCustom = $derived(customOpen || !isPreset);
  function setSignature(n: number, d: number) {
    met.beatsPerBar = n;
    met.beatUnit = d;
    customOpen = false;
  }
  const subdivisions = [
    { id: 1, label: 'None' },
    { id: 2, label: 'Eighths' },
    { id: 3, label: 'Triplets' },
    { id: 4, label: '16ths' },
  ];

  // ---- what else is running, each a shortcut to its settings ----
  const active = $derived.by(() => {
    const out: { tab: MetroTab; text: string }[] = [];
    if (met.automationMode !== 'off') out.push({ tab: 'trainer', text: met.automationLabel().split(' · ')[0] });
    if (met.gapEnabled) out.push({ tab: 'trainer', text: 'Gap click' });
    if (met.droneSounding || met.droneWithClick) out.push({ tab: 'drone', text: `Drone ${met.droneName}` });
    if (met.micActive) out.push({ tab: 'mic', text: met.micFollow ? 'Mic is following' : 'Mic is listening' });
    return out;
  });

  const planSection = $derived(met.planPos ? met.plan.sections[met.planPos.index] : null);
  const planReadout = $derived.by(() => {
    const pos = met.planPos;
    if (!pos || !planSection) return '';
    const parts = [
      `section ${pos.index + 1}/${met.plan.sections.length}`,
      `bar ${pos.barInSection + 1}/${Math.max(1, planSection.bars)}`,
    ];
    if (pos.loop > 0) parts.push(`pass ${pos.loop + 1}`);
    const n = met.planNext;
    if (n) {
      const name = keyNameStr(n.key.tonicPc, n.key.scale);
      parts.push(n.inBars === 1 ? `${name} next bar` : `${name} in ${n.inBars} bars`);
    }
    return parts.join(' · ');
  });
</script>

<section class="card hero" data-testid="metronome-transport">
  <div class="main">
    <div class="top">
      <span class="eyebrow">Practice click</span>
      <span class="marking">{tempoMarking(nowBpm)} · {met.beatsPerBar}/{met.beatUnit}</span>
    </div>

    <div class="bpm">
      {#if editing}
        <input
          class="bpm-num bpm-edit"
          type="number"
          min="20"
          max="400"
          inputmode="numeric"
          aria-label="Type a tempo"
          bind:value={draft}
          use:focusSelect
          onblur={commitEdit}
          onkeydown={(e) => {
            if (e.key === 'Enter') commitEdit();
            else if (e.key === 'Escape') editing = false;
          }}
        />
      {:else}
        <button type="button" class="bpm-num" data-testid="metronome-bpm" title="Click to type a tempo" aria-label="Tempo {met.bpm} BPM, click to type" onclick={startEdit}>{met.bpm}</button>
      {/if}
      <span class="bpm-unit mono">BPM</span>
    </div>

    <div class="lives" aria-live="polite">
      {#if showLive}
        <span class="live mono">playing <strong>{met.liveBpm}</strong></span>
      {/if}
      {#if met.droneSounding}
        <span class="live mono" data-testid="metronome-drone-now">drone <strong>{met.droneName}</strong></span>
      {/if}
      {#if planReadout}
        <span class="live mono" class:warn={met.planNext?.inBars === 1} data-testid="metronome-plan-now">{planReadout}</span>
      {/if}
    </div>

    <div
      class="beats"
      class:dense={beats.length > 8}
      role="img"
      aria-label={met.isPlaying
        ? `Beat ${met.currentBeat + 1} of ${met.beatsPerBar}`
        : `${met.beatsPerBar} beats per bar`}
    >
      {#each beats as i (i)}
        <div
          class="beat mono"
          class:accent={i === 0 && met.accentFirst}
          class:active={met.isPlaying && met.currentBeat === i}
        >{i + 1}</div>
      {/each}
    </div>

    <input
      class="slider"
      type="range"
      min="20"
      max="300"
      step="1"
      bind:value={met.bpm}
      aria-label="Tempo in beats per minute"
    />

    <div class="nudges">
      <button type="button" class="btn" onclick={() => met.nudgeBpm(-5)}>−5</button>
      <button type="button" class="btn" onclick={() => met.nudgeBpm(-1)}>−1</button>
      <button type="button" class="btn" onclick={() => met.nudgeBpm(1)}>+1</button>
      <button type="button" class="btn" onclick={() => met.nudgeBpm(5)}>+5</button>
    </div>

    <div class="go">
      <button
        type="button"
        class="play"
        class:stop={met.isPlaying}
        data-testid="metronome-play"
        onclick={() => met.toggle()}
      >
        {met.isPlaying ? '■ STOP' : '▶ START'}
      </button>
      {#key tapFlash}
        <button type="button" class="tap" class:flash={tapFlash > 0} data-testid="metronome-tap" title="Tap the beat to set the tempo" onclick={tap}>TAP</button>
      {/key}
    </div>

    <div class="readout">
      <div class="stat">
        <span class="stat-num" data-testid="metronome-bars">{met.sessionBars}</span>
        <span class="stat-lbl eyebrow">bars</span>
      </div>
      <div class="stat mid">
        <span class="stat-num">{met.elapsedLabel}</span>
        <span class="stat-lbl eyebrow">elapsed</span>
      </div>
      <div class="stat">
        <span class="stat-num">{nowBpm}</span>
        <span class="stat-lbl eyebrow">bpm now</span>
      </div>
    </div>

    {#if met.goalType !== 'none'}
      <button type="button" class="goal" data-testid="metronome-goal-now" title="Open the session goal" onclick={() => onOpen('practice')}>
        <span class="progress" aria-hidden="true"><span class="progress-fill" style="width:{met.goalProgress * 100}%"></span></span>
        <span class="mono goal-txt">{met.goalJustReached ? '✓ goal reached' : met.goalRemainingLabel}</span>
      </button>
    {/if}

    {#if active.length}
      <div class="active" data-testid="metronome-active">
        {#each active as a (a.text)}
          <button type="button" class="chip on" title="Open its settings" onclick={() => onOpen(a.tab)}>{a.text}</button>
        {/each}
      </div>
    {/if}
  </div>

  <div class="setup" class:closed={!setupOpen}>
    <button type="button" class="setup-toggle mono" aria-expanded={setupOpen} data-testid="metronome-setup-toggle" onclick={() => (setupOpen = !setupOpen)}>
      <span>Meter &amp; studio tempo</span>
      <span>{met.beatsPerBar}/{met.beatUnit}{met.linkTempo ? ' · linked' : ''} {setupOpen ? '▾' : '▸'}</span>
    </button>
    <!-- ---- meter & click sound ---- -->
    <div class="block" data-testid="metronome-sound">
      <div class="field" style="margin-top:0">
        <span class="lbl">Time signature</span>
        <div class="sigs">
          {#each SIGNATURES as [n, d] (`${n}/${d}`)}
            <button
              type="button"
              class="chip"
              class:on={!customOpen && met.beatsPerBar === n && met.beatUnit === d}
              aria-pressed={met.beatsPerBar === n && met.beatUnit === d}
              onclick={() => setSignature(n, d)}>{n}/{d}</button
            >
          {/each}
          <button type="button" class="chip" class:on={showCustom} aria-pressed={showCustom} aria-expanded={showCustom} onclick={() => (customOpen = !customOpen)}>Other</button>
        </div>
      </div>
      {#if showCustom}
        <div class="fields">
          <div class="field">
            <label for="mt-bpb">Beats per bar</label>
            <input id="mt-bpb" type="number" min="1" max="16" bind:value={met.beatsPerBar} />
          </div>
          <div class="field">
            <label for="mt-unit">Beat unit</label>
            <select id="mt-unit" bind:value={met.beatUnit}>
              <option value={2}>2 — half</option>
              <option value={4}>4 — quarter</option>
              <option value={8}>8 — eighth</option>
            </select>
          </div>
        </div>
      {/if}
      <div class="field">
        <span class="lbl">Subdivision</span>
        <Segmented label="Subdivision" options={subdivisions} bind:value={met.subdivision} />
      </div>
      <div class="fields mix">
        <div class="field toggle-field">
          <span class="lbl">Accent beat 1</span>
          <Switch bind:checked={met.accentFirst} label="Toggle accent on first beat" />
        </div>
        <div class="field">
          <label for="mt-vol">Click volume — {Math.round(met.volume * 100)}%</label>
          <input id="mt-vol" class="slider" type="range" min="0" max="1" step="0.01" bind:value={met.volume} />
        </div>
      </div>
    </div>

    <!-- Bridge to the studio's shared transport tempo. By default the two
         clocks stay independent (a ramp drill shouldn't drag the groovebox
         along) and one tap copies the BPM either way. The link toggle makes
         them follow each other; drills pause it while they run. -->
    <div class="block sync">
      <div class="row spread">
        <span class="eyebrow">Studio tempo {store.tempo}</span>
        <button
          type="button"
          class="chip"
          class:on={met.linkTempo}
          aria-pressed={met.linkTempo}
          data-testid="metronome-link"
          title="Keep the click and the studio at the same tempo"
          onclick={() => (met.linkTempo = !met.linkTempo)}
        >⛓ {met.linkTempo ? 'Linked' : 'Link'}{met.linkTempo && !met.linkActive ? ' (paused)' : ''}</button>
      </div>
      {#if !met.linkActive}
        <div class="sync-acts">
          <button type="button" class="chip" data-testid="metronome-sync-from" onclick={() => met.setBpm(store.tempo)}>↓ Use studio tempo</button>
          <button type="button" class="chip" data-testid="metronome-sync-to" onclick={() => store.setTempo(met.bpm)}>↑ Send to studio</button>
        </div>
      {:else}
        <div class="caption" style="font-size:12px">The click and the studio follow each other.</div>
      {/if}
    </div>

    {#if store.isDesktop}
      <div class="keys mono">
        <kbd>Space</kbd> start · <kbd>↑</kbd><kbd>↓</kbd> tempo · <kbd>T</kbd> tap
      </div>
    {/if}
  </div>
</section>

<style>
  .hero { display: grid; grid-template-columns: 1fr; gap: 18px; padding: 18px; }
  .main { display: flex; flex-direction: column; gap: 12px; min-width: 0; text-align: center; }
  .setup { display: flex; flex-direction: column; gap: 14px; min-width: 0; }
  /* Room to spare but not enough for the page's own two columns: the click
     splits in two so the meter sits beside the tempo instead of below it. */
  @container mt-hero (min-width: 640px) {
    .hero { grid-template-columns: minmax(0, 1.1fr) minmax(0, 1fr); gap: 24px; align-items: start; }
    .setup { padding-left: 24px; border-left: 1px solid var(--line); height: 100%; }
  }

  .setup-toggle { display: none; }
  @container mt (max-width: 639px) {
    .setup-toggle {
      display: flex; justify-content: space-between; gap: 10px; width: 100%; cursor: pointer;
      font-size: 11px; letter-spacing: 0.08em; text-transform: uppercase; color: #5c4a30;
      padding: 11px 12px; border-radius: 8px; border: 1px solid var(--line2); background: var(--parch);
    }
    .setup.closed > :not(.setup-toggle) { display: none; }
  }

  .top { display: flex; align-items: baseline; justify-content: space-between; gap: 10px; }
  .marking { font-style: italic; font-size: 15px; color: #6e5f45; }

  .bpm { display: flex; align-items: baseline; justify-content: center; gap: 8px; }
  .bpm-num {
    font-family: var(--serif); font-size: 5rem; font-weight: 800; line-height: 0.95; letter-spacing: -0.04em;
    color: var(--accent); font-variant-numeric: tabular-nums;
    background: transparent; border: 0; border-bottom: 2px dashed transparent; padding: 0 4px; cursor: text;
  }
  button.bpm-num:hover, button.bpm-num:focus-visible { border-bottom-color: var(--gold); outline: none; }
  .bpm-edit { width: 3.4ch; text-align: center; border-bottom-color: var(--accent); outline: none; -moz-appearance: textfield; appearance: textfield; }
  .bpm-edit::-webkit-outer-spin-button, .bpm-edit::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
  .bpm-unit { font-size: 12px; font-weight: 700; color: #8a7350; letter-spacing: 0.14em; }

  .lives { display: flex; flex-direction: column; gap: 2px; min-height: 0; margin-top: -6px; }
  .live { font-size: 11.5px; color: var(--tonic); }
  .live.warn { color: var(--accent); font-weight: 700; }

  /* One block per beat, wide enough to read from across the room. */
  .beats { display: flex; gap: 6px; align-items: stretch; height: 40px; }
  .beat {
    flex: 1; min-width: 0; display: flex; align-items: center; justify-content: center;
    font-size: 12px; font-weight: 700; color: #a08a64; border-radius: 7px;
    background: var(--parch2); box-shadow: inset 0 0 0 1px var(--line2);
    transition: background 0.1s ease, box-shadow 0.1s ease, transform 0.08s ease, color 0.1s ease;
  }
  .beats.dense { gap: 3px; }
  .beats.dense .beat { font-size: 0; }
  .beat.accent { box-shadow: inset 0 0 0 2px var(--gold); color: #8a6a2c; }
  .beat.active { background: var(--tonic); color: #fff; transform: scaleY(1.12); box-shadow: 0 0 14px 1px rgba(63, 107, 95, 0.5); }
  .beat.accent.active { background: var(--accent); box-shadow: 0 0 16px 2px rgba(194, 86, 46, 0.55); }

  .nudges { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
  .btn {
    font-family: var(--mono); font-size: 13px; cursor: pointer;
    padding: 9px 0; border-radius: 7px; border: 1px solid var(--line2);
    background: var(--parch); color: #5c4a30;
  }
  .btn:hover { background: #fbf4e4; }
  .btn:active { background: var(--parch2); }

  .go { display: grid; grid-template-columns: 1fr 84px; gap: 10px; padding-bottom: 4px; }
  .play, .tap {
    font-family: var(--mono); font-size: 15px; letter-spacing: 0.12em; font-weight: 700;
    cursor: pointer; padding: 16px 0; border-radius: 9px;
  }
  .play { border: 0; background: var(--accent); color: #fff; box-shadow: 0 4px 0 var(--accent-dark); }
  .play.stop { background: var(--accent-dark); box-shadow: 0 4px 0 #6e2c12; }
  .play:active { transform: translateY(2px); box-shadow: 0 2px 0 var(--accent-dark); }
  .tap {
    border: 2px solid var(--accent); background: var(--parch); color: var(--accent);
    box-shadow: 0 4px 0 var(--line2);
  }
  .tap:active { transform: translateY(2px); box-shadow: 0 2px 0 var(--line2); }
  .tap.flash { animation: tapFlash 0.25s ease-out; }
  @keyframes tapFlash { from { background: var(--accent); color: #fff; } to { background: var(--parch); color: var(--accent); } }

  .readout { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
  .stat { display: flex; flex-direction: column; gap: 3px; }
  .stat.mid { border-left: 1px solid var(--line); border-right: 1px solid var(--line); }
  .stat-num { font-size: 1.5rem; font-weight: 800; font-variant-numeric: tabular-nums; line-height: 1.1; }

  .goal {
    display: flex; align-items: center; gap: 10px; width: 100%; cursor: pointer;
    background: transparent; border: 0; padding: 0;
  }
  .goal .progress { flex: 1; margin-top: 0; display: block; }
  .goal .progress-fill { display: block; }
  .goal-txt { flex: none; font-size: 11px; color: #6e5f45; }

  .active { display: flex; flex-wrap: wrap; gap: 6px; justify-content: center; }
  .chip.on { background: rgba(63, 107, 95, 0.12); border-color: var(--tonic); color: var(--tonic); }

  .block { display: flex; flex-direction: column; }
  .sigs { display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; }
  .sigs .chip { padding: 8px 4px; font-size: 12px; text-align: center; }
  .sigs .chip.on, .sync .chip.on { background: var(--accent); border-color: var(--accent); color: #fff; }
  .mix { align-items: end; }

  .sync { gap: 8px; padding-top: 14px; border-top: 1px solid var(--line); }
  .sync-acts { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
  .sync-acts .chip { padding: 8px 6px; text-align: center; }

  .keys { font-size: 10.5px; color: #8a7350; text-align: center; }
  kbd {
    font-family: var(--mono); font-size: 10px; padding: 1px 5px; margin: 0 1px; border-radius: 4px;
    border: 1px solid var(--line2); background: var(--parch); color: #5c4a30;
  }
</style>
