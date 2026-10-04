// Client-made idempotency keys. Pure apart from the platform's crypto.

/**
 * A fresh idempotency key for one filled-in form. crypto.randomUUID needs a
 * secure context; the fallback builds a v4 UUID from getRandomValues.
 */
export function newRef(): string {
  const c = globalThis.crypto;
  if (typeof c?.randomUUID === 'function') return c.randomUUID();
  const b = c.getRandomValues(new Uint8Array(16));
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

/**
 * One key per distinct form content. Resubmitting the same content keeps its
 * key, so a retry after a lost response is deduplicated; edited content gets
 * a new key, so the edit is saved rather than answered with the old record.
 */
export function refPerContent(): (content: string) => string {
  let last: { content: string; ref: string } | null = null;
  return (content) => {
    if (!last || last.content !== content) last = { content, ref: newRef() };
    return last.ref;
  };
}
