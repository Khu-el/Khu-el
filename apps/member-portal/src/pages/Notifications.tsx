// In-app notifications. They exist only here: nothing is emailed or pushed.
// A member may only mark their own notifications read (column grant on
// read_at); the list and the header badge are both refreshed after each change.
import { useEffect, useState } from 'react';
import { Button, Card } from '@nte/governance-core';
import { usePortal } from '../context';
import { NOTIFICATION_LIST_LIMIT, countUnreadNotifications, listNotifications, markAllNotificationsRead, markNotificationRead } from '../data/api';
import { href, parseRoute } from '../logic/routes';
import { Badge, Empty, ErrorNote, Loading, Notice, formatDateTime, useLoad } from '../components/common';
import type { Notification } from '../types';

/**
 * Only in-portal links ("#/support") are ever rendered as links. Anything else
 * -- an absolute URL, a javascript: URL, an unknown page -- is not linked.
 */
function internalHref(actionUrl: string | null): string | null {
  if (!actionUrl || !actionUrl.startsWith('#/')) return null;
  const route = parseRoute(actionUrl);
  if (route.name === 'not-found') return null;
  return href(route);
}

export function Notifications() {
  const { userId, timezone, refreshUnread, syncUnread } = usePortal();
  // The list is capped; the unread total is counted exactly, so an unread
  // notification beyond the cap still counts and "Mark all read" still reaches it.
  const load = useLoad(
    () => Promise.all([listNotifications(userId), countUnreadNotifications(userId)]).then(([items, unread]) => ({ items, unread })),
    [userId],
  );
  const list = { data: load.data?.items ?? null, loading: load.loading, error: load.error, reload: load.reload };
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<unknown>(null);

  const items = list.data ?? [];
  const unread = load.data?.unread ?? 0;
  const unreadShown = items.filter((n) => !n.read_at).length;

  // The header badge follows the exact count this page loads, so the two never disagree.
  useEffect(() => {
    if (load.data) syncUnread(load.data.unread);
  }, [load.data, syncUnread]);

  async function run(key: string, action: () => Promise<void>) {
    if (busy) return;
    setBusy(key);
    setError(null);
    try {
      await action();
    } catch (e) {
      setError(e);
    } finally {
      setBusy(null);
      list.reload();
      refreshUnread();
    }
  }

  const markOne = (id: string) => run(id, () => markNotificationRead(id));
  const markAll = () => run('all', () => markAllNotificationsRead(userId));

  return (
    <div className="space-y-4">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">Notifications</h1>
        <p className="text-sm text-slate-600">
          Updates from the portal, such as a change to one of your support requests. They appear here only — nothing is emailed or pushed to your
          device.
        </p>
      </header>

      <Card
        title="Your notifications"
        subtitle={load.data ? (unread === 0 ? 'No unread notifications.' : `${unread} unread`) : undefined}
        right={
          <Button variant="secondary" onClick={markAll} disabled={busy !== null || unread === 0}>
            {busy === 'all' ? 'Marking…' : 'Mark all read'}
          </Button>
        }
      >
        <div className="space-y-3">
          {error ? <ErrorNote error={error} /> : null}
          <NotificationList
            items={list.data}
            loading={list.loading}
            error={list.error}
            timezone={timezone}
            busy={busy}
            onMarkRead={markOne}
          />
          {unread > unreadShown ? (
            <Notice>
              Showing your {unreadShown} newest unread notifications of {unread}. “Mark all read” marks every one of them, including those not shown.
            </Notice>
          ) : (
            items.length >= NOTIFICATION_LIST_LIMIT && <Notice>Showing your unread notifications and the most recent read ones ({NOTIFICATION_LIST_LIMIT} in all).</Notice>
          )}
        </div>
      </Card>
    </div>
  );
}

function NotificationList({
  items,
  loading,
  error,
  timezone,
  busy,
  onMarkRead,
}: {
  items: Notification[] | null;
  loading: boolean;
  error: unknown;
  timezone: string | null;
  busy: string | null;
  onMarkRead: (id: string) => void;
}) {
  if (error) return <ErrorNote error={error} />;
  if (loading && !items) return <Loading />;
  if (!items || items.length === 0) return <Empty>You have no notifications yet.</Empty>;
  return (
    <ul className="divide-y divide-slate-200">
      {items.map((n) => {
        const isUnread = !n.read_at;
        const link = internalHref(n.action_url);
        return (
          <li key={n.id} className={`flex flex-col gap-2 py-3 sm:flex-row sm:items-start sm:justify-between ${isUnread ? '' : 'text-slate-600'}`}>
            <div className="min-w-0 space-y-1">
              <p className={`break-words ${isUnread ? 'font-semibold text-slate-900' : 'font-normal'}`}>
                {isUnread && (
                  <span className="mr-2 align-middle">
                    <Badge tone="blue">Unread</Badge>
                  </span>
                )}
                {n.title}
              </p>
              <p className={`whitespace-pre-wrap break-words text-sm ${isUnread ? 'font-medium text-slate-800' : ''}`}>{n.body}</p>
              <p className="text-xs text-slate-500">
                {formatDateTime(n.created_at, timezone)}
                {n.read_at && ` · Read ${formatDateTime(n.read_at, timezone)}`}
              </p>
              {link && (
                <a href={link} className="inline-block text-sm text-slate-900 underline">
                  Open the related page
                </a>
              )}
            </div>
            {isUnread && (
              <div className="shrink-0">
                <Button variant="secondary" onClick={() => onMarkRead(n.id)} disabled={busy !== null}>
                  {busy === n.id ? 'Marking…' : 'Mark read'}
                </Button>
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
