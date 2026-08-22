import { api } from '../api/client';
import type { ApiSuccess } from '../types';

export async function uploadFile(file: File): Promise<string> {
  const dataBase64 = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1] || '';
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  const { data } = await api.post<ApiSuccess<{ url: string }>>('/files', {
    fileName: file.name,
    dataBase64,
  });
  return data.data.url;
}
