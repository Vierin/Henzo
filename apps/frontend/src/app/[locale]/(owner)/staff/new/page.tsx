'use client';

import { useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { Loader2, Mail, Phone, Send, User } from 'lucide-react';
import { SettingsSubpageShell } from '@/components/owner/settingsSubpageShell';
import { useOwnerStudio } from '@/contexts/OwnerStudioContext';
import { extractLocaleFromPath, withLocale, type Locale } from '@/i18n/routing';
import {
  createStaff,
  generateTrainerInvite,
  isTrainerPlanLimitError,
} from '@/lib/owner/fetch-staff';
import { ownerTheme } from '@/lib/owner/owner-theme';
import { OwnerSelect } from '@/components/owner/ownerSelect';

type StaffAccessLevel = 'ADMIN' | 'EMPLOYEE';

/**
 * Mobile parity: `AddStaffScreen` —
 * 1) Invite by email (create + POST invite with sendToEmail)
 * 2) Add manually (create only, invite later)
 */
export default function NewStaffPage() {
  const router = useRouter();
  const pathname = usePathname();
  const locale = (extractLocaleFromPath(pathname) ?? 'en') as Locale;
  const { studio } = useOwnerStudio();
  const queryClient = useQueryClient();

  const [accessLevel, setAccessLevel] = useState<StaffAccessLevel>('EMPLOYEE');
  const [inviteEmail, setInviteEmail] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const [inviting, setInviting] = useState(false);
  const [saving, setSaving] = useState(false);
  const busy = inviting || saving;

  const inputClass =
    'w-full rounded-[14px] bg-white py-3.5 pl-11 pr-3.5 text-[15px] outline-none';

  const goBack = () => router.push(withLocale('/staff', locale));

  const refreshStaff = async () => {
    await queryClient.invalidateQueries({ queryKey: ['owner-staff'] });
  };

  const inviteViaEmail = async () => {
    if (!studio?.id) {
      setError('Studio not loaded');
      return;
    }
    const em = inviteEmail.trim();
    if (!em || !em.includes('@')) {
      setError('Enter a valid email for the invite');
      return;
    }
    setError(null);
    setFlash(null);
    setInviting(true);
    try {
      const tempName =
        em.split('@')[0] || (accessLevel === 'ADMIN' ? 'Admin' : 'Trainer');
      const created = await createStaff({
        name: tempName,
        studioId: studio.id,
        email: em,
        accessLevel,
      });
      await generateTrainerInvite(created.id, em);
      await refreshStaff();
      setFlash('Invitation sent by email');
      window.setTimeout(goBack, 700);
    } catch (e) {
      if (isTrainerPlanLimitError(e)) {
        setError(
          'Trainer limit reached for your plan. Upgrade in Subscription to add more staff.',
        );
      } else {
        setError(e instanceof Error ? e.message : 'Invite failed');
      }
    } finally {
      setInviting(false);
    }
  };

  const submitManual = async () => {
    if (!studio?.id) {
      setError('Studio not loaded');
      return;
    }
    const n = name.trim();
    if (!n) {
      setError('Enter a name');
      return;
    }
    setError(null);
    setFlash(null);
    setSaving(true);
    try {
      await createStaff({
        name: n,
        studioId: studio.id,
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
        accessLevel,
      });
      await refreshStaff();
      setFlash(accessLevel === 'ADMIN' ? 'Admin added' : 'Staff member added');
      window.setTimeout(goBack, 700);
    } catch (e) {
      if (isTrainerPlanLimitError(e)) {
        setError(
          'Trainer limit reached for your plan. Upgrade in Subscription to add more staff.',
        );
      } else {
        setError(e instanceof Error ? e.message : 'Create failed');
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <SettingsSubpageShell title="Add staff">
      <div className="space-y-2">
        <p
          className="text-[13px] font-medium uppercase tracking-wide"
          style={{ color: ownerTheme.textSecondary }}
        >
          Role
        </p>
        <OwnerSelect
          value={accessLevel}
          onChange={(v) => setAccessLevel(v as StaffAccessLevel)}
          aria-label="Access level"
          options={[
            { value: 'EMPLOYEE', label: 'Trainer' },
            { value: 'ADMIN', label: 'Admin (manager)' },
          ]}
        />
        <p className="text-sm" style={{ color: ownerTheme.textSecondary }}>
          Admins can manage the studio. Trainers teach classes.
        </p>
      </div>

      <div className="space-y-1">
        <p
          className="text-[13px] font-medium uppercase tracking-wide"
          style={{ color: ownerTheme.textSecondary }}
        >
          Invite to team
        </p>
        <p className="text-sm" style={{ color: ownerTheme.textSecondary }}>
          We’ll create a profile and email them a link to join.
        </p>
        <div className="relative mt-3">
          <Mail
            className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2"
            style={{ color: ownerTheme.textSecondary }}
          />
          <input
            type="email"
            value={inviteEmail}
            disabled={busy}
            onChange={(e) => setInviteEmail(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                void inviteViaEmail();
              }
            }}
            placeholder="Email"
            className={inputClass}
            style={{ color: ownerTheme.text }}
            autoComplete="email"
          />
        </div>
        <button
          type="button"
          disabled={busy || !studio?.id}
          onClick={() => void inviteViaEmail()}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-[14px] py-3.5 text-[15px] font-semibold text-white disabled:opacity-50"
          style={{ backgroundColor: ownerTheme.accent }}
        >
          {inviting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
          {inviting ? 'Sending…' : 'Send invitation'}
        </button>
      </div>

      <div className="flex items-center gap-3 py-2">
        <span
          className="h-px flex-1"
          style={{ backgroundColor: ownerTheme.borderSoft }}
        />
        <span
          className="text-xs font-medium uppercase tracking-wide"
          style={{ color: ownerTheme.textSecondary }}
        >
          or
        </span>
        <span
          className="h-px flex-1"
          style={{ backgroundColor: ownerTheme.borderSoft }}
        />
      </div>

      <div className="space-y-1">
        <p
          className="text-[13px] font-medium uppercase tracking-wide"
          style={{ color: ownerTheme.textSecondary }}
        >
          Add without registration
        </p>
        <p className="text-sm" style={{ color: ownerTheme.textSecondary }}>
          Create a profile now — you can send an invite later.
        </p>
        <div className="mt-3 space-y-2.5">
          <div className="relative">
            <User
              className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2"
              style={{ color: ownerTheme.textSecondary }}
            />
            <input
              value={name}
              disabled={busy}
              onChange={(e) => setName(e.target.value)}
              placeholder="Full name"
              className={inputClass}
              style={{ color: ownerTheme.text }}
              autoComplete="name"
            />
          </div>
          <div className="relative">
            <Mail
              className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2"
              style={{ color: ownerTheme.textSecondary }}
            />
            <input
              type="email"
              value={email}
              disabled={busy}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              className={inputClass}
              style={{ color: ownerTheme.text }}
              autoComplete="email"
            />
          </div>
          <div className="relative">
            <Phone
              className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2"
              style={{ color: ownerTheme.textSecondary }}
            />
            <input
              type="tel"
              value={phone}
              disabled={busy}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Phone"
              className={inputClass}
              style={{ color: ownerTheme.text }}
              autoComplete="tel"
            />
          </div>
        </div>

        {error ? (
          <p className="mt-3 text-sm font-medium text-red-600" role="alert">
            {error}
          </p>
        ) : null}
        {flash ? (
          <p className="mt-3 text-sm font-medium text-green-700" role="status">
            {flash}
          </p>
        ) : null}

        <button
          type="button"
          disabled={busy || !studio?.id}
          onClick={() => void submitManual()}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-[14px] py-3.5 text-[15px] font-semibold text-white disabled:opacity-50"
          style={{ backgroundColor: ownerTheme.accent }}
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>
    </SettingsSubpageShell>
  );
}
