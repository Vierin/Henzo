'use client';

import { FormEvent, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Camera, ChevronLeft, User } from 'lucide-react';
import {
  deleteClientAccount,
  fetchClientUser,
  updateClientProfile,
  uploadClientAvatar,
} from '@/lib/client-panel/fetch-profile';
import { clearClientAuthCookie } from '@/lib/client-panel/auth-session-cookie';
import { clientTheme } from '@/lib/client-panel/client-theme';
import { getPublicSupabase } from '@/lib/supabase-public';
import { useTranslation } from '@/contexts/LanguageContext';
import {
  extractLocaleFromPath,
  hardNavigateToLocalePath,
  withLocale,
  type Locale,
} from '@/i18n/routing';

const inputClass =
  'w-full rounded-xl border-0 bg-white px-3.5 py-3 text-[15px] outline-none';

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p
      className="mb-2 text-[13px] font-medium uppercase tracking-[0.04em]"
      style={{ color: clientTheme.textSecondary }}
    >
      {children}
    </p>
  );
}

function splitName(full: string) {
  const parts = full.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { first: '', last: '' };
  return { first: parts[0]!, last: parts.slice(1).join(' ') };
}

function initialsFrom(name: string, email: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean).slice(0, 2);
  if (parts.length > 0) {
    return parts.map((p) => p[0]!.toUpperCase()).join('');
  }
  const mail = email.trim();
  return mail ? mail[0]!.toUpperCase() : '?';
}

export default function ClientProfileEditPage() {
  const pathname = usePathname();
  const locale = (extractLocaleFromPath(pathname) ?? 'en') as Locale;
  const t = useTranslation();
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);

  const userQuery = useQuery({
    queryKey: ['client-user'],
    queryFn: fetchClientUser,
  });

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [profileMsg, setProfileMsg] = useState<string | null>(null);
  const [profileErr, setProfileErr] = useState<string | null>(null);
  const [passwordMsg, setPasswordMsg] = useState<string | null>(null);
  const [passwordErr, setPasswordErr] = useState<string | null>(null);
  const [deleteErr, setDeleteErr] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);

  useEffect(() => {
    const u = userQuery.data;
    if (!u) return;
    const { first, last } = splitName(u.name ?? '');
    setFirstName(first);
    setLastName(last);
    setEmail(u.email ?? '');
    setAvatarUrl(u.avatarUrl ?? null);
  }, [userQuery.data]);

  const fullName = [firstName.trim(), lastName.trim()]
    .filter(Boolean)
    .join(' ');
  const initials = initialsFrom(fullName, email);

  const saveProfile = useMutation({
    mutationFn: async () => {
      if (!firstName.trim()) {
        throw new Error('Enter your first name');
      }
      await updateClientProfile({
        name: fullName,
        phone: userQuery.data?.phone ?? undefined,
        avatarUrl: avatarUrl || undefined,
      });
    },
    onSuccess: async () => {
      setProfileErr(null);
      setProfileMsg('Profile updated');
      await queryClient.invalidateQueries({ queryKey: ['client-user'] });
    },
    onError: (err) => {
      setProfileMsg(null);
      setProfileErr(err instanceof Error ? err.message : 'Failed to update');
    },
  });

  const changePassword = useMutation({
    mutationFn: async () => {
      if (newPassword.length < 8) {
        throw new Error('Password must be at least 8 characters');
      }
      if (newPassword !== confirmPassword) {
        throw new Error('Passwords do not match');
      }
      const { error } = await getPublicSupabase().auth.updateUser({
        password: newPassword,
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      setPasswordErr(null);
      setPasswordMsg('Password changed');
      setNewPassword('');
      setConfirmPassword('');
    },
    onError: (err) => {
      setPasswordMsg(null);
      setPasswordErr(
        err instanceof Error ? err.message : 'Failed to change password',
      );
    },
  });

  const deleteAccount = useMutation({
    mutationFn: async () => {
      await deleteClientAccount();
    },
    onSuccess: async () => {
      clearClientAuthCookie();
      try {
        await getPublicSupabase().auth.signOut({ scope: 'local' });
      } catch {
        /* ignore */
      }
      hardNavigateToLocalePath('/', locale);
    },
    onError: (err) => {
      setDeleteErr(
        err instanceof Error ? err.message : 'Failed to delete account',
      );
      setConfirmDelete(false);
    },
  });

  const onPickAvatar = async (file: File | null) => {
    if (!file) return;
    setAvatarUploading(true);
    setProfileErr(null);
    try {
      const url = await uploadClientAvatar(file);
      setAvatarUrl(url);
      await updateClientProfile({
        name: fullName || userQuery.data?.name || '',
        phone: userQuery.data?.phone ?? undefined,
        avatarUrl: url,
      });
      await queryClient.invalidateQueries({ queryKey: ['client-user'] });
      setProfileMsg('Profile updated');
    } catch (err) {
      setProfileErr(
        err instanceof Error ? err.message : 'Failed to upload photo',
      );
    } finally {
      setAvatarUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const onSaveProfile = (e: FormEvent) => {
    e.preventDefault();
    setProfileMsg(null);
    setProfileErr(null);
    saveProfile.mutate();
  };

  const onChangePassword = (e: FormEvent) => {
    e.preventDefault();
    setPasswordMsg(null);
    setPasswordErr(null);
    changePassword.mutate();
  };

  return (
    <div className="mx-auto w-full max-w-2xl space-y-5 lg:max-w-3xl">
      <div className="flex items-center gap-2">
        <Link
          href={withLocale('/profile', locale)}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-white"
          aria-label="Back to profile"
        >
          <ChevronLeft
            className="h-5 w-5"
            style={{ color: clientTheme.text }}
          />
        </Link>
        <h1
          className="min-w-0 flex-1 text-xl font-bold tracking-tight"
          style={{ color: clientTheme.text }}
        >
          Personal data
        </h1>
      </div>

      {userQuery.isLoading ? (
        <p className="text-sm" style={{ color: clientTheme.textSecondary }}>
          Loading…
        </p>
      ) : userQuery.isError || !userQuery.data ? (
        <p className="text-sm text-red-600">Failed to load profile</p>
      ) : (
        <div className="space-y-8">
          <section>
            <SectionLabel>Personal data</SectionLabel>

            <button
              type="button"
              disabled={avatarUploading}
              onClick={() => fileRef.current?.click()}
              className="mb-3 flex w-full items-center gap-3 rounded-[14px] bg-white px-3.5 py-3.5 text-left disabled:opacity-60"
            >
              <span className="relative h-14 w-14 shrink-0">
                <span
                  className="flex h-full w-full items-center justify-center overflow-hidden rounded-full text-lg font-semibold"
                  style={{
                    backgroundColor: 'rgba(241, 89, 66, 0.15)',
                    color: clientTheme.text,
                  }}
                >
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    initials || <User className="h-6 w-6" />
                  )}
                </span>
                <span
                  className="absolute -bottom-0.5 -right-0.5 flex h-6 w-6 items-center justify-center rounded-full text-white"
                  style={{ backgroundColor: clientTheme.accent }}
                >
                  <Camera className="h-3.5 w-3.5" />
                </span>
              </span>
              <span className="min-w-0 flex-1">
                <span
                  className="block text-[15px] font-medium"
                  style={{ color: clientTheme.text }}
                >
                  {avatarUploading
                    ? 'Uploading…'
                    : avatarUrl
                      ? 'Change profile photo'
                      : 'Add profile photo'}
                </span>
              </span>
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => void onPickAvatar(e.target.files?.[0] ?? null)}
            />

            <form onSubmit={onSaveProfile} className="space-y-2.5">
              <label className="block">
                <span
                  className="mb-1.5 block text-[13px] font-medium"
                  style={{ color: clientTheme.textSecondary }}
                >
                  First name
                </span>
                <input
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="First name"
                  required
                  className={inputClass}
                  style={{ color: clientTheme.text }}
                />
              </label>

              <label className="block">
                <span
                  className="mb-1.5 block text-[13px] font-medium"
                  style={{ color: clientTheme.textSecondary }}
                >
                  Last name
                </span>
                <input
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Last name"
                  className={inputClass}
                  style={{ color: clientTheme.text }}
                />
              </label>

              <label className="block">
                <span
                  className="mb-1.5 block text-[13px] font-medium"
                  style={{ color: clientTheme.textSecondary }}
                >
                  Email
                </span>
                <input
                  type="email"
                  value={email}
                  readOnly
                  disabled
                  className={`${inputClass} opacity-70`}
                  style={{ color: clientTheme.text }}
                />
                <span
                  className="mt-1 block text-xs"
                  style={{ color: clientTheme.textSecondary }}
                >
                  {String(
                    t('clientSettings.emailCannotBeChanged') ||
                      'Email cannot be changed',
                  )}
                </span>
              </label>

              {profileMsg ? (
                <p className="text-sm text-green-700">{profileMsg}</p>
              ) : null}
              {profileErr ? (
                <p className="text-sm text-red-600">{profileErr}</p>
              ) : null}

              <button
                type="submit"
                disabled={saveProfile.isPending}
                className="mt-2 w-full rounded-[14px] py-3.5 text-[15px] font-semibold text-white disabled:opacity-60"
                style={{ backgroundColor: clientTheme.accent }}
              >
                {saveProfile.isPending ? 'Saving…' : 'Save'}
              </button>
            </form>
          </section>

          <section>
            <SectionLabel>Security</SectionLabel>
            <form onSubmit={onChangePassword} className="space-y-2.5">
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                <label className="block min-w-0">
                  <span
                    className="mb-1.5 block text-[13px] font-medium"
                    style={{ color: clientTheme.textSecondary }}
                  >
                    New password
                  </span>
                  <input
                    type="password"
                    autoComplete="new-password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="New password"
                    className={inputClass}
                    style={{ color: clientTheme.text }}
                  />
                </label>
                <label className="block min-w-0">
                  <span
                    className="mb-1.5 block text-[13px] font-medium"
                    style={{ color: clientTheme.textSecondary }}
                  >
                    Confirm password
                  </span>
                  <input
                    type="password"
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm password"
                    className={inputClass}
                    style={{ color: clientTheme.text }}
                  />
                </label>
              </div>

              {passwordMsg ? (
                <p className="text-sm text-green-700">{passwordMsg}</p>
              ) : null}
              {passwordErr ? (
                <p className="text-sm text-red-600">{passwordErr}</p>
              ) : null}

              <button
                type="submit"
                disabled={changePassword.isPending}
                className="mt-2 w-full rounded-[14px] py-3.5 text-[15px] font-semibold text-white disabled:opacity-60"
                style={{ backgroundColor: clientTheme.accent }}
              >
                {changePassword.isPending ? 'Changing…' : 'Change password'}
              </button>
            </form>
          </section>

          <section>
            <SectionLabel>Danger zone</SectionLabel>
            <p
              className="mb-3 text-sm"
              style={{ color: clientTheme.textSecondary }}
            >
              Once you delete your account, there is no going back.
            </p>
            {deleteErr ? (
              <p className="mb-2 text-sm text-red-600">{deleteErr}</p>
            ) : null}
            <button
              type="button"
              disabled={deleteAccount.isPending}
              onClick={() => setConfirmDelete(true)}
              className="w-full rounded-[14px] border-2 bg-transparent py-3.5 text-[15px] font-semibold disabled:opacity-60"
              style={{ borderColor: '#EF4444', color: '#EF4444' }}
            >
              Delete account
            </button>
          </section>
        </div>
      )}

      {confirmDelete ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-account-title"
        >
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
            <h2
              id="delete-account-title"
              className="text-lg font-bold"
              style={{ color: clientTheme.text }}
            >
              Delete account?
            </h2>
            <p
              className="mt-2 text-sm"
              style={{ color: clientTheme.textSecondary }}
            >
              This permanently deletes your account and booking history. This
              cannot be undone.
            </p>
            <div className="mt-5 flex gap-2">
              <button
                type="button"
                className="flex-1 rounded-xl border border-[#E8E0D8] py-2.5 text-sm font-semibold"
                style={{ color: clientTheme.text }}
                onClick={() => setConfirmDelete(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleteAccount.isPending}
                onClick={() => deleteAccount.mutate()}
                className="flex-1 rounded-xl bg-[#EF4444] py-2.5 text-sm font-semibold text-white disabled:opacity-60"
              >
                {deleteAccount.isPending ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
