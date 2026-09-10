import { apiClient } from '@/lib/api-client';

export async function fetchCurrentUserRole(
  options: { syncIfMissing?: boolean } = {},
): Promise<string | null> {
  try {
    const endpoint =
      options.syncIfMissing === true
        ? '/auth/user?syncIfMissing=true'
        : '/auth/user';
    const res = await apiClient.get<{ user: { role: string } }>(endpoint);
    return res.user?.role ?? null;
  } catch {
    return null;
  }
}

export async function requestClientRegistrationCode(body: {
  email: string;
  password: string;
  name?: string;
}): Promise<void> {
  await apiClient.post('/auth/register-client/request-code', body);
}

export async function verifyClientRegistrationCode(body: {
  email: string;
  code: string;
}): Promise<{
  user: { id: string; email: string; role: string };
  session: { access_token?: string; refresh_token?: string } | null;
}> {
  return apiClient.post('/auth/register-client/verify-code', body);
}
