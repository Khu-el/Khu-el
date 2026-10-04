/**
 * Filesystem layout of the collaboration bus, and the append-only event log.
 *
 * The log is JSON Lines so two runtimes appending concurrently interleave
 * whole records instead of corrupting one. History is never rewritten: a
 * mistaken event is corrected by appending a `CORRECTION` that points at it,
 * which is why `appendEvent` has no sibling that edits or deletes.
 */

import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { validate, formatErrors } from './validate.ts';
import { type BusEvent, newId, nowIso } from './types.ts';

export const BUS_DIRNAME = '.neterverse';

/**
 * Walks up from `startDir` looking for a `.neterverse` directory.
 * Returns null rather than guessing, so a caller in the wrong repository
 * fails loudly instead of quietly creating a second bus.
 */
export function findBusRoot(startDir: string = process.cwd()): string | null {
  let current = resolve(startDir);
  for (;;) {
    const candidate = join(current, BUS_DIRNAME);
    if (existsSync(candidate)) return candidate;
    const parent = dirname(current);
    if (parent === current) return null;
    current = parent;
  }
}

export function requireBusRoot(startDir?: string): string {
  const root = findBusRoot(startDir);
  if (!root) {
    throw new Error(
      `No ${BUS_DIRNAME}/ directory found from ${resolve(startDir ?? process.cwd())} upward. ` +
        'Run from inside the canonical repository rather than creating a second bus.',
    );
  }
  return root;
}

export const busPaths = (root: string) => ({
  root,
  events: join(root, 'events', 'events.jsonl'),
  locks: join(root, 'locks', 'active-locks.json'),
  schemas: join(root, 'schemas'),
  state: join(root, 'state'),
  handoffs: join(root, 'handoffs'),
  tasks: join(root, 'tasks'),
  decisions: join(root, 'decisions'),
  evidence: join(root, 'evidence'),
  reports: join(root, 'reports'),
});

export function loadSchema(root: string, name: string): Record<string, unknown> {
  const path = join(busPaths(root).schemas, `${name}.schema.json`);
  return JSON.parse(readFileSync(path, 'utf8')) as Record<string, unknown>;
}

export function readJson<T>(path: string, fallback: T): T {
  if (!existsSync(path)) return fallback;
  const raw = readFileSync(path, 'utf8').trim();
  if (raw === '') return fallback;
  return JSON.parse(raw) as T;
}

export function writeJson(path: string, value: unknown): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

/**
 * Validates an event against `event.schema.json` and appends it.
 *
 * Validation happens before the write, so a malformed event never reaches the
 * log at all. The written record is returned with its generated id and
 * timestamp so a caller can reference it in a later correction.
 *
 * The id and the timestamp are stamped here and cannot be supplied. A log whose
 * writer accepts the time an event claims to have happened records a story, not
 * a history: an earlier signature let a caller date an `APPROVAL_GRANTED` to
 * 1999 and reuse an existing event id, and neither the log nor any reader would
 * have known. What the log can honestly attest is when it was told something,
 * so that is what it records.
 */
export function appendEvent(root: string, event: Omit<BusEvent, 'event_id' | 'timestamp'>): BusEvent {
  const record: BusEvent = { ...event, event_id: newId('evt'), timestamp: nowIso() };

  const result = validate(record, loadSchema(root, 'event'));
  if (!result.valid) {
    throw new Error(`Refusing to append an invalid event:\n${formatErrors(result.errors)}`);
  }

  const path = busPaths(root).events;
  mkdirSync(dirname(path), { recursive: true });
  appendFileSync(path, `${JSON.stringify(record)}\n`, 'utf8');
  return record;
}

export interface ReadEventsResult {
  events: BusEvent[];
  /** Line numbers that could not be parsed. Empty when the log is intact. */
  unreadableLines: number[];
}

/**
 * Reads the log oldest-first, reporting damage instead of dying on it.
 *
 * One truncated line used to make the whole log unreadable, which takes
 * `status`, `events` and `audit` down with it - a crash mid-append, or two
 * runtimes interleaving a long record, and the control plane can no longer
 * describe itself. Damaged lines are counted and skipped so the surviving
 * history stays available, and the count is returned so no caller can mistake a
 * partial read for a complete one.
 */
export function readEventsDetailed(root: string): ReadEventsResult {
  const path = busPaths(root).events;
  if (!existsSync(path)) return { events: [], unreadableLines: [] };

  const events: BusEvent[] = [];
  const unreadableLines: number[] = [];

  readFileSync(path, 'utf8').split('\n').forEach((raw, i) => {
    const line = raw.trim();
    if (line === '') return;
    try {
      events.push(JSON.parse(line) as BusEvent);
    } catch {
      unreadableLines.push(i + 1);
    }
  });

  return { events, unreadableLines };
}

/** Reads the log oldest-first. Blank lines are tolerated; damaged ones are skipped. */
export function readEvents(root: string): BusEvent[] {
  return readEventsDetailed(root).events;
}

/**
 * Appends a correction referencing an earlier event.
 *
 * This is the only supported way to change what the log says. The original
 * stays exactly where it is - a system that can quietly tidy its own history
 * cannot be used as evidence of anything.
 */
export function appendCorrection(
  root: string,
  correctsEventId: string,
  event: Omit<BusEvent, 'event_id' | 'timestamp' | 'kind' | 'corrects_event_id'>,
): BusEvent {
  return appendEvent(root, { ...event, kind: 'CORRECTION', corrects_event_id: correctsEventId });
}
