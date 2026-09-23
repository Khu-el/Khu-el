import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { purgeForeignCaches, scopedCacheKey } from './cacheKey';
import { isTransientFailure, mergeServerWithPending, type PendingIds } from './pendingSync';
import type { GovernedRecord } from '../types';
import { api, ApiError } from './client';
import type { AppId } from './types';

export type SyncStatus = 'idle' | 'syncing' | 'synced' | 'pending' | 'offline';

/**
 * Records are cached in localStorage (so the app still works offline / mid-flight)
 * and synced against the backend whenever authenticated. The cache is the
 * fallback, never the source of truth once a session is live -- except for a
 * record whose latest save has not reached the server yet. Those are marked
 * pending (see pendingSync.ts), kept over the server's copy on refresh, and
 * pushed again on every refresh and whenever the browser comes back online.
 *
 * `userId` is required because the cache is per account, not per browser. See
 * cacheKey.ts: a shared key let one account's records render for the next
 * person to sign in on the same machine. The pending list is scoped the same
 * way, under its own name so the purge below does not mistake it for another
 * account's cache.
 */
export function useSyncedRecords<T>(appId: AppId, cacheKey: string, isAuthenticated: boolean, userId: string) {
  const pendingCacheKey = `${cacheKey}:pending`;
  const ownedKey = useMemo(() => scopedCacheKey(cacheKey, userId), [cacheKey, userId]);
  const pendingKey = useMemo(() => scopedCacheKey(pendingCacheKey, userId), [pendingCacheKey, userId]);

  // Drop any other account's copy of this cache before reading our own, so a
  // shared machine does not keep records the signed-in user cannot see.
  useMemo(() => {
    if (typeof window === 'undefined') return;
    purgeForeignCaches(window.localStorage, cacheKey, userId);
    purgeForeignCaches(window.localStorage, pendingCacheKey, userId);
  }, [cacheKey, pendingCacheKey, userId]);

  const [records, setRecords] = useLocalStorage<GovernedRecord<T>[]>(ownedKey, []);
  const [pending, setPending] = useLocalStorage<PendingIds>(pendingKey, {});
  const [status, setStatus] = useState<SyncStatus>('idle');
  const [syncError, setSyncError] = useState<string | null>(null);
  const loadedFor = useRef<string | null>(null);

  // Read inside async work, after an await, where the state captured by the
  // closure would be stale.
  const recordsRef = useRef(records);
  recordsRef.current = records;
  const pendingRef = useRef(pending);
  pendingRef.current = pending;

  const markPending = useCallback(
    (id: string, isPending: boolean) =>
      setPending((prev) => {
        if (Boolean(prev[id]) === isPending) return prev;
        const next = { ...prev };
        if (isPending) next[id] = true;
        else delete next[id];
        return next;
      }),
    [setPending]
  );

  /**
   * Replace a record with the server's copy -- but only if the local copy is
   * still the exact version that was sent. A slower response for an earlier
   * edit must not overwrite a newer one typed while it was in flight.
   */
  const acceptSaved = useCallback(
    (sent: GovernedRecord<T>, saved: GovernedRecord<T>) => {
      setRecords((prev) => prev.map((r) => (r === sent ? saved : r)));
      if (recordsRef.current.find((r) => r.id === sent.id) === sent) markPending(sent.id, false);
    },
    [setRecords, markPending]
  );

  /** Create or update, whichever the server needs; a 409 or 404 means we guessed wrong. */
  const push = useCallback(
    async (record: GovernedRecord<T>, existsOnServer: boolean): Promise<GovernedRecord<T>> => {
      const create = () => api.post<{ record: GovernedRecord<T> }>('/api/records', { appId, ...record });
      const update = () => api.put<{ record: GovernedRecord<T> }>(`/api/records/${record.id}`, record);
      try {
        return (await (existsOnServer ? update() : create())).record;
      } catch (e) {
        if (e instanceof ApiError && existsOnServer && e.status === 404) return (await create()).record;
        if (e instanceof ApiError && !existsOnServer && e.status === 409) return (await update()).record;
        throw e;
      }
    },
    [appId]
  );

  /** After a failed save: queue it if the failure was transient, and say which it was. */
  const onSaveFailed = useCallback(
    (record: GovernedRecord<T>, e: unknown) => {
      if (isTransientFailure(e)) {
        markPending(record.id, true);
        setSyncError('Saved on this device. It will sync when the server can be reached.');
        setStatus('pending');
      } else {
        setSyncError(e instanceof Error ? e.message : 'The server refused this change.');
        setStatus('offline');
      }
    },
    [markPending]
  );

  const refresh = useCallback(async () => {
    if (!isAuthenticated) return;
    setStatus('syncing');

    let server: GovernedRecord<T>[];
    try {
      server = (await api.get<{ records: GovernedRecord<T>[] }>(`/api/records?appId=${appId}`)).records;
    } catch (e) {
      setSyncError(e instanceof ApiError ? e.message : 'Could not reach the server — showing your last saved copy.');
      setStatus(Object.keys(pendingRef.current).length > 0 ? 'pending' : 'offline');
      return;
    }

    const queued = Object.keys(pendingRef.current);
    const merged = mergeServerWithPending(server, recordsRef.current, pendingRef.current);
    setRecords(merged);

    const serverIds = new Set(server.map((r) => r.id));
    let refused: string | null = null;
    let stillPending = false;
    for (const id of queued) {
      const record = merged.find((r) => r.id === id);
      if (!record) {
        markPending(id, false);
        continue;
      }
      try {
        acceptSaved(record, await push(record, serverIds.has(id)));
      } catch (e) {
        if (isTransientFailure(e)) {
          stillPending = true;
          break;
        }
        // Refused, not unreachable: retrying would only repeat the refusal.
        markPending(id, false);
        refused = e instanceof Error ? e.message : 'The server refused a saved change.';
      }
    }

    if (stillPending) {
      setSyncError('Some changes are saved on this device only. They will sync when the server can be reached.');
      setStatus('pending');
    } else if (refused) {
      setSyncError(refused);
      setStatus('offline');
    } else {
      setSyncError(null);
      setStatus('synced');
    }
  }, [appId, isAuthenticated, setRecords, markPending, acceptSaved, push]);

  useEffect(() => {
    if (!isAuthenticated) {
      loadedFor.current = null;
      return;
    }
    if (loadedFor.current === appId) return;
    loadedFor.current = appId;
    refresh();
  }, [appId, isAuthenticated, refresh]);

  // Coming back online is the moment a queued save can go through.
  useEffect(() => {
    if (!isAuthenticated || typeof window === 'undefined') return;
    const onOnline = () => {
      if (Object.keys(pendingRef.current).length > 0) refresh();
    };
    window.addEventListener('online', onOnline);
    return () => window.removeEventListener('online', onOnline);
  }, [isAuthenticated, refresh]);

  const addRecord = useCallback(
    async (record: GovernedRecord<T>) => {
      setRecords((prev) => [record, ...prev]);
      try {
        acceptSaved(record, await push(record, false));
        setSyncError(null);
        setStatus(Object.keys(pendingRef.current).length > 0 ? 'pending' : 'synced');
      } catch (e) {
        onSaveFailed(record, e);
      }
    },
    [setRecords, acceptSaved, push, onSaveFailed]
  );

  const updateRecord = useCallback(
    async (record: GovernedRecord<T>) => {
      setRecords((prev) => prev.map((r) => (r.id === record.id ? record : r)));
      try {
        acceptSaved(record, await push(record, true));
        setSyncError(null);
        setStatus(Object.keys(pendingRef.current).length > 0 ? 'pending' : 'synced');
      } catch (e) {
        onSaveFailed(record, e);
      }
    },
    [setRecords, acceptSaved, push, onSaveFailed]
  );

  const removeRecord = useCallback(
    async (id: string) => {
      const prevRecords = recordsRef.current;
      setRecords((prev) => prev.filter((r) => r.id !== id));
      try {
        await api.del(`/api/records/${id}`);
      } catch (e) {
        // Already gone -- including a record created offline that never reached
        // the server. Either way, the delete has the effect that was asked for.
        if (!(e instanceof ApiError && e.status === 404)) {
          setRecords(prevRecords);
          setSyncError(e instanceof ApiError ? e.message : 'Could not reach the server — delete was not applied.');
          setStatus('offline');
          return;
        }
      }
      markPending(id, false);
      setSyncError(null);
      setStatus(Object.keys(pendingRef.current).filter((p) => p !== id).length > 0 ? 'pending' : 'synced');
    },
    [setRecords, markPending]
  );

  return { records, addRecord, updateRecord, removeRecord, status, syncError, refresh, pendingCount: Object.keys(pending).length };
}
