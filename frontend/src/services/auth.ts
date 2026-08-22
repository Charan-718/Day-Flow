import { api } from '../api/client';
import type { AuthUser, ApiSuccess } from '../types';

export async function login(email: string, password: string) {
  const { data } = await api.post<ApiSuccess<{ token: string; user: AuthUser }>>(
    '/auth/login',
    { email, password }
  );
  return data.data;
}

export async function fetchMe() {
  const { data } = await api.get<ApiSuccess<AuthUser & { employee: unknown; status: string }>>(
    '/auth/me'
  );
  return data.data;
}

export async function logout() {
  await api.post('/auth/logout');
}

export async function changePassword(currentPassword: string, newPassword: string) {
  const { data } = await api.post('/auth/change-password', {
    currentPassword,
    newPassword,
  });
  return data.data;
}

export interface RegisterPayload {
  companyName: string;
  companyLogoFileName?: string;
  companyLogoBase64?: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
}

/** HR / company bootstrap. The API refuses once an organisation exists. */
export async function register(payload: RegisterPayload) {
  const { data } = await api.post<
    ApiSuccess<{ token: string; user: AuthUser; company: { name: string; code: string } }>
  >('/auth/register', payload);
  return data.data;
}

export async function getRegistrationStatus() {
  const { data } = await api.get<ApiSuccess<{ open: boolean }>>('/auth/registration-status');
  return data.data;
}

/** HR-only — there's no self-service email reset, so HR relays this temporary password
 * directly to the employee. Forces a password change on their next login. */
export async function resetEmployeePassword(employeeId: string) {
  const { data } = await api.post<
    ApiSuccess<{ loginId: string; email: string; temporaryPassword: string }>
  >(`/auth/employees/${employeeId}/reset-password`);
  return data.data;
}
