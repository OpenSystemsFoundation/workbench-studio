<script lang="ts">
  // A held note (or chord) to practise scales against: where its key comes
  // from, how it is voiced, and what it sounds like.
  import { useStore } from '../../context';
  import { DRONE_PRESETS, VOICINGS, isRhythmic, presetById, type DroneMacros, type DroneRegister } from '../../metronome/drone/sound';
  import { SCALES, type ScaleId } from '../../engine/constants';
  import { spell } from '../../engine/theory';
  import type { DroneSource } from '../../metronome/drone/persist';
  import Segmented from '../ui/Segmented.svelte';
  import Switch from '../ui/Switch.svelte';

  const store = useStore();
  const met = store.met;

  const registers: { id: DroneRegister; label: string }[] = [
    { id: 'low', label: 'Low' },
    { id: 'mid', label: 'Mid' },
    { id: 'high', label: 'High' },
  ];
  const macroSliders: { id: keyof DroneMacros; label: string; hint: string }[] = [
    { id: 'brightness', label: 'Brightness', hint: 'filter' },
    { id: 'width', label: 'Width', hint: 'detune & stereo' },
    { id: 'motion', label: 'Motion', hint: 'movement' },
    { id: 'space', label: 'Space', hint: 'reverb & echo' },
    { id: 'drive', label: 'Drive', hint: 'saturation' },
    { id: 'groove', label: 'Groove', hint: 'how hard the rhythm hits' },
  ];
  const scaleIds = Object.keys(SCALES) as ScaleId[];
  const pcs = Array.from({ length: 12 }, (_, i) => i);
  const sources: { id: DroneSource; label: string }[] = [
    { id: 'studio', label: 'Studio key' },
    { id: 'own', label: 'Own key' },
    { id: 'chords', label: 'Chords' },
  ];
  const presetOptions = DRONE_PRESETS.map((p) => ({ id: p.id, label: p.name }));
  const guide = $derived(met.droneGuide);
  let soundName = $state('');
  const preset = $derived(presetById(met.dronePreset));
  // Groove only means something to a sound that moves with the beat.
  const shownMacros = $derived(
    macroSliders.filter((m) => m.id !== 'groove' || isRhythmic(preset.sound)),
  );
</script>

<div class="duo" data-testid="metronome-drone">
<section class="card">
  <div class="card-title">
    <span>Drone</span>
    {#if met.droneSounding}<span class="badge good">● {met.droneName}</span>{/if}
  </div>

  <p class="hint caption" style="margin-top:0">
    A held note to play your scales against. While it sounds, the fretboards and piano
    show its scale.
  </p>

  <button
    type="button"
    class="wide-btn"
    class:primary={met.droneSounding}
    data-testid="metronome-drone-toggle"
    onclick={() => met.toggleDrone()}
  >
    {met.droneSounding ? '■ Stop drone' : '▶ Play drone'}
  </button>

  <div class="row spread gap-top">
    <div>
      <div style="font-weight:700">Play with the click</div>
      <div class="caption" style="font-size:11px">Starts and stops with the click.</div>
    </div>
    <Switch checked={met.droneWithClick} label="Toggle drone with metronome" onchange={(on) => met.setDroneWithClick(on)} />
  </div>

  <!-- key -->
  <div class="field">
    <span class="lbl">Key from</span>
    <Segmented label="Drone key source" options={sources} bind:value={met.droneSource} />
  </div>
  {#if met.droneSource === 'studio'}
    <p class="hint caption" style="margin-top:6px">Change it from the key button or the Circle.</p>
  {:else if met.droneSource === 'chords'}
    <p class="hint caption" style="margin-top:6px">
      {store.jzChanges.length
        ? "Follows the Chords tab: each chord's root, with its chord scale on the instruments."
        : 'No chords yet — build a progression in the Chords tab. Until then, the studio key.'}
    </p>
  {:else}
    <div class="fields">
      <div class="field">
        <label for="mt-dr-key">Key</label>
        <select id="mt-dr-key" bind:value={met.droneTonicPc}>
          {#each pcs as pc (pc)}
            <option value={pc}>{spell(pc, pc, met.droneScale)}</option>
          {/each}
        </select>
      </div>
      <div class="field">
        <label for="mt-dr-scale">Scale</label>
        <select id="mt-dr-scale" bind:value={met.droneScale}>
          {#each scaleIds as id (id)}
            <option value={id}>{SCALES[id].short}</option>
          {/each}
        </select>
      </div>
    </div>
  {/if}
  <div class="key-now mono" data-testid="metronome-drone-key">
    <strong>{met.droneName}</strong> · {guide.notes}
  </div>
  {#if met.automationMode === 'plan'}
    <div class="caption" style="font-size:11px;margin-top:4px">
      {met.planActive ? 'The plan is choosing the key.' : 'In Plan mode the plan sets the key while the click runs.'}
    </div>
  {/if}

  <!-- pitch -->
  <div class="field">
    <span class="lbl">Notes</span>
    <Segmented label="Drone voicing" options={VOICINGS} bind:value={met.droneVoicing} />
  </div>
  <div class="field">
    <span class="lbl">Register</span>
    <Segmented label="Drone register" options={registers} bind:value={met.droneRegister} />
  </div>

</section>

<section class="card">
  <div class="card-title"><span>Sound</span></div>
  <div class="field" style="margin-top:0">
    <span class="lbl">Preset</span>
    <Segmented label="Drone sound" options={presetOptions} bind:value={met.dronePreset} wrap />
    <div class="caption" style="font-size:11px">
      {preset.blurb}{#if isRhythmic(preset.sound)} Locks to the click while it runs.{/if}
    </div>
  </div>
  {#if met.userPresets.length}
    <div class="field">
      <span class="lbl">My sounds</span>
      <div class="saved" data-testid="metronome-my-sounds">
        {#each met.userPresets as up (up.id)}
          <span class="saved-item" class:on={met.activeUserPresetId === up.id}>
            <button type="button" class="saved-name" aria-pressed={met.activeUserPresetId === up.id} onclick={() => met.applyUserPreset(up.id)}>{up.name}</button>
            <button type="button" class="saved-del" aria-label="Delete sound {up.name}" onclick={() => met.deleteUserPreset(up.id)}>✕</button>
          </span>
        {/each}
      </div>
    </div>
  {/if}

  <details class="customize">
    <summary class="mono">
      Customize{#if met.droneTweaked}<span class="badge" style="margin-left:8px">tweaked</span>{/if}
    </summary>
    <div class="fields">
      {#each shownMacros as m (m.id)}
        <div class="field">
          <label for="mt-dr-{m.id}">{m.label} — {Math.round(met.droneMacros[m.id] * 100)}</label>
          <input id="mt-dr-{m.id}" class="slider" type="range" min="0" max="1" step="0.01" bind:value={met.droneMacros[m.id]} title={m.hint} />
        </div>
      {/each}
      <div class="field" style="justify-content:flex-end">
        <button type="button" class="chip" disabled={!met.droneTweaked} onclick={() => met.resetDroneMacros()}>Reset to preset</button>
      </div>
    </div>
    <form
      class="save-row"
      onsubmit={(e) => {
        e.preventDefault();
        met.saveUserPreset(soundName);
        soundName = '';
      }}
    >
      <input type="text" maxlength="40" placeholder="Name this sound" aria-label="Sound name" bind:value={soundName} />
      <button type="submit" class="chip" disabled={!soundName.trim()}>Save sound</button>
    </form>
  </details>

  <div class="field">
    <label for="mt-dr-vol">Drone volume — {Math.round(met.droneVolume * 100)}%</label>
    <input id="mt-dr-vol" class="slider" type="range" min="0" max="1" step="0.01" bind:value={met.droneVolume} />
  </div>
</section>
</div>
