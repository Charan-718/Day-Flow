import { api } from '../api/client';
import type { ApiSuccess, NotificationItem } from '../types';

export async function listNotifications(unreadOnly = false) {
  const { data } = await api.get<ApiSuccess<NotificationItem[]>>('/notifications', {
    params: { unreadOnly: unreadOnly ? 'true' : 'false' },
  });
  return data.data;
}

export async function markNotificationRead(id: string) {
  await api.patch(`/notifications/${id}/read`);
}

export async function markAllNotificationsRead() {
  await api.post('/notifications/read-all');
}

export async function getDashboardSummary() {
  const { data } = await api.get('/dashboard/summary');
  return data.data;
}

export async function getHealthScore() {
  const { data } = await api.get('/dashboard/health-score');
  return data.data;
}

export async function listAuditLogs(params?: Record<string, string | number>) {
  const { data } = await api.get('/audit-logs', { params });
  return data.data;
}
