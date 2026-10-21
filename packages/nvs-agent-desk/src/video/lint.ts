// Timeline lint for an HTML video composition, using the attribute contract documented by
// heygen-com/hyperframes (Apache-2.0; docs/concepts/data-attributes.mdx and docs/reference/html-schema.mdx):
//  - root: data-composition-id, data-width, data-height; data-duration "usually" (may be inferred upstream);
//  - clip data-start: seconds, OR a clip id meaning "when that clip ends", optionally "+/- seconds";
//  - clip data-duration: required for DOM clips, optional for img (3 s default), video and audio (source length);
//  - data-track-index is display-only: the render never reads it and same-track overlap is legal.
// This checks the timeline BEFORE a render or a paid generation is queued. Anything it cannot resolve is a WARNING
// ("not checked"), never a pass and never a false error. The renderer itself is upstream's.

export interface LintIssue {
  level: 'error' | 'warn';
  message: string;
}

export interface LintResult {
  ok: boolean;
  issues: LintIssue[];
  rootDuration: number; // NaN when not authored
  clips: number;
}

interface Tag {
  name: string;
  a: Record<string, string>;
}

/** Quote-aware scan of opening tags, so a '>' inside an attribute value does not end the tag early. */
function scanTags(html: string): Tag[] {
  const tags: Tag[] = [];
  const src = html.replace(/<!--[\s\S]*?-->/g, '').replace(/<(script|style)\b[\s\S]*?<\/\1>/gi, (m) => m.slice(0, m.indexOf('>') + 1));
  let i = 0;
  while (i < src.length) {
    const lt = src.indexOf('<', i);
    if (lt < 0) break;
    const nm = src.slice(lt).match(/^<([a-zA-Z][\w-]*)/);
    if (!nm) {
      i = lt + 1;
      continue;
    }
    let j = lt + nm[0].length;
    let quote: string | null = null;
    for (; j < src.length; j++) {
      const c = src[j]!;
      if (quote) {
        if (c === quote) quote = null;
      } else if (c === '"' || c === "'") quote = c;
      else if (c === '>') break;
    }
    const a: Record<string, string> = {};
    for (const m of src.slice(lt + nm[0].length, j).matchAll(/([a-zA-Z_:][\w:.-]*)\s*=\s*(?:"([^"]*)"|'([^']*)')/g)) {
      a[m[1]!.toLowerCase()] = m[2] ?? m[3] ?? '';
    }
    tags.push({ name: nm[1]!.toLowerCase(), a });
    i = j + 1;
  }
  return tags;
}

const MEDIA = new Set(['video', 'audio', 'img']);
const finite = (x: number) => Number.isFinite(x);
const num = (s: string | undefined) => (s === undefined || s.trim() === '' ? NaN : Number(s));
const REL = /^([A-Za-z_][\w-]*)\s*(?:([+-])\s*(\d+(?:\.\d+)?))?$/;

export function lintComposition(html: string): LintResult {
  const issues: LintIssue[] = [];
  const err = (message: string) => issues.push({ level: 'error', message });
  const warn = (message: string) => issues.push({ level: 'warn', message });

  const tags = scanTags(html);
  const roots = tags.filter((t) => 'data-composition-id' in t.a);
  if (roots.length === 0) return { ok: false, issues: [{ level: 'error', message: 'no element with data-composition-id' }], rootDuration: NaN, clips: 0 };
  if (roots.length > 1) warn(`${roots.length} compositions found; linting the first`);
  const root = roots[0]!;

  for (const k of ['data-width', 'data-height']) if (!(finite(num(root.a[k])) && num(root.a[k]) > 0)) err(`root ${k} is missing or not a positive finite number`);
  const rootDuration = num(root.a['data-duration']);
  if ('data-duration' in root.a && !(finite(rootDuration) && rootDuration > 0)) err('root data-duration is not a positive finite number');
  else if (!('data-duration' in root.a)) warn('root has no data-duration: upstream infers it only from timed media or a registered animation; overrun checks skipped');

  // Pass 1: read each clip's authored fields.
  type Clip = { id: string; name: string; start: number | null; startExpr: string | null; dur: number | null; track: string };
  const clips: Clip[] = [];
  tags.filter((t) => t !== root && 'data-start' in t.a).forEach((t, i) => {
    const id = t.a['id'] ?? `${t.name}#${i}`;
    const raw = (t.a['data-start'] ?? '').trim();
    const abs = num(raw);
    let start: number | null = null;
    let startExpr: string | null = null;
    if (raw !== '' && finite(abs)) {
      if (abs < 0) err(`${id}: data-start is negative`);
      else start = abs;
    } else if (REL.test(raw)) startExpr = raw;
    else err(`${id}: data-start "${raw}" is neither seconds nor a clip reference`);

    let dur: number | null = null;
    if ('data-duration' in t.a) {
      const d = num(t.a['data-duration']);
      if (finite(d) && d > 0) dur = d;
      else err(`${id}: data-duration is not a positive finite number`);
    } else if (MEDIA.has(t.name)) warn(`${id}: no data-duration; length comes from the source, so its end is not checked`);
    else err(`${id}: data-duration is required for non-media clips`);
    clips.push({ id, name: t.name, start, startExpr, dur, track: t.a['data-track-index'] ?? '0' });
  });

  // Pass 2: resolve "clip-id [+/- seconds]" starts. A reference needs a known end; cycles and unknown ids are errors.
  const byId = new Map(clips.map((c) => [c.id, c]));
  const resolving = new Set<string>();
  const startOf = (c: Clip): number | null => {
    if (c.start !== null || c.startExpr === null) return c.start;
    if (resolving.has(c.id)) {
      err(`${c.id}: data-start references form a cycle`);
      return null;
    }
    const m = c.startExpr.match(REL)!;
    const ref = byId.get(m[1]!);
    if (!ref) {
      err(`${c.id}: data-start references "${m[1]}", which is not a clip in this composition`);
      return null;
    }
    resolving.add(c.id);
    const refStart = startOf(ref);
    resolving.delete(c.id);
    if (refStart === null || ref.dur === null) {
      warn(`${c.id}: start depends on ${ref.id}, whose end is not known; not checked`);
      return null;
    }
    const v = refStart + ref.dur + (m[2] === '-' ? -1 : 1) * (m[3] ? Number(m[3]) : 0);
    if (v < 0) err(`${c.id}: relative start resolves to ${v}s (before 0)`);
    c.start = v;
    return v;
  };

  const byTrack = new Map<string, { start: number; end: number; id: string }[]>();
  for (const c of clips) {
    const s = startOf(c);
    if (s === null || c.dur === null) continue;
    const end = s + c.dur;
    if (finite(rootDuration) && rootDuration > 0 && end > rootDuration + 1e-9) err(`${c.id}: ends at ${end}s, after the ${rootDuration}s composition`);
    byTrack.set(c.track, [...(byTrack.get(c.track) ?? []), { start: s, end, id: c.id }]);
  }
  for (const [track, list] of byTrack) {
    const sorted = [...list].sort((a, b) => a.start - b.start);
    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i]!.start < sorted[i - 1]!.end - 1e-9) warn(`track ${track}: ${sorted[i - 1]!.id} overlaps ${sorted[i]!.id} (legal upstream; both are composited)`);
    }
  }
  return { ok: !issues.some((i) => i.level === 'error'), issues, rootDuration, clips: clips.length };
}
