import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import {
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from '../services/admin';

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const qc = useQueryClient();
  const { data = [] } = useQuery({
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
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="relative rounded-md px-2 py-1.5 text-[var(--nav-text)] hover:bg-white/10"
        aria-label="Notifications"
      >
        <span className="text-lg">🔔</span>
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--danger)] px-1 text-[10px] font-bold text-white">
            {unread}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 z-40 mt-2 w-80 overflow-hidden rounded-lg border border-[var(--line)] bg-white shadow-xl">
          <div className="flex items-center justify-between border-b border-[var(--line)] px-3 py-2">
            <span className="text-sm font-semibold text-[var(--ink)]">Notifications</span>
            <button
              type="button"
              className="text-xs text-[var(--accent)]"
              onClick={() => markAll.mutate()}
            >
              Mark all read
            </button>
          </div>
          <ul className="max-h-80 overflow-y-auto">
            {data.length === 0 && (
              <li className="px-3 py-6 text-center text-sm text-[var(--muted)]">
                No notifications
              </li>
            )}
            {data.map((n) => (
              <li key={n.id}>
                <button
                  type="button"
                  className={`block w-full border-b border-[var(--line)] px-3 py-2.5 text-left text-sm hover:bg-[var(--bg)] ${
                    n.isRead ? 'text-[var(--muted)]' : 'font-medium text-[var(--ink)]'
                  }`}
                  onClick={() => {
                    if (!n.isRead) markOne.mutate(n.id);
                  }}
                >
                  <p>{n.message}</p>
                  <p className="mt-0.5 text-xs text-[var(--muted)]">
                    {new Date(n.createdAt).toLocaleString()}
                  </p>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
