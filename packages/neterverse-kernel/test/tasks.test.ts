import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, existsSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  createTask,
  claimTask,
  blockTask,
  submitForReview,
  completeTask,
  transitionTask,
  transitionHandoff,
  readTask,
  listTasks,
  findTask,
  findHandoff,
  stateDir,
  TaskLifecycleError,
  type CreateTaskInput,
  type TaskState,
} from '../src/tasks.ts';
import { readEvents, writeJson } from '../src/bus.ts';
import { makeBus, CLAUDE, CODEX } from './helpers.ts';

const HUMAN = { runtime: 'HUMAN', instance_id: 'principal' } as const;

function bus() {
  const b = makeBus();
  for (const s of ['queued', 'active', 'blocked', 'review', 'completed']) {
    mkdirSync(join(b.root, 'tasks', s), { recursive: true });
  }
  for (const d of ['claude-to-codex', 'codex-to-claude', 'completed', 'rejected']) {
    mkdirSync(join(b.root, 'handoffs', d), { recursive: true });
  }
  return b;
}

function taskInput(over: Partial<CreateTaskInput> = {}): CreateTaskInput {
  return {
    task_id: 'tsk_0100',
    title: 'Verify the kernel',
    lane: 'LANE_A',
    risk_tier: 'R1',
    next_action: 'Read src/lane.ts adversarially.',
    ...over,
  };
}

/** Walks a task all the way to REVIEW, which is where completion becomes legal. */
function toReview(root: string, id = 'tsk_0100') {
  claimTask(root, id, CODEX);
  submitForReview(root, id, CODEX);
}

const kinds = (root: string) => readEvents(root).map((e) => e.kind);

// --- the happy path -------------------------------------------------------

test('a created task lands in queued/ and logs TASK_CREATED', (t) => {
  const b = bus();
  t.after(b.cleanup);

  const task = createTask(b.root, taskInput(), CLAUDE);

  assert.equal(task.state, 'QUEUED');
  assert.ok(existsSync(join(b.root, 'tasks', 'queued', 'tsk_0100.json')));
  assert.deepEqual(kinds(b.root), ['TASK_CREATED']);
});

test('a task walks queued -> active -> review -> completed, one directory at a time', (t) => {
  const b = bus();
  t.after(b.cleanup);
  createTask(b.root, taskInput(), CLAUDE);

  claimTask(b.root, 'tsk_0100', CODEX);
  assert.equal(findTask(b.root, 'tsk_0100')?.state, 'ACTIVE');

  submitForReview(b.root, 'tsk_0100', CODEX);
  assert.equal(findTask(b.root, 'tsk_0100')?.state, 'REVIEW');

  completeTask(b.root, 'tsk_0100', CLAUDE);
  assert.equal(findTask(b.root, 'tsk_0100')?.state, 'COMPLETED');

  // The move is a move: exactly one file, in exactly one state directory.
  const copies = (['QUEUED', 'ACTIVE', 'BLOCKED', 'REVIEW', 'COMPLETED'] as TaskState[]).filter((s) =>
    existsSync(join(b.root, 'tasks', stateDir(s), 'tsk_0100.json')),
  );
  assert.deepEqual(copies, ['COMPLETED']);
  assert.deepEqual(kinds(b.root), ['TASK_CREATED', 'TASK_CLAIMED', 'TASK_REVIEW_REQUESTED', 'TASK_COMPLETED']);
});

test('blocking records what the work is waiting on, and unblocking returns it', (t) => {
  const b = bus();
  t.after(b.cleanup);
  createTask(b.root, taskInput(), CLAUDE);
  claimTask(b.root, 'tsk_0100', CODEX);

  const blocked = blockTask(b.root, 'tsk_0100', CODEX, 'Waiting on the principal to choose a repository.');
  assert.equal(blocked.state, 'BLOCKED');
  assert.match(blocked.next_action, /Waiting on the principal/);

  assert.equal(transitionTask(b.root, 'tsk_0100', 'ACTIVE', CODEX).state, 'ACTIVE');
  assert.deepEqual(kinds(b.root), ['TASK_CREATED', 'TASK_CLAIMED', 'TASK_BLOCKED', 'TASK_CLAIMED']);
});

test('listTasks and readTask see the task wherever it currently sits', (t) => {
  const b = bus();
  t.after(b.cleanup);
  createTask(b.root, taskInput(), CLAUDE);
  createTask(b.root, taskInput({ task_id: 'tsk_0101' }), CLAUDE);
  claimTask(b.root, 'tsk_0101', CODEX);

  assert.equal(listTasks(b.root).length, 2);
  assert.deepEqual(listTasks(b.root, 'ACTIVE').map((x) => x.task_id), ['tsk_0101']);
  assert.equal(readTask(b.root, 'tsk_0101').state, 'ACTIVE');
});

// --- denied paths ---------------------------------------------------------

test('completed is terminal', (t) => {
  const b = bus();
  t.after(b.cleanup);
  createTask(b.root, taskInput(), CLAUDE);
  toReview(b.root);
  completeTask(b.root, 'tsk_0100', CLAUDE);

  assert.throws(
    () => transitionTask(b.root, 'tsk_0100', 'ACTIVE', CODEX),
    (e: Error) => e instanceof TaskLifecycleError && /COMPLETED is terminal/.test(e.message),
  );
});

test('a queued task cannot jump straight to completed', (t) => {
  const b = bus();
  t.after(b.cleanup);
  createTask(b.root, taskInput(), CLAUDE);

  assert.throws(
    () => completeTask(b.root, 'tsk_0100', CODEX),
    (e: Error) => e instanceof TaskLifecycleError && /not a permitted transition/.test(e.message),
  );
  assert.equal(findTask(b.root, 'tsk_0100')?.state, 'QUEUED');
  assert.deepEqual(kinds(b.root), ['TASK_CREATED'], 'a refused transition logs nothing');
});

test('a task cannot start while something it is blocked_by is unfinished', (t) => {
  const b = bus();
  t.after(b.cleanup);
  createTask(b.root, taskInput({ task_id: 'tsk_0200' }), CLAUDE);
  createTask(b.root, taskInput({ task_id: 'tsk_0201', blocked_by: ['tsk_0200'] }), CLAUDE);

  assert.throws(
    () => claimTask(b.root, 'tsk_0201', CODEX),
    (e: Error) => e instanceof TaskLifecycleError && /blocked_by is unfinished/.test(e.message),
  );

  toReview(b.root, 'tsk_0200');
  completeTask(b.root, 'tsk_0200', CLAUDE);
  assert.equal(claimTask(b.root, 'tsk_0201', CODEX).state, 'ACTIVE');
});

test('a blocked_by naming a task the bus has never seen is refused, not ignored', (t) => {
  const b = bus();
  t.after(b.cleanup);
  createTask(b.root, taskInput({ blocked_by: ['tsk_does_not_exist'] }), CLAUDE);

  assert.throws(
    () => claimTask(b.root, 'tsk_0100', CODEX),
    (e: Error) => /unfinished or unknown/.test(e.message),
  );
});

test('a human gate cannot be opened by a runtime', (t) => {
  const b = bus();
  t.after(b.cleanup);
  createTask(b.root, taskInput({ human_gate: 'The principal must approve publication.' }), CLAUDE);
  toReview(b.root);

  // No approval at all.
  assert.throws(
    () => completeTask(b.root, 'tsk_0100', CODEX),
    (e: Error) => /cannot be completed without the approval/.test(e.message),
  );

  // A runtime granting its own approval is the failure the gate exists for.
  assert.throws(
    () => completeTask(b.root, 'tsk_0100', CODEX, { approval: { granted_by: CODEX, evidence: 'I approve.' } }),
    (e: Error) => /CODEX cannot grant it/.test(e.message),
  );

  // An approval with no evidence records nothing.
  assert.throws(
    () => completeTask(b.root, 'tsk_0100', CODEX, { approval: { granted_by: HUMAN, evidence: '   ' } }),
    (e: Error) => /carries no evidence/.test(e.message),
  );

  assert.equal(findTask(b.root, 'tsk_0100')?.state, 'REVIEW', 'three refusals left the task where it was');

  const done = completeTask(b.root, 'tsk_0100', CLAUDE, {
    approval: { granted_by: HUMAN, evidence: 'Approved in writing on 2026-09-21.' },
  });
  assert.equal(done.state, 'COMPLETED');
  assert.match(readEvents(b.root).at(-1)!.summary, /Approved by principal/);
});

test('an ungated task completes without an approval', (t) => {
  const b = bus();
  t.after(b.cleanup);
  createTask(b.root, taskInput({ human_gate: null }), CLAUDE);
  toReview(b.root);

  assert.equal(completeTask(b.root, 'tsk_0100', CLAUDE).state, 'COMPLETED');
});

test('a duplicate task id is refused rather than overwriting the original', (t) => {
  const b = bus();
  t.after(b.cleanup);
  createTask(b.root, taskInput({ title: 'The original' }), CLAUDE);

  assert.throws(
    () => createTask(b.root, taskInput({ title: 'The impostor' }), CODEX),
    (e: Error) => /already exists/.test(e.message),
  );
  assert.equal(readTask(b.root, 'tsk_0100').title, 'The original');
});

test('a task that fails its schema is never written', (t) => {
  const b = bus();
  t.after(b.cleanup);

  assert.throws(
    () => createTask(b.root, taskInput({ risk_tier: 'R9' as never }), CLAUDE),
    (e: Error) => e instanceof TaskLifecycleError && /Refusing to write an invalid task/.test(e.message),
  );
  assert.equal(findTask(b.root, 'tsk_0100'), null);
  assert.deepEqual(kinds(b.root), []);
});

test('a task whose directory and state field disagree is reported, not guessed', (t) => {
  const b = bus();
  t.after(b.cleanup);

  // Drift: the file claims ACTIVE while sitting in queued/.
  writeJson(join(b.root, 'tasks', 'queued', 'tsk_0300.json'), { ...taskInput({ task_id: 'tsk_0300' }), state: 'ACTIVE', created_at: '2026-09-21T00:00:00Z' });

  assert.throws(
    () => readTask(b.root, 'tsk_0300'),
    (e: Error) => /sits in queued\/ but its state field says ACTIVE/.test(e.message),
  );
});

test('moving a task to the state it is already in is refused', (t) => {
  const b = bus();
  t.after(b.cleanup);
  createTask(b.root, taskInput(), CLAUDE);

  assert.throws(() => transitionTask(b.root, 'tsk_0100', 'QUEUED', CLAUDE), /already QUEUED/);
});

test('a task the bus has never heard of cannot be moved', (t) => {
  const b = bus();
  t.after(b.cleanup);

  assert.throws(() => claimTask(b.root, 'tsk_ghost', CODEX), /No task tsk_ghost exists/);
});

test('a blocked task must say what it is blocked on', (t) => {
  const b = bus();
  t.after(b.cleanup);
  createTask(b.root, taskInput(), CLAUDE);
  claimTask(b.root, 'tsk_0100', CODEX);

  assert.throws(() => blockTask(b.root, 'tsk_0100', CODEX, '  '), /must say what it is blocked on/);
});

// --- handoff packets ------------------------------------------------------

function writeHandoff(root: string, id: string, over: Record<string, unknown> = {}) {
  writeJson(join(root, 'handoffs', 'claude-to-codex', `${id}-verification.json`), {
    handoff_id: id,
    timestamp: '2026-09-21T00:00:00Z',
    sender: 'CLAUDE_CODE',
    recipient: 'CODEX',
    lane: 'LANE_A',
    entity: 'NTE',
    capacity: 'Minister / Authorized Representative',
    risk_tier: 'R1',
    objective: 'Verify the kernel.',
    current_state: 'Open.',
    required_output: ['A verdict.'],
    last_action: 'Opened the handoff.',
    next_action: 'Run the suite.',
    status: 'OPEN',
    ...over,
  });
}

test('a handoff moves OPEN -> CLAIMED -> COMPLETED and is filed in completed/', (t) => {
  const b = bus();
  t.after(b.cleanup);
  writeHandoff(b.root, 'ho_0900');

  assert.equal(transitionHandoff(b.root, 'ho_0900', 'CLAIMED', CODEX).status, 'CLAIMED');
  assert.equal(findHandoff(b.root, 'ho_0900')?.dir, 'claude-to-codex', 'a claimed packet stays in its inbox');

  assert.equal(transitionHandoff(b.root, 'ho_0900', 'COMPLETED', CODEX).status, 'COMPLETED');
  assert.equal(findHandoff(b.root, 'ho_0900')?.dir, 'completed', 'a settled packet leaves the inbox');
});

test('a completed handoff is terminal, and an invalid packet is never written', (t) => {
  const b = bus();
  t.after(b.cleanup);
  writeHandoff(b.root, 'ho_0901', { status: 'COMPLETED' });

  assert.throws(
    () => transitionHandoff(b.root, 'ho_0901', 'CLAIMED', CODEX),
    (e: Error) => /COMPLETED is terminal/.test(e.message),
  );

  writeHandoff(b.root, 'ho_0902', { risk_tier: 'R9' });
  assert.throws(
    () => transitionHandoff(b.root, 'ho_0902', 'CLAIMED', CODEX),
    (e: Error) => /Refusing to write an invalid handoff/.test(e.message),
  );
});

test('a handoff the bus has never heard of cannot be moved', (t) => {
  const b = bus();
  t.after(b.cleanup);

  assert.throws(() => transitionHandoff(b.root, 'ho_ghost', 'CLAIMED', CODEX), /No handoff ho_ghost exists/);
});

test('a damaged line in the event log does not hide the rest of the history', (t) => {
  const b = bus();
  t.after(b.cleanup);
  createTask(b.root, taskInput(), CLAUDE);

  const log = join(b.root, 'events', 'events.jsonl');
  writeFileSync(log, `{"truncated":\n${readEvents(b.root).map((e) => JSON.stringify(e)).join('\n')}\n`, 'utf8');

  assert.equal(readEvents(b.root).length, 1, 'the surviving record is still readable');
});

test('a task file keeps its descriptive name through every state', (t) => {
  const b = bus();
  t.after(b.cleanup);

  // The bus names task files `<id>-<slug>.json`; the slug must survive the move.
  writeJson(join(b.root, 'tasks', 'queued', 'tsk_0400-kernel-verification.json'), {
    ...taskInput({ task_id: 'tsk_0400' }),
    state: 'QUEUED',
    created_at: '2026-09-21T00:00:00Z',
  });

  assert.equal(findTask(b.root, 'tsk_0400')?.file, 'tsk_0400-kernel-verification.json');
  claimTask(b.root, 'tsk_0400', CODEX);

  const moved = findTask(b.root, 'tsk_0400');
  assert.equal(moved?.state, 'ACTIVE');
  assert.equal(moved?.file, 'tsk_0400-kernel-verification.json');
  assert.ok(!existsSync(join(b.root, 'tasks', 'queued', 'tsk_0400-kernel-verification.json')));
});
