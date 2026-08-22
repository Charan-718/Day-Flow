import { api } from '../api/client';
import type { ApiSuccess, LeaveRequest, LeaveType } from '../types';

export async function getLeaveTypes() {
  const { data } = await api.get<ApiSuccess<LeaveType[]>>('/leave/types');
  return data.data;
}

export async function getLeaveBalance() {
  const { data } = await api.get('/leave/balance');
  return data.data as Array<{
    leaveType: LeaveType;
    allocatedDays: number;
    usedDays: number;
    availableDays: number;
  }>;
}

export async function listLeaveRequests(params?: {
  status?: string;
  employeeId?: string;
  page?: number;
  pageSize?: number;
}) {
  const { data } = await api.get<
    ApiSuccess<{
      items: LeaveRequest[];
      pagination: { page: number; pageSize: number; total: number; totalPages: number };
    }>
  >('/leave/requests', { params });
  return data.data;
}

export async function createLeaveRequest(body: Record<string, unknown>) {
  const { data } = await api.post('/leave/requests', body);
  return data.data;
}

export async function approveLeave(id: string, comment?: string) {
  const { data } = await api.patch(`/leave/requests/${id}/approve`, { comment });
  return data.data;
}

export async function rejectLeave(id: string, comment: string) {
  const { data } = await api.patch(`/leave/requests/${id}/reject`, { comment });
  return data.data;
}
