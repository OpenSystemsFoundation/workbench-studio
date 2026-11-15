<script lang="ts">
  // Drills that take the tempo out of your hands: step and ramp trainers, the
  // key-and-tempo Plan, and the gap click that drops bars.
  import { useStore } from '../../context';
  import type { AutomationMode } from '../../metronome/store.svelte';
  import type { GapMode } from '../../metronome/automation';
  import Segmented from '../ui/Segmented.svelte';
  import Switch from '../ui/Switch.svelte';
  import PlanEditor from './PlanEditor.svelte';

  const met = useStore().met;

  const autoModes: { id: AutomationMode; label: string }[] = [
    { id: 'off', label: 'Off' },
    { id: 'step', label: 'Step' },
    { id: 'ramp-time', label: 'Ramp / time' },
    { id: 'ramp-bars', label: 'Ramp / bars' },
    { id: 'plan', label: 'Plan' },
  ];
  const gapModes: { id: GapMode; label: string }[] = [
    { id: 'cycle', label: 'Cycle' },
    { id: 'random', label: 'Random' },
  ];
  const micOverriding = $derived(met.micActive && met.micFollow);
  // the drill in one line, e.g. "Ramp 80→140 over 2:00"
  const summary = $derived(met.automationLabel().split(' · ')[0]);
</script>

<div class="stack" data-testid="metronome-automation">
<section class="card">
  <div class="card-title">
    <span>Tempo trainer</span>
    {#if micOverriding}<span class="badge">mic is driving tempo</span>{/if}
  </div>

  <Segmented label="Automation mode" options={autoModes} bind:value={met.automationMode} wrap />

  {#if met.automationMode === 'step'}
    <p class="hint caption">Speed trainer — nudge the tempo every few bars and push your limit.</p>
    <div class="fields">
      <div class="field">
        <label for="mt-st-start">Start BPM</label>
        <input id="mt-st-start" type="number" min="20" max="400" bind:value={met.stepStartBpm} />
      </div>
      <div class="field">
        <label for="mt-st-step">Change BPM</label>
        <input id="mt-st-step" type="number" min="-50" max="50" bind:value={met.stepAmount} />
      </div>
      <div class="field">
        <label for="mt-st-every">Every (bars)</label>
        <input id="mt-st-every" type="number" min="1" max="64" bind:value={met.stepEveryBars} />
      </div>
      <div class="field">
        <label for="mt-st-mode">At limit</label>
        <select id="mt-st-mode" bind:value={met.stepMode}>
          <option value="clamp">Hold</option>
          <option value="loop">Loop</option>
          <option value="bounce">Bounce</option>
        </select>
      </div>
      <div class="field">
        <label for="mt-st-min">Min BPM</label>
        <input id="mt-st-min" type="number" min="20" max="400" bind:value={met.stepMinBpm} />
      </div>
      <div class="field">
        <label for="mt-st-max">Max BPM</label>
        <input id="mt-st-max" type="number" min="20" max="400" bind:value={met.stepMaxBpm} />
      </div>
    </div>
  {:else if met.automationMode === 'ramp-time'}
    <p class="hint caption">Glide smoothly from one tempo to another over a set time.</p>
    <div class="fields">
      <div class="field">
        <label for="mt-rt-start">From BPM</label>
        <input id="mt-rt-start" type="number" min="20" max="400" bind:value={met.rampStartBpm} />
      </div>
      <div class="field">
        <label for="mt-rt-end">To BPM</label>
        <input id="mt-rt-end" type="number" min="20" max="400" bind:value={met.rampEndBpm} />
      </div>
      <div class="field span2">
        <label for="mt-rt-sec">Over (seconds)</label>
        <input id="mt-rt-sec" type="number" min="1" max="3600" bind:value={met.rampSeconds} />
      </div>
    </div>
  {:else if met.automationMode === 'ramp-bars'}
    <p class="hint caption">Glide smoothly from one tempo to another over a number of bars.</p>
    <div class="fields">
      <div class="field">
        <label for="mt-rb-start">From BPM</label>
        <input id="mt-rb-start" type="number" min="20" max="400" bind:value={met.rampStartBpm} />
      </div>
      <div class="field">
        <label for="mt-rb-end">To BPM</label>
        <input id="mt-rb-end" type="number" min="20" max="400" bind:value={met.rampEndBpm} />
      </div>
      <div class="field span2">
        <label for="mt-rb-bars">Over (bars)</label>
        <input id="mt-rb-bars" type="number" min="1" max="999" bind:value={met.rampBars} />
      </div>
    </div>
  {:else if met.automationMode === 'plan'}
    <PlanEditor />
  {:else}
    <p class="hint caption">The tempo stays where you set it. Pick a drill to have the click change speed for you.</p>
  {/if}
  {#if met.automationMode !== 'off' && met.automationMode !== 'plan'}
    <div class="summary mono" data-testid="metronome-automation-summary">{summary}</div>
  {/if}
</section>

<!-- gap-click / mute trainer -->
<section class="card">
  <div class="gap-block">
    <div class="row spread">
      <div>
        <div class="card-title" style="margin-bottom:2px"><span>Gap click</span></div>
        <div class="caption" style="font-size:12px">Mutes bars so you keep time on your own.</div>
      </div>
      <Switch bind:checked={met.gapEnabled} label="Toggle gap-click trainer" />
    </div>

    {#if met.gapEnabled}
      <Segmented label="Gap mode" options={gapModes} bind:value={met.gapMode} />
      {#if met.gapMode === 'cycle'}
        <div class="fields">
          <div class="field">
            <label for="mt-gp-play">Play (bars)</label>
            <input id="mt-gp-play" type="number" min="1" max="32" bind:value={met.gapPlayBars} />
          </div>
          <div class="field">
            <label for="mt-gp-mute">Mute (bars)</label>
            <input id="mt-gp-mute" type="number" min="1" max="32" bind:value={met.gapMuteBars} />
          </div>
        </div>
      {:else}
        <div class="field">
          <label for="mt-gp-prob">Mute chance — {Math.round(met.gapProbability * 100)}%</label>
          <input id="mt-gp-prob" class="slider" type="range" min="0" max="1" step="0.05" bind:value={met.gapProbability} />
        </div>
      {/if}
    {/if}
  </div>
</section>
</div>
