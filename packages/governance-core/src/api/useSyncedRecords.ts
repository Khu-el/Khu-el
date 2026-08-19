import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage';
import type { GovernedRecord } from '../types';
import { api, ApiError } from './client';
import type { AppId } from './types';

export type SyncStatus = 'idle' | 'syncing' | 'synced' | 'offline';

/**
 * Records are cached in localStorage (so the app still works offline / mid-flight)
 * and synced against the backend whenever authenticated. The cache is the
 * fallback, never the source of truth once a session is live.
 */
export function useSyncedRecords<T>(appId: AppId, cacheKey: string, isAuthenticated: boolean) {
  const [records, setRecords] = useLocalStorage<GovernedRecord<T>[]>(cacheKey, []);
  const [status, setStatus] = useState<SyncStatus>('idle');
  const [syncError, setSyncError] = useState<string | null>(null);
  const loadedFor = useRef<string | null>(null);

  const refresh = useCallback(async () => {
    if (!isAuthenticated) return;
    setStatus('syncing');
    try {
      const res = await api.get<{ records: GovernedRecord<T>[] }>(`/api/records?appId=${appId}`);
      setRecords(res.records);
      setSyncError(null);
      setStatus('synced');
    } catch (e) {
      setSyncError(e instanceof ApiError ? e.message : 'Could not reach the server — showing your last saved copy.');
      setStatus('offline');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appId, isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) {
      loadedFor.current = null;
      return;
    }
    if (loadedFor.current === appId) return;
    loadedFor.current = appId;
    refresh();
  }, [appId, isAuthenticated, refresh]);

  const addRecord = useCallback(
    async (record: GovernedRecord<T>) => {
      setRecords((prev) => [record, ...prev]);
      try {
        const res = await api.post<{ record: GovernedRecord<T> }>('/api/records', { appId, ...record });
        setRecords((prev) => prev.map((r) => (r.id === record.id ? res.record : r)));
        setSyncError(null);
        setStatus('synced');
      } catch (e) {
        setSyncError(e instanceof ApiError ? e.message : 'Saved locally — could not reach the server to sync yet.');
        setStatus('offline');
      }
    },
    [appId, setRecords]
  );

  const updateRecord = useCallback(
    async (record: GovernedRecord<T>) => {
      setRecords((prev) => prev.map((r) => (r.id === record.id ? record : r)));
      try {
        const res = await api.put<{ record: GovernedRecord<T> }>(`/api/records/${record.id}`, record);
        setRecords((prev) => prev.map((r) => (r.id === record.id ? res.record : r)));
        setSyncError(null);
        setStatus('synced');
      } catch (e) {
        setSyncError(e instanceof ApiError ? e.message : 'Saved locally — could not reach the server to sync yet.');
        setStatus('offline');
      }
    },
    [setRecords]
  );

  const removeRecord = useCallback(
    async (id: string) => {
      const prevRecords = records;
      setRecords((prev) => prev.filter((r) => r.id !== id));
      try {
        await api.del(`/api/records/${id}`);
        setSyncError(null);
        setStatus('synced');
      } catch (e) {
        setRecords(prevRecords);
        setSyncError(e instanceof ApiError ? e.message : 'Could not reach the server — delete was not applied.');
        setStatus('offline');
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [records, setRecords]
  );

  return { records, addRecord, updateRecord, removeRecord, status, syncError, refresh };
}
