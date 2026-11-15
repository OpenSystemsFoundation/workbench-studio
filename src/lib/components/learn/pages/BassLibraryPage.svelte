<script lang="ts">
  // The bassline library, annotated: what each groove is doing and why it
  // works where it works.
  import { useStore } from '../../../context';
  import GenrePicker from '../../GenrePicker.svelte';
  import Card from '../../ui/Card.svelte';
  import Tag from '../../ui/Tag.svelte';
  const store = useStore();
  const v = $derived(store.view);
</script>

<p class="caption lead">{v.bassCount} lines. What each groove is doing, and why it works where it works. Tap one to load it into your line over in <b>Bass</b> — these are starting points, not finished parts.</p>

<div class="picker">
  <GenrePicker
    open={v.bassPickerOpen}
    label="GENRE"
    summaryGenre={v.bassGenreName}
    summaryItem="{v.bassGrooves.length} grooves"
    hint="{v.bassCount} basslines · {v.bassGenreTotal} genres"
    shelves={v.bassShelves}
    items={v.bassGenreChips}
    itemsLabel="BASSLINES · tap to load into your line"
    inline={store.isDesktop}
    compact={!store.isDesktop}
    testid="learn-bass-picker"
    onOpen={() => store.openPicker('bass')}
    onClose={() => store.closePicker()}
    onGenre={(id) => store.setBassGenre(id)}
    onItem={(id) => store.loadBassGroove(id)}
  />
</div>

<div class="grooves" data-testid="bass-grooves">
  {#each v.bassGrooves as p (p.id)}
    <Card grow="290px" active={p.loaded} label={'load ' + p.name} onclick={() => store.loadBassGroove(p.id)}>
      <div class="head">
        <span class="name">{p.name}</span>
        <Tag tone="ink">{p.tag}</Tag>
      </div>
      <div class="cells">
        {#each p.cells as c, s (s)}
          <div class="mono cell" class:beat={s > 0 && s % 4 === 0} style:background={c.bg} style:color={c.fg}>{c.label}</div>
        {/each}
      </div>
      <div class="caption tip">{p.tip}</div>
    </Card>
  {/each}
</div>

<style>
  .lead { font-size: 14px; color: #5c4a30; line-height: 1.5; max-width: 600px; margin: 0 0 14px; }
  .picker { margin-bottom: 14px; }
  .grooves { display: flex; flex-wrap: wrap; gap: 8px; }
  .head { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 2px; }
  .name { font-size: 16px; font-weight: 700; }
  .cells { display: flex; gap: 2px; margin: 8px 0 7px; }
  .cell { flex: 1; height: 22px; border-radius: 3px; font-size: 8px; line-height: 22px; text-align: center; overflow: hidden; }
  .cell.beat { margin-left: 4px; }
  .tip { font-size: 12px; color: #6b5a3e; }
</style>
