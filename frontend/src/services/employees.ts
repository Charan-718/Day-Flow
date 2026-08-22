import { api } from '../api/client';
import type { ApiSuccess, EmployeeListItem } from '../types';

export async function listEmployees(search = '', page = 1) {
  const { data } = await api.get<
    ApiSuccess<{ items: EmployeeListItem[]; pagination: { total: number; totalPages: number } }>
  >('/employees', { params: { search, page, pageSize: 50 } });
  return data.data;
}

export async function getEmployee(id: string) {
  const { data } = await api.get<ApiSuccess<unknown>>(`/employees/${id}`);
  return data.data as Record<string, unknown>;
}

export async function updateEmployee(id: string, body: Record<string, unknown>) {
  const { data } = await api.patch(`/employees/${id}`, body);
  return data.data;
}

export async function createEmployee(body: Record<string, unknown>) {
  const { data } = await api.post('/auth/employees', body);
  return data.data as {
    loginId: string;
    temporaryPassword: string;
    employee: { id: string; firstName: string; lastName: string };
  };
}

export async function listDepartments() {
  const { data } = await api.get<ApiSuccess<Array<{ id: string; name: string }>>>(
    '/employees/departments'
  );
  return data.data;
}

export async function getEmployee360(id: string) {
  const { data } = await api.get(`/employees/${id}/360`);
  return data.data;
}

export async function getSalary(id: string) {
  const { data } = await api.get(`/employees/${id}/salary`);
  return data.data;
}
