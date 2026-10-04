// Learning progress across a track. Pure functions only.
import type { LearningModule, LearningProgress } from '../types.ts';

export interface TrackProgress {
  completed: number;
  total: number;
  percent: number;
  /** The first published module not yet completed, in sort order. */
  next: LearningModule | null;
}

/** A progress row as the views hold it. `updated_at` decides between rows that disagree. */
export type ProgressRow = Pick<LearningProgress, 'track_id' | 'module_id' | 'completed'> & Partial<Pick<LearningProgress, 'updated_at'>>;

function updatedTime(row: ProgressRow): number {
  const t = row.updated_at ? Date.parse(row.updated_at) : Number.NaN;
  // A time we cannot read never outranks one we can.
  return Number.isFinite(t) ? t : Number.NEGATIVE_INFINITY;
}

/**
 * The row that stands for each module. Module ids are global primary keys, so
 * a row counts wherever the module now sits: an editor moving a lesson to
 * another track does not hide what the member recorded. A moved module can
 * hold rows under both track ids; the one updated last wins, and on a tie the
 * not-completed row wins, so records that cannot be ordered never show a tick.
 */
export function latestByModule<T extends ProgressRow>(progress: T[]): Map<string, T> {
  const out = new Map<string, T>();
  for (const p of progress) {
    const held = out.get(p.module_id);
    if (!held) {
      out.set(p.module_id, p);
      continue;
    }
    const a = updatedTime(p);
    const b = updatedTime(held);
    if (a > b || (a === b && !p.completed)) out.set(p.module_id, p);
  }
  return out;
}

export function trackProgress(trackId: string, modules: LearningModule[], progress: ProgressRow[]): TrackProgress {
  const inTrack = modules
    .filter((m) => m.track_id === trackId)
    .sort((a, b) => a.sort_order - b.sort_order || a.id.localeCompare(b.id));
  const latest = latestByModule(progress);
  const done = (m: LearningModule) => Boolean(latest.get(m.id)?.completed);
  const completed = inTrack.filter(done).length;
  const total = inTrack.length;
  return {
    completed,
    total,
    // A track with no modules yet has no measurable progress: NaN renders as "—", not 0%.
    percent: total === 0 ? Number.NaN : Math.round((completed / total) * 100),
    next: inTrack.find((m) => !done(m)) ?? null,
  };
}

export function fmtPercent(n: number): string {
  return Number.isFinite(n) ? `${n}%` : '—';
}
