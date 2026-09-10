import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { makeBus, CLAUDE, CODEX } from './helpers.ts';
import { appendEvent, appendCorrection, readEvents, busPaths, findBusRoot } from '../src/bus.ts';

test('a valid event is appended and read back', (t) => {
  const bus = makeBus();
  t.after(bus.cleanup);

  const written = appendEvent(bus.root, {
    kind: 'CAPABILITY_DISCOVERED',
    actor: CLAUDE,
    lane: 'LANE_A',
    risk_tier: 'R0',
    subject: 'Google Drive',
    summary: 'Listed recent files; connector answered.',
  });

  const events = readEvents(bus.root);
  assert.equal(events.length, 1);
  assert.equal(events[0]?.event_id, written.event_id);
  assert.match(written.event_id, /^evt_/);
  assert.match(written.timestamp, /^\d{4}-\d{2}-\d{2}T/);
});

test('an invalid event is refused before it reaches the log', (t) => {
  const bus = makeBus();
  t.after(bus.cleanup);

  assert.throws(
    () => appendEvent(bus.root, {
      // NOT_A_REAL_KIND is not in the schema enum.
      kind: 'NOT_A_REAL_KIND' as never,
      actor: CLAUDE,
      lane: 'LANE_A',
      risk_tier: 'R0',
      subject: 's',
      summary: 't',
    }),
    /Refusing to append an invalid event/,
  );
  assert.equal(readEvents(bus.root).length, 0, 'nothing may be written on a validation failure');
});

test('an event with an unknown field is refused', (t) => {
  const bus = makeBus();
  t.after(bus.cleanup);

  assert.throws(
    () => appendEvent(bus.root, {
      kind: 'TASK_CREATED',
      actor: CLAUDE,
      lane: 'LANE_A',
      risk_tier: 'R1',
      subject: 's',
      summary: 't',
      smuggled: 'value',
    } as never),
    /is not an allowed property/,
  );
});

test('history is corrected by appending, never by rewriting', (t) => {
  const bus = makeBus();
  t.after(bus.cleanup);

  const original = appendEvent(bus.root, {
    kind: 'CONNECTION_VERIFIED',
    actor: CODEX,
    lane: 'LANE_A',
    risk_tier: 'R0',
    subject: 'Notion',
    summary: 'Reported verified in error.',
  });

  appendCorrection(bus.root, original.event_id, {
    actor: CLAUDE,
    lane: 'LANE_A',
    risk_tier: 'R0',
    subject: 'Notion',
    summary: 'Corrects the earlier verification: the call was never made.',
  });

  const events = readEvents(bus.root);
  assert.equal(events.length, 2, 'the original event survives the correction');
  assert.equal(events[0]?.summary, 'Reported verified in error.');
  assert.equal(events[1]?.kind, 'CORRECTION');
  assert.equal(events[1]?.corrects_event_id, original.event_id);
});

test('the log is one whole JSON record per line', (t) => {
  const bus = makeBus();
  t.after(bus.cleanup);

  for (let i = 0; i < 3; i += 1) {
    appendEvent(bus.root, {
      kind: 'FILE_CREATED',
      actor: CLAUDE,
      lane: 'LANE_A',
      risk_tier: 'R1',
      subject: `file-${i}`,
      summary: `created file ${i}`,
    });
  }

  const lines = readFileSync(busPaths(bus.root).events, 'utf8').trim().split('\n');
  assert.equal(lines.length, 3);
  for (const line of lines) assert.doesNotThrow(() => JSON.parse(line));
});

test('findBusRoot returns null rather than guessing outside a repository', () => {
  assert.equal(findBusRoot('/'), null);
});
