import { fetch } from 'expo/fetch';

import { supabase } from './supabase';

export const apiBaseUrl = (process.env.EXPO_PUBLIC_API_URL ?? 'https://vn-vton.onrender.com').replace(/\/$/, '');

export class ApiError extends Error {
  constructor(message: string, public readonly status: number, public readonly code?: string) {
    super(message);
    this.name = 'ApiError';
  }
}

export async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const { data } = await supabase.auth.getSession();
  const headers = new Headers(init.headers);
  if (data.session?.access_token) {
    headers.set('Authorization', 'Bearer ' + data.session.access_token);
  }
  const method = (init.method ?? 'GET').toUpperCase();
  if (!['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    headers.set('X-Fitting-Room-Request', '1');
  }

  const request = () => fetch(apiBaseUrl + path, { ...init, headers });
  let response: Response;
  try {
    response = await request();
    if (response.status === 401 && data.session?.refresh_token) {
      const refreshed = await supabase.auth.refreshSession({
        refresh_token: data.session.refresh_token,
      });
      const accessToken = refreshed.data.session?.access_token;
      if (!refreshed.error && accessToken && accessToken !== data.session.access_token) {
        headers.set('Authorization', 'Bearer ' + accessToken);
        response = await request();
      }
    }
  } catch {
    throw new ApiError(
      'Không thể kết nối máy chủ. Hãy kiểm tra mạng và thử lại.',
      0,
      'network_error',
    );
  }

  if (!response.ok) {
    const body = await response.json().catch(() => ({})) as { message?: string; code?: string };
    throw new ApiError(body.message ?? 'Không thể kết nối máy chủ.', response.status, body.code);
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export function protectedImageSource(path: string | null | undefined, accessToken?: string) {
  if (!path) return undefined;
  return {
    uri: path.startsWith('http') ? path : apiBaseUrl + path,
    headers: accessToken ? { Authorization: 'Bearer ' + accessToken } : undefined,
  };
}
