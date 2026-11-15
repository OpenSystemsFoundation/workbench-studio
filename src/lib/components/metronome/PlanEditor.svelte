<script lang="ts">
  // The Plan drill's editor: a run of sections, each with its own key, chord,
  // length and tempo, plus the ready-made generators and the saved-plan shelf.
  import { useStore } from '../../context';
  import { SCALES, SUF, type ScaleId } from '../../engine/constants';
  import { spell } from '../../engine/theory';
  import { GENERATORS, type GeneratorId } from '../../metronome/drone/generators';

  const met = useStore().met;

  const pcs = Array.from({ length: 12 }, (_, i) => i);
  const scaleIds = Object.keys(SCALES) as ScaleId[];
  const planChords: { id: string | null; label: string }[] = [
    { id: null, label: 'key' },
    ...(['maj', 'min', 'dom7', 'maj7', 'min7', 'sus4', 'dim', 'aug', 'm7b5', 'dom7sus', 'maj9', 'min9', 'dom9'] as const).map((id) => ({
      id: id as string,
      label: SUF[id] || 'maj',
    })),
  ];
  let importBars = $state(1);

  // generator + naming, local to the panel until applied
  let genId = $state<GeneratorId>('fifths');
  let genTonic = $state(0);
  let genScale = $state<ScaleId>('ionian');
  let genBars = $state(4);
  const gen = $derived(GENERATORS.find((g) => g.id === genId) ?? GENERATORS[0]);
  let planName = $state('');
</script>

<p class="hint caption">
  A run of sections, each in its own key and tempo. The click follows the tempo; the drone
  and the fretboards follow the key, and warn you a bar before each change.
</p>
{#if met.planFinished}
  <div style="margin-top:10px"><span class="badge good">✓ Plan complete</span></div>
{/if}
{#if !met.droneWithClick && !met.droneSounding}
  <button type="button" class="wide-btn" data-testid="metronome-plan-drone" onclick={() => met.setDroneWithClick(true)}>
    ♪ Play the drone with the click
  </button>
{/if}

<details class="customize" data-testid="metronome-plan-generate">
  <summary class="mono">Start from a ready-made plan</summary>
  <div class="fields">
    <div class="field span2">
      <label for="mt-gen">Plan</label>
      <select id="mt-gen" bind:value={genId}>
        {#each GENERATORS as g (g.id)}
          <option value={g.id}>{g.name}</option>
        {/each}
      </select>
      <span class="caption" style="font-size:11px">{gen.blurb}</span>
    </div>
    <div class="field">
      <label for="mt-gen-key">Start on</label>
      <select id="mt-gen-key" bind:value={genTonic}>
        {#each pcs as pc (pc)}
          <option value={pc}>{spell(pc, pc, gen.usesScale ? genScale : 'ionian')}</option>
        {/each}
      </select>
    </div>
    {#if gen.usesScale}
      <div class="field">
        <label for="mt-gen-scale">Scale</label>
        <select id="mt-gen-scale" bind:value={genScale}>
          {#each scaleIds as id (id)}
            <option value={id}>{SCALES[id].short}</option>
          {/each}
        </select>
      </div>
    {/if}
    <div class="field">
      <label for="mt-gen-bars">Bars each</label>
      <input id="mt-gen-bars" type="number" min="1" max="64" bind:value={genBars} />
    </div>
    <div class="field span2">
      <button
        type="button"
        class="wide-btn primary"
        style="margin-top:0"
        data-testid="metronome-plan-generate-go"
        onclick={() => met.generatePlan(genId, { tonicPc: genTonic, scale: genScale, bars: genBars })}
      >Replace sections</button>
    </div>
  </div>
</details>

<ol class="plan" data-testid="metronome-plan">
  {#each met.plan.sections as sec, i (sec.id)}
    <li class="plan-row" class:now={met.planPos?.index === i}>
      <span class="plan-n mono">{i + 1}</span>
      <select aria-label="Section {i + 1} key" bind:value={sec.tonicPc}>
        {#each pcs as pc (pc)}
          <option value={pc}>{spell(pc, pc, sec.scale)}</option>
        {/each}
      </select>
      <select aria-label="Section {i + 1} scale" bind:value={sec.scale}>
        {#each scaleIds as id (id)}
          <option value={id}>{SCALES[id].short}</option>
        {/each}
      </select>
      <div class="plan-acts">
        <button type="button" class="del click" aria-label="Move section {i + 1} up" disabled={i === 0} onclick={() => met.movePlanSection(sec.id, -1)}>↑</button>
        <button type="button" class="del click" aria-label="Move section {i + 1} down" disabled={i === met.plan.sections.length - 1} onclick={() => met.movePlanSection(sec.id, 1)}>↓</button>
        <button type="button" class="del click" aria-label="Remove section {i + 1}" disabled={met.plan.sections.length <= 1} onclick={() => met.removePlanSection(sec.id)}>✕</button>
      </div>
      <div class="plan-nums mono">
        <label>chord
          <select aria-label="Section {i + 1} chord" bind:value={sec.chord}>
            {#each planChords as c (c.id ?? 'key')}
              <option value={c.id}>{c.label}</option>
            {/each}
          </select>
        </label>
        <label>bars <input type="number" min="1" max="64" aria-label="Section {i + 1} bars" bind:value={sec.bars} /></label>
        <label>bpm <input type="number" min="20" max="400" placeholder="main" aria-label="Section {i + 1} BPM" bind:value={sec.bpm} /></label>
        <label>→ <input type="number" min="20" max="400" placeholder="hold" aria-label="Section {i + 1} ramp to BPM" bind:value={sec.bpmTo} disabled={sec.bpm == null} /></label>
      </div>
    </li>
  {/each}
</ol>
<div class="row" style="margin-top:10px;flex-wrap:wrap">
  <button type="button" class="chip" data-testid="metronome-plan-add" onclick={() => met.addPlanSection()}>+ Add section (a 5th up)</button>
  <button type="button" class="chip" onclick={() => met.resetPlan()}>Reset</button>
</div>
<div class="row" style="margin-top:8px;flex-wrap:wrap" data-testid="metronome-plan-chords">
  <button type="button" class="chip" data-testid="metronome-plan-import" onclick={() => met.importChordsToPlan(importBars)}>Import from Chords</button>
  <label class="mono" style="font-size:10px">bars each <input type="number" min="1" max="16" style="width:44px" aria-label="Bars per imported chord" bind:value={importBars} /></label>
  <span class="mono" style="font-size:10px;opacity:.7">Reshape:</span>
  <button type="button" class="chip" onclick={() => met.transformPlanChords('triads')}>Triads</button>
  <button type="button" class="chip" onclick={() => met.transformPlanChords('sevenths')}>7ths</button>
  <button type="button" class="chip" onclick={() => met.transformPlanChords('sus')}>Sus</button>
  <button type="button" class="chip" onclick={() => met.transformPlanChords('clear')}>Key only</button>
</div>
<p class="caption" style="font-size:11px;margin:8px 0 0">Leave BPM empty to use the main tempo; fill “→” to ramp across the section.</p>

<form
  class="save-row"
  onsubmit={(e) => {
    e.preventDefault();
    met.savePlanAs(planName);
    planName = '';
  }}
>
  <input type="text" maxlength="40" placeholder="Name this plan" aria-label="Plan name" bind:value={planName} />
  <button type="submit" class="chip" disabled={!planName.trim()}>Save plan</button>
</form>
{#if met.savedPlans.length}
  <div class="saved" data-testid="metronome-saved-plans">
    {#each met.savedPlans as sp (sp.id)}
      <span class="saved-item">
        <button type="button" class="saved-name" title="Load {sp.name}" onclick={() => met.loadSavedPlan(sp.id)}>{sp.name} <span class="mono" style="font-size:9px;opacity:.7">· {sp.plan.sections.length}</span></button>
        <button type="button" class="saved-del" aria-label="Delete plan {sp.name}" onclick={() => met.deleteSavedPlan(sp.id)}>✕</button>
      </span>
    {/each}
  </div>
{/if}

<div class="fields">
  <div class="field">
    <label for="mt-pl-repeat">At the end</label>
    <select id="mt-pl-repeat" bind:value={met.plan.repeat}>
      <option value="loop">Loop</option>
      <option value="once">Stop</option>
    </select>
  </div>
  <div class="field">
    <label for="mt-pl-bpm">Each pass, BPM</label>
    <input id="mt-pl-bpm" type="number" min="-50" max="50" disabled={met.plan.repeat === 'once'} bind:value={met.plan.loopBpmDelta} />
  </div>
  <div class="field span2">
    <label for="mt-pl-tr">Each pass, transpose (semitones)</label>
    <input id="mt-pl-tr" type="number" min="-11" max="11" disabled={met.plan.repeat === 'once'} bind:value={met.plan.loopTranspose} />
  </div>
</div>
