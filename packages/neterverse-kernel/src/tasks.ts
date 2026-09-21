/**
 * The task lifecycle: moving work between `queued`, `active`, `blocked`,
 * `review` and `completed` under validation rather than by hand.
 *
 * Before this module a task changed state by someone editing a JSON file and
 * dragging it to another directory. That works exactly until two runtimes do it
 * at once, or one forgets the event, or a task reaches `completed` still
 * carrying a human gate nobody opened. The state on disk then describes a
 * history that did not happen, and every summary built on it inherits the
 * error.
 *
 * Three rules hold here, and each is refused rather than warned about:
 *
 * 1. **A state is a directory.** A task exists in exactly one of them, and a
 *    transition is a move, so the filesystem cannot show the same task twice.
 * 2. **Only declared transitions run.** `completed` is terminal; a task cannot
 *    jump `queued` straight to `completed`; a task cannot start while something
 *    it declares as `blocked_by` is unfinished.
 * 3. **A human gate is not the kernel's to open.** A task carrying `human_gate`
 *    reaches `completed` only when the caller supplies the approval that
 *    satisfies it, and approval by a non-human runtime is refused outright.
 *    This is Executive OS section 10 expressed as code: consensus among
 *    runtimes is not authorization.
 */

import { existsSync, readdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { validate, formatErrors } from './validate.ts';
import { busPaths, loadSchema, readJson, writeJson, appendEvent } from './bus.ts';
import { type Actor, type EventKind, type Lane, type RiskTier, nowIso } from './types.ts';

export type TaskState = 'QUEUED' | 'ACTIVE' | 'BLOCKED' | 'REVIEW' | 'COMPLETED';

export const TASK_STATES: readonly TaskState[] = ['QUEUED', 'ACTIVE', 'BLOCKED', 'REVIEW', 'COMPLETED'];

/** A bus task, mirroring `.neterverse/schemas/task.schema.json`. */
export interface Task {
  task_id: string;
  parent_task_id?: string | null;
  title: string;
  objective?: string;
  lane: Lane;
  entity?: string;
  capacity?: string;
  risk_tier: RiskTier;
  state: TaskState;
  preferred_runtime?: 'CLAUDE_CODE' | 'CODEX' | 'OTHER_AUTHORIZED_RUNTIME' | 'HUMAN' | 'EITHER';
  resources?: string[];
  blocked_by?: string[];
  human_gate?: string | null;
  acceptance?: string[];
  created_at: string;
  updated_at?: string;
  next_action: string;
}

/**
 * Which state may follow which.
 *
 * `ACTIVE -> QUEUED` and `BLOCKED -> QUEUED` are releases: a runtime that
 * cannot finish puts the work back rather than holding it. `REVIEW -> ACTIVE`
 * is a reviewer asking for changes. `COMPLETED` has no successor, because a
 * task that can be reopened is a task whose completion means nothing - the
 * successor to finished work is new work.
 */
export const ALLOWED_TRANSITIONS: Readonly<Record<TaskState, readonly TaskState[]>> = {
  QUEUED: ['ACTIVE', 'BLOCKED'],
  ACTIVE: ['BLOCKED', 'REVIEW', 'QUEUED'],
  BLOCKED: ['ACTIVE', 'QUEUED'],
  REVIEW: ['COMPLETED', 'ACTIVE'],
  COMPLETED: [],
};

const EVENT_FOR_STATE: Readonly<Record<TaskState, EventKind>> = {
  QUEUED: 'TASK_RELEASED',
  ACTIVE: 'TASK_CLAIMED',
  BLOCKED: 'TASK_BLOCKED',
  REVIEW: 'TASK_REVIEW_REQUESTED',
  COMPLETED: 'TASK_COMPLETED',
};

/** Thrown when a lifecycle rule refuses an operation. Never a warning. */
export class TaskLifecycleError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TaskLifecycleError';
  }
}

/** The directory a task in `state` lives in. */
export function stateDir(state: TaskState): string {
  return state.toLowerCase();
}

/**
 * Whether `file` is the task file for `taskId`.
 *
 * Bus task files carry a descriptive suffix - `tsk_0002-kernel-verification.json` -
 * which is worth keeping, so a task is matched by id and its filename travels
 * with it through every state rather than being normalised away.
 */
function isTaskFile(file: string, taskId: string): boolean {
  return file === `${taskId}.json` || file.startsWith(`${taskId}-`) && file.endsWith('.json');
}

function stateDirPath(root: string, state: TaskState): string {
  return join(busPaths(root).tasks, stateDir(state));
}

/** Where a task currently is, or null when the bus has never heard of it. */
export function findTask(root: string, taskId: string): { state: TaskState; path: string; file: string } | null {
  for (const state of TASK_STATES) {
    const dir = stateDirPath(root, state);
    if (!existsSync(dir)) continue;
    const file = readdirSync(dir).find((f) => isTaskFile(f, taskId));
    if (file) return { state, path: join(dir, file), file };
  }
  return null;
}

/**
 * Reads a task wherever it sits.
 *
 * The directory is authoritative over the `state` field, and a disagreement
 * between them is reported rather than silently resolved: a file that says
 * `ACTIVE` while sitting in `blocked/` is drift, and guessing which half is
 * right is how drift becomes permanent.
 */
export function readTask(root: string, taskId: string): Task {
  const found = findTask(root, taskId);
  if (!found) throw new TaskLifecycleError(`No task ${taskId} exists on this bus.`);

  const task = readJson<Task | null>(found.path, null);
  if (!task) throw new TaskLifecycleError(`Task file ${found.path} is empty or unreadable.`);

  if (task.state !== found.state) {
    throw new TaskLifecycleError(
      `Task ${taskId} sits in ${stateDir(found.state)}/ but its state field says ${task.state}. ` +
        'Resolve the disagreement before moving it.',
    );
  }
  return task;
}

/** Every task in `state`, or across every state when none is given. */
export function listTasks(root: string, state?: TaskState): Task[] {
  const states = state ? [state] : TASK_STATES;
  return states.flatMap((s) => {
    const dir = join(busPaths(root).tasks, stateDir(s));
    if (!existsSync(dir)) return [];
    return readdirSync(dir)
      .filter((f) => f.endsWith('.json'))
      .map((f) => readJson<Task | null>(join(dir, f), null))
      .filter((t): t is Task => t !== null);
  });
}

function writeValidated(root: string, path: string, task: Task): void {
  const result = validate(task, loadSchema(root, 'task'));
  if (!result.valid) {
    throw new TaskLifecycleError(`Refusing to write an invalid task:\n${formatErrors(result.errors)}`);
  }
  writeJson(path, task);
}

export interface CreateTaskInput extends Omit<Task, 'state' | 'created_at' | 'updated_at'> {
  created_at?: string;
}

/** Creates a task in `queued/`. Refuses an id the bus already holds. */
export function createTask(root: string, input: CreateTaskInput, actor: Actor): Task {
  if (findTask(root, input.task_id)) {
    throw new TaskLifecycleError(`Task ${input.task_id} already exists; use transitionTask to move it.`);
  }

  const now = nowIso();
  const task: Task = { ...input, state: 'QUEUED', created_at: input.created_at ?? now, updated_at: now };

  writeValidated(root, join(stateDirPath(root, 'QUEUED'), `${task.task_id}.json`), task);
  appendEvent(root, {
    kind: 'TASK_CREATED',
    actor,
    lane: task.lane,
    risk_tier: task.risk_tier,
    subject: task.task_id,
    summary: `Task ${task.task_id} created in QUEUED: ${task.title}`,
  });
  return task;
}

export interface TransitionOptions {
  /** Replaces `next_action`. A state change with a stale next action is a trap for the next runtime. */
  next_action?: string;
  /** Why, in one line. Recorded on the event. */
  note?: string;
  /**
   * The human approval that satisfies a task's `human_gate`.
   *
   * Required to complete a gated task, and only a `HUMAN` actor may grant it.
   * A runtime supplying its own approval here is refused - that is the whole
   * point of the gate.
   */
  approval?: { granted_by: Actor; evidence: string };
}

/**
 * Moves a task to `to`, or refuses and explains why.
 *
 * The write order matters: validate, then move the file, then log. A task that
 * failed validation is never moved, and a move that happened is always logged.
 */
export function transitionTask(
  root: string,
  taskId: string,
  to: TaskState,
  actor: Actor,
  options: TransitionOptions = {},
): Task {
  const task = readTask(root, taskId);
  const found = findTask(root, taskId)!;
  const from = task.state;

  if (!TASK_STATES.includes(to)) {
    throw new TaskLifecycleError(`${to} is not a task state.`);
  }
  if (from === to) {
    throw new TaskLifecycleError(`Task ${taskId} is already ${from}.`);
  }
  if (!ALLOWED_TRANSITIONS[from].includes(to)) {
    const allowed = ALLOWED_TRANSITIONS[from];
    throw new TaskLifecycleError(
      `${from} -> ${to} is not a permitted transition for ${taskId}. ` +
        (allowed.length === 0 ? `${from} is terminal.` : `From ${from} it may go to ${allowed.join(' or ')}.`),
    );
  }

  if (to === 'ACTIVE') {
    const unfinished = (task.blocked_by ?? []).filter((id) => {
      const dep = findTask(root, id);
      return dep === null || dep.state !== 'COMPLETED';
    });
    if (unfinished.length > 0) {
      throw new TaskLifecycleError(
        `Task ${taskId} cannot start: blocked_by is unfinished or unknown - ${unfinished.join(', ')}.`,
      );
    }
  }

  if (to === 'COMPLETED' && task.human_gate) {
    const approval = options.approval;
    if (!approval) {
      throw new TaskLifecycleError(
        `Task ${taskId} carries a human gate (${task.human_gate}) and cannot be completed without the approval that satisfies it.`,
      );
    }
    if (approval.granted_by.runtime !== 'HUMAN') {
      throw new TaskLifecycleError(
        `Task ${taskId} carries a human gate (${task.human_gate}). ` +
          `${approval.granted_by.runtime} cannot grant it; a gate a runtime can open is not a gate.`,
      );
    }
    if (!approval.evidence.trim()) {
      throw new TaskLifecycleError(`The approval for ${taskId} carries no evidence, so it records nothing.`);
    }
  }

  const moved: Task = {
    ...task,
    state: to,
    updated_at: nowIso(),
    ...(options.next_action ? { next_action: options.next_action } : {}),
  };

  const destination = join(stateDirPath(root, to), found.file);
  writeValidated(root, destination, moved);

  // The new file is on disk and valid before the old one goes, so an
  // interruption leaves a duplicate to reconcile rather than a lost task.
  if (found.path !== destination) rmSync(found.path, { force: true });

  appendEvent(root, {
    kind: EVENT_FOR_STATE[to],
    actor,
    lane: moved.lane,
    risk_tier: moved.risk_tier,
    subject: taskId,
    summary:
      `Task ${taskId} moved ${from} -> ${to}.` +
      (options.note ? ` ${options.note}` : '') +
      (options.approval ? ` Approved by ${options.approval.granted_by.instance_id}: ${options.approval.evidence}` : ''),
  });

  return moved;
}

/** `QUEUED -> ACTIVE`. The named runtime is taking the work. */
export function claimTask(root: string, taskId: string, actor: Actor, options: TransitionOptions = {}): Task {
  return transitionTask(root, taskId, 'ACTIVE', actor, options);
}

/** `ACTIVE -> BLOCKED`, recording what it is waiting on. */
export function blockTask(root: string, taskId: string, actor: Actor, reason: string): Task {
  if (!reason.trim()) {
    throw new TaskLifecycleError('A blocked task must say what it is blocked on.');
  }
  return transitionTask(root, taskId, 'BLOCKED', actor, { note: reason, next_action: `Blocked: ${reason}` });
}

/** `ACTIVE -> REVIEW`. Work is ready for someone other than its author. */
export function submitForReview(root: string, taskId: string, actor: Actor, options: TransitionOptions = {}): Task {
  return transitionTask(root, taskId, 'REVIEW', actor, options);
}

/** `REVIEW -> COMPLETED`, subject to any human gate the task carries. */
export function completeTask(root: string, taskId: string, actor: Actor, options: TransitionOptions = {}): Task {
  return transitionTask(root, taskId, 'COMPLETED', actor, options);
}

// ---------------------------------------------------------------------------
// Handoff packets
// ---------------------------------------------------------------------------

export type HandoffStatus = 'OPEN' | 'CLAIMED' | 'COMPLETED' | 'REJECTED';

export const ALLOWED_HANDOFF_TRANSITIONS: Readonly<Record<HandoffStatus, readonly HandoffStatus[]>> = {
  OPEN: ['CLAIMED', 'REJECTED'],
  CLAIMED: ['COMPLETED', 'REJECTED', 'OPEN'],
  COMPLETED: [],
  REJECTED: [],
};

/** Directories a handoff packet may sit in, in the order they are searched. */
const HANDOFF_DIRS = ['claude-to-codex', 'codex-to-claude', 'completed', 'rejected'] as const;

/** Where a settled handoff is filed. An open or claimed packet stays where it was addressed. */
function handoffDestination(current: string, status: HandoffStatus): string {
  if (status === 'COMPLETED') return 'completed';
  if (status === 'REJECTED') return 'rejected';
  return current;
}

export function findHandoff(root: string, handoffId: string): { dir: string; path: string; file: string } | null {
  for (const dir of HANDOFF_DIRS) {
    const full = join(busPaths(root).handoffs, dir);
    if (!existsSync(full)) continue;
    const file = readdirSync(full).find((f) => f.endsWith('.json') && f.startsWith(`${handoffId}-`));
    if (file) return { dir, path: join(full, file), file };
  }
  return null;
}

interface HandoffPacket {
  handoff_id: string;
  status: HandoffStatus;
  sender: string;
  recipient: string;
  lane: Lane;
  risk_tier: RiskTier;
  task_id?: string;
  [key: string]: unknown;
}

/**
 * Moves a handoff packet to `status`, validating it and filing it.
 *
 * A settled packet moves to `completed/` or `rejected/` so the two inboxes hold
 * only what is actually outstanding. An inbox that accumulates finished work
 * stops being read, and an unread inbox is the same as no bus at all.
 */
export function transitionHandoff(
  root: string,
  handoffId: string,
  status: HandoffStatus,
  actor: Actor,
  note?: string,
): HandoffPacket {
  const found = findHandoff(root, handoffId);
  if (!found) throw new TaskLifecycleError(`No handoff ${handoffId} exists on this bus.`);

  const packet = readJson<HandoffPacket | null>(found.path, null);
  if (!packet) throw new TaskLifecycleError(`Handoff file ${found.path} is empty or unreadable.`);

  const from = packet.status;
  if (!ALLOWED_HANDOFF_TRANSITIONS[from]?.includes(status)) {
    const allowed = ALLOWED_HANDOFF_TRANSITIONS[from] ?? [];
    throw new TaskLifecycleError(
      `Handoff ${handoffId} is ${from}; ${from} -> ${status} is not permitted. ` +
        (allowed.length === 0 ? `${from} is terminal.` : `It may go to ${allowed.join(' or ')}.`),
    );
  }

  const moved: HandoffPacket = { ...packet, status };
  const result = validate(moved, loadSchema(root, 'handoff'));
  if (!result.valid) {
    throw new TaskLifecycleError(`Refusing to write an invalid handoff:\n${formatErrors(result.errors)}`);
  }

  const destinationDir = handoffDestination(found.dir, status);
  const destination = join(busPaths(root).handoffs, destinationDir, found.file);
  writeJson(destination, moved);
  if (destination !== found.path) rmSync(found.path, { force: true });

  appendEvent(root, {
    kind: 'TASK_HANDOFF',
    actor,
    lane: moved.lane,
    risk_tier: moved.risk_tier,
    subject: handoffId,
    summary: `Handoff ${handoffId} moved ${from} -> ${status}.` + (note ? ` ${note}` : ''),
  });

  return moved;
}
