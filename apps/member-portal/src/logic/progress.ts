// Learning progress across a track. Pure functions only.
import type { LearningModule, LearningProgress } from '../types.ts';

export interface TrackProgress {
  completed: number;
  total: number;
  percent: number;
  /** The first published module not yet completed, in sort order. */
  next: LearningModule | null;
}

export function trackProgress(
  trackId: string,
  modules: LearningModule[],
  progress: Pick<LearningProgress, 'track_id' | 'module_id' | 'completed'>[],
): TrackProgress {
  const inTrack = modules
    .filter((m) => m.track_id === trackId)
    .sort((a, b) => a.sort_order - b.sort_order || a.id.localeCompare(b.id));
  const done = new Set(progress.filter((p) => p.track_id === trackId && p.completed).map((p) => p.module_id));
  const completed = inTrack.filter((m) => done.has(m.id)).length;
  const total = inTrack.length;
  return {
    completed,
    total,
    // A track with no modules yet has no measurable progress: NaN renders as "—", not 0%.
    percent: total === 0 ? Number.NaN : Math.round((completed / total) * 100),
    next: inTrack.find((m) => !done.has(m.id)) ?? null,
  };
}

export function fmtPercent(n: number): string {
  return Number.isFinite(n) ? `${n}%` : '—';
}
