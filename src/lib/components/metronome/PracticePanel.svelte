<script lang="ts">
  // What you are practising toward, and what you have already put in: the
  // session goal and the practice log.
  import { useStore } from '../../context';
  import { formatDuration } from '../../metronome/timing';
  import type { GoalType, PracticeSession } from '../../metronome/types';
  import Segmented from '../ui/Segmented.svelte';

  const met = useStore().met;

  const goalTypes: { id: GoalType; label: string }[] = [
    { id: 'none', label: 'Open' },
    { id: 'bars', label: 'By bars' },
    { id: 'time', label: 'By time' },
  ];

  const dateFmt = new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
  function goalText(s: PracticeSession): string {
    if (s.goal.type === 'bars') return `${s.goal.bars} bars`;
    if (s.goal.type === 'time') return formatDuration(s.goal.seconds ?? 0);
    return '';
  }
  function bpmText(s: PracticeSession): string {
    return s.minBpm === s.maxBpm ? `${s.minBpm} BPM` : `${s.minBpm}–${s.maxBpm} BPM`;
  }
  function confirmClear() {
    if (confirm('Clear all practice history? This cannot be undone.')) met.clearHistory();
  }
</script>

<div class="duo">
<section class="card" class:celebrate={met.goalJustReached} data-testid="metronome-goal">
  <div class="card-title">
    <span>Session goal</span>
    {#if met.goalJustReached}<span class="badge good">✓ Goal reached</span>{/if}
  </div>

  <Segmented label="Goal type" options={goalTypes} bind:value={met.goalType} onchange={() => (met.goalJustReached = false)} />

  {#if met.goalType === 'bars'}
    <div class="field">
      <label for="mt-goal-bars">Target — bars to play</label>
      <input id="mt-goal-bars" type="number" min="1" max="9999" bind:value={met.goalBars} />
    </div>
  {:else if met.goalType === 'time'}
    <div class="field">
      <label for="mt-goal-min">Target — minutes to practice</label>
      <input id="mt-goal-min" type="number" min="1" max="600" step="1" bind:value={met.goalMinutes} />
    </div>
  {/if}

  {#if met.goalType !== 'none'}
    <div class="progress" aria-hidden="true">
      <div class="progress-fill" style="width:{met.goalProgress * 100}%"></div>
    </div>
    <div class="row spread" style="margin-top:6px">
      <span class="caption" style="font-size:13px">{met.goalRemainingLabel}</span>
      <span class="mono" style="font-size:11px;color:#8a7350">{Math.round(met.goalProgress * 100)}%</span>
    </div>
    <p class="hint caption">The click stops by itself when you reach the target.</p>
  {:else}
    <p class="hint caption">
      Open practice: bars and time are counted with no target. Set a goal and the click stops
      by itself when you reach it.
    </p>
  {/if}
</section>

<section class="card" data-testid="metronome-history">
  <div class="card-title">
    <span>Practice Log</span>
    {#if met.sessions.length}
      <button type="button" class="chip danger" onclick={confirmClear}>Clear</button>
    {/if}
  </div>

  {#if met.sessions.length === 0}
    <p class="caption" style="font-size:13px;line-height:1.5">
      No sessions yet. Hit <strong>Start</strong> and your practice — bars played and time —
      will be logged here automatically.
    </p>
  {:else}
    <div class="totals">
      <div><span class="t-num">{met.stats.totalSessions}</span><span class="eyebrow">sessions</span></div>
      <div><span class="t-num">{formatDuration(met.stats.totalSeconds)}</span><span class="eyebrow">total time</span></div>
      <div><span class="t-num">{met.stats.totalBars}</span><span class="eyebrow">total bars</span></div>
    </div>

    <ul class="log">
      {#each met.sessions as s (s.id)}
        <li class="entry">
          <div class="entry-main">
            <div class="entry-top">
              <span style="color:#2c261d">{s.bars} bars</span>
              <span style="color:#a08a64">·</span>
              <span>{formatDuration(s.durationSeconds)}</span>
              {#if s.goal.type !== 'none'}
                <span class="badge" class:good={s.goalReached}>
                  {s.goalReached ? '✓' : '◦'} {goalText(s)}
                </span>
              {/if}
            </div>
            <div class="entry-sub mono">
              {dateFmt.format(new Date(s.startedAt))} · {bpmText(s)} · {s.timeSignature} · {s.automation}
            </div>
          </div>
          <button
            type="button"
            class="del click"
            aria-label="Delete session"
            onclick={() => met.removeSession(s.id)}>✕</button
          >
        </li>
      {/each}
    </ul>
  {/if}
</section>
</div>
