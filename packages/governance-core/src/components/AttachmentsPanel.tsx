import { useCallback, useEffect, useState } from 'react';
import { api, apiDownloadUrl, apiUpload, ApiError } from '../api/client';
import type { ApiAttachment } from '../api/types';
import { Button, Card } from './Ui';

function fmtBytes(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

export function AttachmentsPanel({ recordId }: { recordId: string }) {
  const [attachments, setAttachments] = useState<ApiAttachment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<{ attachments: ApiAttachment[] }>(`/api/records/${recordId}/attachments`);
      setAttachments(res.attachments);
      setError(null);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not load attachments — is the backend running?');
    } finally {
      setLoading(false);
    }
  }, [recordId]);

  useEffect(() => {
    load();
  }, [load]);

  const onUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        await apiUpload(`/api/records/${recordId}/attachments`, file);
      }
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const onDelete = async (id: string) => {
    try {
      await api.del(`/api/attachments/${id}`);
      setAttachments((prev) => prev.filter((a) => a.id !== id));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Delete failed');
    }
  };

  return (
    <Card
      title="Attachments"
      subtitle="Deeds, statements, signed documents, photos — stored on the backend, not just described in a text field."
      right={
        <label className="cursor-pointer">
          <span className="rounded-md px-3 py-1.5 text-sm font-medium bg-neutral-900 text-white hover:bg-neutral-700 transition-colors inline-block">
            {uploading ? 'Uploading…' : 'Upload file'}
          </span>
          <input type="file" multiple className="hidden" disabled={uploading} onChange={(e) => onUpload(e.target.files)} />
        </label>
      }
    >
      {error && <p className="text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-md px-3 py-2 mb-3">{error}</p>}
      {loading ? (
        <p className="text-sm text-neutral-400">Loading…</p>
      ) : attachments.length === 0 ? (
        <p className="text-sm text-neutral-400">No files attached yet.</p>
      ) : (
        <ul className="divide-y divide-neutral-100">
          {attachments.map((a) => (
            <li key={a.id} className="flex items-center justify-between py-2 text-sm">
              <div>
                <a href={apiDownloadUrl(`/api/attachments/${a.id}/download`)} className="font-medium text-neutral-800 hover:underline" target="_blank" rel="noreferrer">
                  {a.originalName}
                </a>
                <p className="text-xs text-neutral-400">
                  {fmtBytes(a.sizeBytes)} · uploaded {new Date(a.uploadedAt).toLocaleDateString()}
                </p>
              </div>
              <Button variant="danger" onClick={() => onDelete(a.id)}>
                Remove
              </Button>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
