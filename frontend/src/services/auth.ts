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
