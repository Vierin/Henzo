import { plainToClass } from 'class-transformer';
import { supabase } from './supabase';
import { getPublicSupabase } from './supabase-public';
import { logger } from './logger';
import { extractLocaleFromPath, withLocale, type Locale } from '@/i18n/routing';
import type { Session } from '@supabase/supabase-js';

export interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

async function resolveAuthSession(): Promise<Session | null> {
  const onAdminPath =
    typeof window !== 'undefined' &&
    /\/admin(?:\/|$)/.test(window.location.pathname);

  // Admin uses cookie PKCE; public owner/client uses localStorage. Prefer the
  // cookie session on /admin so leftover public JWTs don't 403 /admin/session.
  if (onAdminPath) {
    const cookieSession = await supabase.auth.getSession();
    if (cookieSession.data.session) return cookieSession.data.session;
  }

  try {
    const publicSession = await getPublicSupabase().auth.getSession();
    if (publicSession.data.session) return publicSession.data.session;
  } catch {
    // public client may throw if misconfigured
  }
  const cookieSession = await supabase.auth.getSession();
  return cookieSession.data.session;
}

export class ApiClient {
  private baseUrl: string;
  private readonly REQUEST_TIMEOUT = 30000; // 30 seconds

  constructor(baseUrl: string = 'https://api.henzo.app') {
    this.baseUrl = baseUrl;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit & { responseType?: 'blob' } = {},
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const { responseType, ...fetchOptions } = options;

    const session = await resolveAuthSession();
    const headers: HeadersInit = {};

    // Don't set Content-Type for blob requests
    if (responseType !== 'blob') {
      headers['Content-Type'] = 'application/json';
    }

    if (session?.access_token) {
      (headers as Record<string, string>)['Authorization'] =
        `Bearer ${session.access_token}`;
    }

    // Custom headers last so callers can override Authorization (e.g. fresh signUp token)
    if (options.headers) {
      Object.assign(headers, options.headers);
    }

    // Create AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(
      () => controller.abort(),
      this.REQUEST_TIMEOUT,
    );

    const config: RequestInit = {
      ...fetchOptions,
      headers,
      signal: controller.signal,
    };

    let response: Response;
    try {
      response = await fetch(url, config);
      clearTimeout(timeoutId);
    } catch (error: any) {
      clearTimeout(timeoutId);

      // Handle abort (timeout)
      if (error.name === 'AbortError' || controller.signal.aborted) {
        const timeoutError = new Error(
          `Request timeout: The request took longer than ${this.REQUEST_TIMEOUT / 1000} seconds`,
        );
        (timeoutError as any).isTimeoutError = true;
        (timeoutError as any).url = url;
        throw timeoutError;
      }

      // Handle network errors (CORS, connection refused, etc.)
      const errorMessage =
        error.message === 'Failed to fetch' || error.message === 'fetch failed'
          ? `Unable to connect to the server.`
          : error.message || 'Network error occurred';

      // Only log in development to avoid cluttering production logs
      if (process.env.NODE_ENV === 'development') {
        console.error('Network Error:', {
          url,
          error: errorMessage,
          baseUrl: this.baseUrl,
        });
      }

      // Create a more specific error that can be caught and handled gracefully
      const networkError = new Error(errorMessage);
      (networkError as any).isNetworkError = true;
      (networkError as any).url = url;
      throw networkError;
    }

    if (!response.ok) {
      // Handle 401 Unauthorized - automatically logout
      if (response.status === 401) {
        // Try to logout user and redirect to login
        try {
          await Promise.allSettled([
            getPublicSupabase().auth.signOut({ scope: 'local' }),
            supabase.auth.signOut({ scope: 'local' }),
          ]);
          // Redirect to login page if we're in browser
          if (typeof window !== 'undefined') {
            const currentPath = window.location.pathname;
            const isAdminPath = currentPath.includes('/admin');
            if (
              !currentPath.includes('/login') &&
              !currentPath.includes('/register')
            ) {
              const locale =
                extractLocaleFromPath(currentPath) ?? ('en' as Locale);
              window.location.href = isAdminPath
                ? withLocale('/admin/login?session=expired', locale)
                : withLocale('/login?session=expired', locale);
            }
          }
        } catch (logoutError) {
          // Ignore logout errors, but log them
          logger.error('Failed to logout on 401:', logoutError);
        }

        const authError = new Error(
          'Your session has expired. Please log in again.',
        );
        (authError as any).status = 401;
        (authError as any).isAuthError = true;
        throw authError;
      }

      // For blob responses, don't try to parse as JSON
      if (responseType === 'blob') {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const errorData = await response.json().catch(() => ({}));

      // Log error details for debugging
      if (process.env.NODE_ENV === 'development') {
        console.error('API Error:', {
          url,
          status: response.status,
          errorData,
        });
      }

      const flattenMessage = (raw: unknown): string | null => {
        if (typeof raw === 'string' && raw.trim()) return raw.trim();
        if (Array.isArray(raw)) {
          const parts = raw
            .map((item) => {
              if (typeof item === 'string') return item.trim();
              if (item && typeof item === 'object') {
                const constraints = (
                  item as { constraints?: Record<string, string> }
                ).constraints;
                if (constraints) {
                  const first = Object.values(constraints)[0];
                  if (typeof first === 'string' && first.trim())
                    return first.trim();
                }
                const msg = (item as { message?: unknown }).message;
                if (typeof msg === 'string' && msg.trim()) return msg.trim();
              }
              return '';
            })
            .filter(Boolean);
          return parts.length > 0 ? parts.join('; ') : null;
        }
        return null;
      };

      // NestJS returns errors as { msg: string, code: number } or { message: string | string[], statusCode: number }
      // But some endpoints might return { error: string }
      // For validation errors, extract specific constraint messages
      let errorMessage =
        flattenMessage(errorData.msg) ||
        flattenMessage(errorData.message) ||
        flattenMessage(errorData.error) ||
        `HTTP error! status: ${response.status}`;

      // If it's a validation error, extract the first constraint message
      if (
        errorData.errors &&
        Array.isArray(errorData.errors) &&
        errorData.errors.length > 0
      ) {
        const firstError = errorData.errors[0];
        if (firstError.constraints) {
          const constraintKeys = Object.keys(firstError.constraints);
          if (constraintKeys.length > 0) {
            errorMessage = firstError.constraints[constraintKeys[0]];
          }
        }
      }

      // Include more details in error for 500 errors
      if (response.status >= 500) {
        const error = new Error(errorMessage);
        (error as any).status = response.status;
        (error as any).url = url;
        (error as any).errorData = errorData;
        throw error;
      }

      const error = new Error(errorMessage);
      (error as any).status = response.status;
      (error as any).errorData = errorData;
      if (errorData?.code != null) {
        (error as any).code = errorData.code;
      }
      throw error;
    }

    // Handle blob responses
    if (responseType === 'blob') {
      const blob = await response.blob();
      // Blob responses don't need logging in production
      // Return the blob directly as T
      return blob as T;
    }

    // Check if response has content
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      const text = await response.text();
      if (text.trim() === '') {
        return null as T; // Return null for empty responses
      }
      const data = JSON.parse(text);

      return data;
    }

    // For non-JSON responses, return the text
    return (await response.text()) as T;
  }

  // Generic CRUD operations
  async get<T>(
    endpoint: string,
    options?: {
      responseType?: 'blob';
      cache?: RequestCache;
      headers?: HeadersInit;
    },
  ): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET', ...options });
  }

  async post<T>(
    endpoint: string,
    data?: unknown,
    options?: { headers?: HeadersInit },
  ): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
      ...options,
    });
  }

  async put<T>(
    endpoint: string,
    data?: unknown,
    options?: { headers?: HeadersInit },
  ): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
      ...options,
    });
  }

  async patch<T>(
    endpoint: string,
    data?: unknown,
    options?: { headers?: HeadersInit },
  ): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
      ...options,
    });
  }

  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }

  // Utility method to transform response data
  transformResponse<T>(data: unknown, DtoClass: new () => T): T {
    return plainToClass(DtoClass, data);
  }

  // Utility method to transform array response data
  transformArrayResponse<T>(data: unknown[], DtoClass: new () => T): T[] {
    return data.map((item) => plainToClass(DtoClass, item));
  }
}

// Create a default API client instance
// В продакшене будет использоваться URL бэкенда на Digital Ocean
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.henzo.app';
export const apiClient = new ApiClient(API_BASE_URL);
