<script lang="ts">
  // Reactive tempo: the microphone hears what you play and the click follows.
  import { useStore } from '../../context';
  import Switch from '../ui/Switch.svelte';

  const met = useStore().met;
  const confidencePct = $derived(Math.round(met.micConfidence * 100));
</script>

<section class="card" data-testid="metronome-mic">
  <div class="card-title">
    <span>Reactive Tempo</span>
    <span class="badge">Experimental</span>
  </div>

  <p class="hint caption">
    Listens through your microphone, detects the tempo you're playing, and follows along.
    Works best with a clear, percussive source (drums, claps, palm-muted strums).
  </p>

  <button
    type="button"
    class="wide-btn"
    class:primary={met.micActive}
    onclick={() => met.toggleMic()}
  >
    {met.micActive ? '● Listening — tap to stop' : '🎤 Enable microphone'}
  </button>

  {#if met.micError}
    <p class="err">{met.micError}</p>
  {/if}

  {#if met.micActive}
    <div class="meter" aria-hidden="true">
      <div class="meter-fill" style="width:{Math.min(100, met.micLevel * 100)}%"></div>
    </div>

    <div class="detected">
      <div>
        <span class="d-num">{met.micDetectedBpm || '—'}</span>
        <span class="eyebrow" style="display:block">BPM detected</span>
      </div>
      <div class="conf">
        <div class="conf-bar"><div style="width:{confidencePct}%"></div></div>
        <span class="mono" style="font-size:10px;color:#8a7350">{confidencePct}% confidence</span>
      </div>
    </div>

    <div class="row spread gap-top">
      <div>
        <div style="font-weight:700">Follow my tempo</div>
        <div class="caption" style="font-size:11px">Continuously match the metronome to what it hears.</div>
      </div>
      <Switch bind:checked={met.micFollow} label="Toggle follow my tempo" />
    </div>

    {#if !met.micFollow}
      <button
        type="button"
        class="wide-btn"
        style="margin-top:12px"
        disabled={!met.micDetectedBpm}
        onclick={() => met.adoptMicTempo()}
      >
        Set metronome to {met.micDetectedBpm || '—'} BPM
      </button>
    {/if}
  {/if}
</section>
