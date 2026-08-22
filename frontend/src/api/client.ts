import axios from 'axios';

const baseURL = import.meta.env.VITE_API_URL || '/api';

export const api = axios.create({
  baseURL,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('dayflow_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('dayflow_token');
      if (!window.location.pathname.startsWith('/login')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export function getApiError(err: unknown): { message: string; code?: string } {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data as { message?: string; code?: string } | undefined;
    return {
      message: data?.message || err.message || 'Request failed',
      code: data?.code,
    };
  }
  return { message: 'Unexpected error' };
}
