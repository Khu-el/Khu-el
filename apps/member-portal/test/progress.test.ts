import test from 'node:test';
import assert from 'node:assert/strict';
import { latestByModule, trackProgress, type ProgressRow } from '../src/logic/progress.ts';
import type { LearningModule } from '../src/types.ts';

const M = (id: string, track: string, sort: number): LearningModule => ({
  id, track_id: track, title: id, summary: null, content_type: 'lesson', content_url: null, body: null,
  sort_order: sort, is_published: true, created_at: '', updated_at: '',
});
const R = (track: string, module: string, completed: boolean, updated_at?: string): ProgressRow => ({
  track_id: track, module_id: module, completed, ...(updated_at === undefined ? {} : { updated_at }),
});

test('progress: a lesson moved to another track keeps its recorded completion', () => {
  // m1 was completed while it sat in track A; an editor has since moved it to B.
  const mods = [M('m1', 'B', 1), M('m2', 'B', 2)];
  const p = trackProgress('B', mods, [R('A', 'm1', true, '2026-09-01T10:00:00+00:00')]);
  assert.equal(p.completed, 1);
  assert.equal(p.percent, 50);
  assert.equal(p.next?.id, 'm2');
  // Track A no longer lists m1, so the old row does not count there.
  assert.equal(trackProgress('A', [...mods, M('a1', 'A', 1)], [R('A', 'm1', true, '2026-09-01T10:00:00+00:00')]).completed, 0);
});

test('progress: when a moved lesson has rows under both tracks, the latest row wins', () => {
  const mods = [M('m1', 'B', 1)];
  const oldDone = R('A', 'm1', true, '2026-09-01T10:00:00+00:00');
  const newUndone = R('B', 'm1', false, '2026-10-02T09:00:00.123456+00:00');
  // Un-marked after the move: the newer not-completed row wins, whatever the order.
  assert.equal(trackProgress('B', mods, [oldDone, newUndone]).completed, 0);
  assert.equal(trackProgress('B', mods, [newUndone, oldDone]).completed, 0);
  // Re-marked later still: completed again.
  const newDone = R('B', 'm1', true, '2026-10-03T08:00:00+00:00');
  assert.equal(trackProgress('B', mods, [oldDone, newUndone, newDone]).completed, 1);
  assert.equal(latestByModule([newDone, oldDone, newUndone]).get('m1'), newDone);
});

test('progress: rows that cannot be ordered never show a tick', () => {
  const mods = [M('m1', 'B', 1)];
  // Same instant: not completed wins.
  const at = '2026-10-02T09:00:00+00:00';
  assert.equal(trackProgress('B', mods, [R('A', 'm1', true, at), R('B', 'm1', false, at)]).completed, 0);
  assert.equal(trackProgress('B', mods, [R('B', 'm1', false, at), R('A', 'm1', true, at)]).completed, 0);
  // An unreadable time never outranks a readable one.
  assert.equal(trackProgress('B', mods, [R('B', 'm1', false, '2026-10-02T09:00:00+00:00'), R('A', 'm1', true, 'TBD')]).completed, 0);
  assert.equal(trackProgress('B', mods, [R('B', 'm1', true, '2026-10-02T09:00:00+00:00'), R('A', 'm1', false)]).completed, 1);
});

test('progress: a single row per module needs no time to count', () => {
  const mods = [M('a', 't', 1), M('b', 't', 2)];
  const p = trackProgress('t', mods, [R('t', 'a', true), R('t', 'b', false)]);
  assert.equal(p.completed, 1);
  assert.equal(p.next?.id, 'b');
});
