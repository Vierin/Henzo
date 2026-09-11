'use client';

import { FormEvent, useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Camera, User } from 'lucide-react';
import { SettingsSubpageShell } from '@/components/owner/settingsSubpageShell';
import { useTranslation } from '@/contexts/LanguageContext';
import {
  deleteOwnerAccount,
  fetchOwnerAccountProfile,
  updateOwnerAccountProfile,
  uploadOwnerAvatar,
} from '@/lib/owner/fetch-account';
import { clearOwnerAuthCookie } from '@/lib/owner/auth-session-cookie';
import { ownerTheme } from '@/lib/owner/owner-theme';
import { getPublicSupabase } from '@/lib/supabase-public';
import {
  extractLocaleFromPath,
  hardNavigateToLocalePath,
  type Locale,
} from '@/i18n/routing';

const inputClass =
  'w-full rounded-xl border-0 bg-white px-3.5 py-3 text-[15px] outline-none';

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p
      className="mb-2 text-[13px] font-medium uppercase tracking-[0.04em]"
      style={{ color: ownerTheme.textSecondary }}
    >
      {children}
    </p>
  );
}

function initialsFrom(name: string, email: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean).slice(0, 2);
  if (parts.length > 0) {
    return parts.map((p) => p[0]!.toUpperCase()).join('');
  }
  const mail = email.trim();
  return mail ? mail[0]!.toUpperCase() : '?';
}

export default function AccountSettingsPage() {
  const t = useTranslation();
  const pathname = usePathname();
  const locale = (extractLocaleFromPath(pathname) ?? 'en') as Locale;
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);

  const profileQuery = useQuery({
    queryKey: ['owner-account-profile'],
    queryFn: fetchOwnerAccountProfile,
  });

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
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
    const p = profileQuery.data;
    if (!p) return;
    setName(p.name);
    setPhone(p.phone);
    setAvatarUrl(p.avatarUrl);
  }, [profileQuery.data]);

  const email = profileQuery.data?.email ?? '';
  const initials = initialsFrom(name, email);

  const saveProfile = useMutation({
    mutationFn: async () => {
      await updateOwnerAccountProfile({
        name: name.trim(),
        phone: phone.trim(),
        avatarUrl: avatarUrl || undefined,
      });
    },
    onSuccess: async () => {
      setProfileErr(null);
      setProfileMsg(
        t('owner.profileSettings.profileUpdated') || 'Profile updated',
      );
      await queryClient.invalidateQueries({
        queryKey: ['owner-account-profile'],
      });
    },
    onError: (err) => {
      setProfileMsg(null);
      setProfileErr(
        err instanceof Error
          ? err.message
          : t('owner.profileSettings.failedToUpdate') || 'Failed to update',
      );
    },
  });

  const changePassword = useMutation({
    mutationFn: async () => {
      if (newPassword.length < 8) {
        throw new Error(
          t('owner.profileSettings.passwordMinLength') ||
            'Password must be at least 8 characters',
        );
      }
      if (newPassword !== confirmPassword) {
        throw new Error(
          t('owner.profileSettings.passwordsDoNotMatch') ||
            'Passwords do not match',
        );
      }
      const { error } = await getPublicSupabase().auth.updateUser({
        password: newPassword,
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      setPasswordErr(null);
      setPasswordMsg(
        t('owner.profileSettings.passwordChanged') || 'Password changed',
      );
      setNewPassword('');
      setConfirmPassword('');
    },
    onError: (err) => {
      setPasswordMsg(null);
      setPasswordErr(
        err instanceof Error
          ? err.message
          : t('owner.profileSettings.failedToChangePassword') ||
              'Failed to change password',
      );
    },
  });

  const deleteAccount = useMutation({
    mutationFn: async () => {
      await deleteOwnerAccount();
    },
    onSuccess: async () => {
      clearOwnerAuthCookie();
      try {
        await getPublicSupabase().auth.signOut({ scope: 'local' });
      } catch {
        /* ignore */
      }
      hardNavigateToLocalePath('/', locale);
    },
    onError: (err) => {
      setDeleteErr(
        err instanceof Error
          ? err.message
          : t('owner.profileSettings.failedToDelete') ||
              'Failed to delete account',
      );
      setConfirmDelete(false);
    },
  });

  const onPickAvatar = async (file: File | null) => {
    if (!file) return;
    setAvatarUploading(true);
    setProfileErr(null);
    try {
      const url = await uploadOwnerAvatar(file);
      setAvatarUrl(url);
      await updateOwnerAccountProfile({
        name: name.trim(),
        phone: phone.trim(),
        avatarUrl: url,
      });
      await queryClient.invalidateQueries({
        queryKey: ['owner-account-profile'],
      });
      setProfileMsg(
        t('owner.profileSettings.profileUpdated') || 'Profile updated',
      );
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
    <SettingsSubpageShell
      title={t('owner.profileSettings.title') || 'Account settings'}
    >
      {profileQuery.isLoading ? (
        <p className="text-sm" style={{ color: ownerTheme.textSecondary }}>
          {t('owner.profileSettings.loading') || 'Loading…'}
        </p>
      ) : profileQuery.isError || !profileQuery.data ? (
        <p className="text-sm text-red-600">Failed to load account</p>
      ) : (
        <div className="space-y-8">
          {/* Personal */}
          <section>
            <SectionLabel>
              {t('owner.profileSettings.personalInformation') ||
                'Personal information'}
            </SectionLabel>

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
                    backgroundColor: ownerTheme.bgSoft,
                    color: ownerTheme.text,
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
                  style={{ backgroundColor: ownerTheme.accent }}
                >
                  <Camera className="h-3.5 w-3.5" />
                </span>
              </span>
              <span className="min-w-0 flex-1">
                <span
                  className="block text-[15px] font-medium"
                  style={{ color: ownerTheme.text }}
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
                  style={{ color: ownerTheme.textSecondary }}
                >
                  {t('owner.profileSettings.fullName') || 'Full name'}
                </span>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={
                    t('owner.profileSettings.fullNamePlaceholder') || 'Name'
                  }
                  className={inputClass}
                  style={{ color: ownerTheme.text }}
                />
              </label>

              <label className="block">
                <span
                  className="mb-1.5 block text-[13px] font-medium"
                  style={{ color: ownerTheme.textSecondary }}
                >
                  {t('owner.profileSettings.emailAddress') || 'Email'}
                </span>
                <input
                  value={email}
                  readOnly
                  disabled
                  className={`${inputClass} opacity-70`}
                  style={{ color: ownerTheme.text }}
                />
                <span
                  className="mt-1 block text-xs"
                  style={{ color: ownerTheme.textSecondary }}
                >
                  {t('owner.profileSettings.emailCannotBeChanged') ||
                    'Email cannot be changed'}
                </span>
              </label>

              <label className="block">
                <span
                  className="mb-1.5 block text-[13px] font-medium"
                  style={{ color: ownerTheme.textSecondary }}
                >
                  {t('owner.profileSettings.phoneNumber') || 'Phone'}
                </span>
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  type="tel"
                  placeholder={
                    t('owner.profileSettings.phonePlaceholder') || 'Phone'
                  }
                  className={inputClass}
                  style={{ color: ownerTheme.text }}
                />
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
                style={{ backgroundColor: ownerTheme.accent }}
              >
                {saveProfile.isPending
                  ? t('owner.profileSettings.saving') || 'Saving…'
                  : t('owner.profileSettings.saveChanges') || 'Save'}
              </button>
            </form>
          </section>

          {/* Security */}
          <section>
            <SectionLabel>
              {t('owner.profileSettings.security') || 'Security'}
            </SectionLabel>
            <form onSubmit={onChangePassword} className="space-y-2.5">
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                <label className="block min-w-0">
                  <span
                    className="mb-1.5 block text-[13px] font-medium"
                    style={{ color: ownerTheme.textSecondary }}
                  >
                    {t('owner.profileSettings.newPassword') || 'New password'}
                  </span>
                  <input
                    type="password"
                    autoComplete="new-password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder={
                      t('owner.profileSettings.newPasswordPlaceholder') ||
                      'New password'
                    }
                    className={inputClass}
                    style={{ color: ownerTheme.text }}
                  />
                </label>
                <label className="block min-w-0">
                  <span
                    className="mb-1.5 block text-[13px] font-medium"
                    style={{ color: ownerTheme.textSecondary }}
                  >
                    {t('owner.profileSettings.confirmNewPassword') ||
                      'Confirm password'}
                  </span>
                  <input
                    type="password"
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder={
                      t('owner.profileSettings.confirmPasswordPlaceholder') ||
                      'Confirm password'
                    }
                    className={inputClass}
                    style={{ color: ownerTheme.text }}
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
                style={{ backgroundColor: ownerTheme.accent }}
              >
                {changePassword.isPending
                  ? t('owner.profileSettings.changing') || 'Changing…'
                  : t('owner.profileSettings.changePasswordButton') ||
                    'Change password'}
              </button>
            </form>
          </section>

          {/* Danger */}
          <section>
            <SectionLabel>
              {t('owner.profileSettings.dangerZone') || 'Danger zone'}
            </SectionLabel>
            <p
              className="mb-3 text-sm"
              style={{ color: ownerTheme.textSecondary }}
            >
              {t('owner.profileSettings.deleteAccountDescription') ||
                'Once you delete your account, there is no going back.'}
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
              {t('owner.profileSettings.deleteAccount') || 'Delete account'}
            </button>
          </section>
        </div>
      )}

      {confirmDelete ? (
        <div className="fixed inset-0 z-[90] flex items-end justify-center sm:items-center sm:p-4">
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            aria-label="Close"
            onClick={() => setConfirmDelete(false)}
          />
          <div className="relative z-10 w-full max-w-md rounded-t-[20px] bg-white p-5 shadow-xl sm:rounded-[20px]">
            <h2
              className="text-lg font-semibold"
              style={{ color: ownerTheme.text }}
            >
              {t('owner.profileSettings.confirmDelete') || 'Delete account'}
            </h2>
            <p
              className="mt-2 text-sm"
              style={{ color: ownerTheme.textSecondary }}
            >
              {t('owner.profileSettings.deleteWarning') ||
                'Are you sure? This cannot be undone.'}
            </p>
            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                className="flex-1 rounded-[14px] bg-[#FCF3EC] py-3 text-sm font-semibold"
                style={{ color: ownerTheme.text }}
              >
                {t('owner.profileSettings.cancel') || 'Cancel'}
              </button>
              <button
                type="button"
                disabled={deleteAccount.isPending}
                onClick={() => deleteAccount.mutate()}
                className="flex-1 rounded-[14px] py-3 text-sm font-semibold text-white disabled:opacity-60"
                style={{ backgroundColor: '#EF4444' }}
              >
                {deleteAccount.isPending
                  ? t('owner.profileSettings.deleting') || 'Deleting…'
                  : t('owner.profileSettings.confirmDeleteButton') ||
                    'Delete account'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </SettingsSubpageShell>
  );
}
