// Small helpers shared by the staff console's panels. Nothing here talks to
// the database.
import type { ErrorLike } from '../logic/errors';
import { parseBody } from '../logic/text';

/** ErrorNote renders `message` verbatim for anything that is not an RLS refusal. */
export function asError(message: string): ErrorLike {
  return { message };
}

/**
 * sort_order is NOT NULL DEFAULT 0 in every catalog table, so an empty field
 * means 0. Anything else must be a whole number that fits a Postgres integer;
 * null means "not valid" and blocks the save.
 */
export function parseSortOrder(input: string): number | null {
  const t = input.trim();
  if (t === '') return 0;
  if (!/^-?\d+$/.test(t)) return null;
  const n = Number(t);
  if (!Number.isSafeInteger(n) || n < -2147483648 || n > 2147483647) return null;
  return n;
}

/** "a, b , ,B" -> ["a", "b", "B"] (or ["a", "b"] lowercased): trimmed, empties dropped, duplicates removed. */
export function parseList(input: string, lowercase = false): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of input.split(',')) {
    let v = raw.trim().replace(/\s+/g, ' ');
    if (lowercase) v = v.toLowerCase();
    if (v && !seen.has(v)) {
      seen.add(v);
      out.push(v);
    }
  }
  return out;
}

/** Catalog ids are slugs: lowercase letters and digits joined by single dashes. */
export const ID_MAX = 60;
export function isValidId(id: string): boolean {
  return id.length > 0 && id.length <= ID_MAX && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id);
}

/** "" -> null, otherwise the trimmed text. */
export function textOrNull(s: string): string | null {
  const t = s.trim();
  return t === '' ? null : t;
}

/** Map the database errors a catalog write can raise to plain language. */
export function catalogErrorMessage(err: unknown, id: string): unknown {
  const e = err as ErrorLike | null;
  if (e?.code === '23505') return asError(`Something with the ID "${id}" already exists. Change the ID and try again.`);
  if (e?.code === '23503') return asError('The linked track no longer exists. Reload the page and choose another track.');
  if (e?.code === '23514') return asError('The database refused one of the values (for example a type it does not allow, or a lesson body over 50,000 characters).');
  return err;
}

/** Lesson body preview, rendered as React text through parseBody -- never as HTML. */
export function BodyPreview({ body }: { body: string }) {
  const blocks = parseBody(body);
  if (blocks.length === 0) return <p className="text-sm text-slate-500">Nothing to preview yet. The lesson body is empty.</p>;
  return (
    <div className="space-y-3 text-sm leading-relaxed text-slate-800">
      {blocks.map((b, i) => {
        if (b.kind === 'heading') {
          if (b.level === 1) return <h3 key={i} className="text-lg font-semibold text-slate-900">{b.text}</h3>;
          if (b.level === 2) return <h4 key={i} className="text-base font-semibold text-slate-900">{b.text}</h4>;
          return <h5 key={i} className="text-sm font-semibold text-slate-900">{b.text}</h5>;
        }
        if (b.kind === 'list') {
          const items = b.items.map((it, j) => <li key={j}>{it}</li>);
          return b.ordered ? (
            <ol key={i} className="list-decimal space-y-1 pl-5">{items}</ol>
          ) : (
            <ul key={i} className="list-disc space-y-1 pl-5">{items}</ul>
          );
        }
        return <p key={i}>{b.text}</p>;
      })}
    </div>
  );
}

/** A checkbox with its own visible label (Field wraps a label already, so this stands alone). */
export function CheckboxField({ label, checked, onChange, hint, disabled }: { label: string; checked: boolean; onChange: (v: boolean) => void; hint?: string; disabled?: boolean }) {
  return (
    <div className="mb-3 text-sm">
      <label className="inline-flex items-center gap-2 font-medium text-slate-700">
        <input type="checkbox" className="h-4 w-4 rounded border-slate-300" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} />
        {label}
      </label>
      {hint && <span className="mt-1 block text-xs text-slate-500">{hint}</span>}
    </div>
  );
}
