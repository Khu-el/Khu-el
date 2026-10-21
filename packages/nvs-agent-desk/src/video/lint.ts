// Timeline lint for an HTML video composition, using the attribute contract documented by
// heygen-com/hyperframes (Apache-2.0): a root with data-composition-id / data-width / data-height /
// data-duration, and clips with data-start / data-duration / data-track-index. This checks the timeline
// BEFORE a render is queued; the renderer itself is upstream's, not reimplemented here.

export interface LintIssue {
  level: 'error' | 'warn';
  message: string;
}

export interface LintResult {
  ok: boolean;
  issues: LintIssue[];
  rootDuration: number;
  clips: number;
}

function attrs(tag: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const m of tag.matchAll(/([a-zA-Z_:][\w:.-]*)\s*=\s*(?:"([^"]*)"|'([^']*)')/g)) out[m[1]!.toLowerCase()] = m[2] ?? m[3] ?? '';
  return out;
}

const num = (s: string | undefined) => (s === undefined || s.trim() === '' ? NaN : Number(s));

export function lintComposition(html: string): LintResult {
  const issues: LintIssue[] = [];
  const tags = [...html.matchAll(/<([a-zA-Z][\w-]*)\b([^>]*)>/g)].map((m) => ({ name: m[1]!.toLowerCase(), a: attrs(m[2]!) }));
  const roots = tags.filter((t) => 'data-composition-id' in t.a);
  if (roots.length === 0) return { ok: false, issues: [{ level: 'error', message: 'no element with data-composition-id' }], rootDuration: NaN, clips: 0 };
  if (roots.length > 1) issues.push({ level: 'warn', message: `${roots.length} compositions found; linting the first` });

  const root = roots[0]!;
  const rootDuration = num(root.a['data-duration']);
  for (const k of ['data-width', 'data-height', 'data-duration']) {
    const v = num(root.a[k]);
    if (!(v > 0)) issues.push({ level: 'error', message: `root ${k} is missing or not a positive number` });
  }

  const clips = tags.filter((t) => t !== root && 'data-start' in t.a);
  const byTrack = new Map<string, { start: number; end: number; id: string }[]>();
  clips.forEach((c, i) => {
    const id = c.a['id'] ?? `${c.name}#${i}`;
    const start = num(c.a['data-start']);
    const dur = num(c.a['data-duration']);
    if (!(start >= 0)) return void issues.push({ level: 'error', message: `${id}: data-start is missing or negative` });
    if (!(dur > 0)) return void issues.push({ level: 'error', message: `${id}: data-duration is missing or not positive` });
    if (rootDuration > 0 && start + dur > rootDuration + 1e-9) {
      issues.push({ level: 'error', message: `${id}: ends at ${start + dur}s, after the ${rootDuration}s composition` });
    }
    const track = c.a['data-track-index'] ?? '0';
    byTrack.set(track, [...(byTrack.get(track) ?? []), { start, end: start + dur, id }]);
  });
  for (const [track, list] of byTrack) {
    const s = [...list].sort((a, b) => a.start - b.start);
    for (let i = 1; i < s.length; i++) {
      if (s[i]!.start < s[i - 1]!.end - 1e-9) issues.push({ level: 'warn', message: `track ${track}: ${s[i - 1]!.id} overlaps ${s[i]!.id}` });
    }
  }
  return { ok: !issues.some((i) => i.level === 'error'), issues, rootDuration, clips: clips.length };
}
