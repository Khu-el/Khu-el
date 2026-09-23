/**
 * Records saved while the server could not be reached.
 *
 * useSyncedRecords applies every add and edit locally first, then sends it. If
 * the send failed for want of a network, the caption said "saved locally --
 * could not reach the server to sync yet", and nothing ever tried again. The
 * next refresh replaced local state with the server's list, and the record the
 * user had just been told was saved was gone.
 *
 * Now a record whose send failed transiently is marked pending. A refresh keeps
 * pending records over the server's copy and pushes them again; only a
 * successful push clears the mark. These helpers are plain functions so the
 * rule is tested without a DOM.
 */

/** Ids of records whose latest local version has not reached the server. */
export type PendingIds = Record<string, true>;

/**
 * A failure worth retrying: no response at all (fetch rejects with a
 * TypeError, so there is no status), or a 5xx. A 4xx is the server refusing
 * the record -- retrying it would only repeat the refusal, so it is not queued.
 */
export function isTransientFailure(err: unknown): boolean {
  const status = (err as { status?: unknown } | null)?.status;
  if (typeof status !== 'number') return true;
  return status >= 500;
}

/**
 * The list to show after a refresh: the server's records, except that a
 * pending record's local version wins, and a pending record the server has
 * never seen is kept (first, as a newly created record is).
 *
 * The local version winning is last-write-wins by this browser. On the shared
 * estate workspace, an edit someone else saved while this one was offline is
 * overwritten when the pending edit is pushed. That is the same outcome as the
 * two edits arriving in the other order, and it is preferable to silently
 * discarding the edit the user was told was saved.
 */
export function mergeServerWithPending<R extends { id: string }>(server: R[], local: R[], pending: PendingIds): R[] {
  const localById = new Map(local.map((r) => [r.id, r]));
  const pendingLocal = Object.keys(pending)
    .map((id) => localById.get(id))
    .filter((r): r is R => r !== undefined);
  const pendingById = new Map(pendingLocal.map((r) => [r.id, r]));
  const serverIds = new Set(server.map((r) => r.id));

  const neverSynced = local.filter((r) => pendingById.has(r.id) && !serverIds.has(r.id));
  const merged = server.map((r) => pendingById.get(r.id) ?? r);
  return [...neverSynced, ...merged];
}
