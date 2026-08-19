import type { SyncStatus as SyncStatusValue } from '../api/useSyncedRecords';

const CONFIG: Record<SyncStatusValue, { label: string; className: string }> = {
  idle: { label: '', className: '' },
  syncing: { label: 'Syncing…', className: 'text-neutral-400' },
  synced: { label: 'Synced', className: 'text-emerald-600' },
  offline: { label: 'Offline — showing last saved copy', className: 'text-amber-600' },
};

export function SyncStatusIndicator({ status, error }: { status: SyncStatusValue; error?: string | null }) {
  const c = CONFIG[status];
  if (!c.label) return null;
  return (
    <span className={`text-xs ${c.className}`} title={error ?? undefined}>
      ● {c.label}
    </span>
  );
}
