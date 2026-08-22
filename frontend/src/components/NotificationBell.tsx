import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import {
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from '../services/admin';
import { useDismissableMenu } from '../hooks/useDismissableMenu';
import { BellIcon } from './icons';

function formatRelative(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.round(diffMs / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const qc = useQueryClient();
  const containerRef = useRef<HTMLDivElement>(null);
  useDismissableMenu(containerRef, open, () => setOpen(false));

  const { data = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => listNotifications(false),
    refetchInterval: 30000,
  });

  const unread = data.filter((n) => !n.isRead).length;

  const markOne = useMutation({
    mutationFn: markNotificationRead,
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const markAll = useMutation({
    mutationFn: markAllNotificationsRead,
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['notifications'] }),
  });

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={unread > 0 ? `Notifications, ${unread} unread` : 'Notifications'}
        className="relative rounded-md p-2 text-[var(--nav-text)] hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--nav)]"
      >
        <BellIcon size={19} />
        {unread > 0 && (
          <span
            aria-hidden="true"
            className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--danger)] px-1 font-mono text-[11px] font-semibold text-white"
          >
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>
      {open && (
        <div
          role="menu"
          aria-label="Notifications"
          className="absolute right-0 z-40 mt-2 w-80 max-w-[calc(100vw-1.5rem)] overflow-hidden rounded-lg border border-[var(--line)] bg-white shadow-xl"
        >
          <div className="flex items-center justify-between border-b border-[var(--line)] px-3 py-2.5">
            <span className="text-sm font-semibold text-[var(--ink)]">Notifications</span>
            {data.length > 0 && (
              <button
                type="button"
                className="rounded px-1.5 py-0.5 text-xs font-medium text-[var(--accent)] hover:bg-[var(--accent-soft)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
                onClick={() => markAll.mutate()}
                disabled={markAll.isPending || unread === 0}
              >
                Mark all read
              </button>
            )}
          </div>

          {isLoading && (
            <div className="space-y-2 p-3" aria-busy="true" aria-label="Loading notifications">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-10 animate-pulse rounded-md bg-[var(--bg)]" />
              ))}
            </div>
          )}

          {isError && (
            <div className="px-3 py-6 text-center">
              <p className="text-sm text-[var(--danger)]">Couldn't load notifications.</p>
              <button
                type="button"
                onClick={() => refetch()}
                className="mt-2 text-sm font-medium text-[var(--accent)] underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
              >
                Retry
              </button>
            </div>
          )}

          {!isLoading && !isError && (
            <ul className="max-h-80 overflow-y-auto">
              {data.length === 0 && (
                <li className="px-3 py-6 text-center text-sm text-[var(--muted)]">
                  You're all caught up
                </li>
              )}
              {data.map((n) => (
                <li key={n.id}>
                  <button
                    type="button"
                    role="menuitem"
                    className={`block w-full border-b border-[var(--line)] px-3 py-2.5 text-left text-sm last:border-0 hover:bg-[var(--bg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--accent)] ${
                      n.isRead ? 'text-[var(--muted)]' : 'font-medium text-[var(--ink)]'
                    }`}
                    onClick={() => {
                      if (!n.isRead) markOne.mutate(n.id);
                    }}
                  >
                    <p>{n.message}</p>
                    <p className="mt-0.5 text-xs text-[var(--muted)]">{formatRelative(n.createdAt)}</p>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
