'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import { ownerTheme } from '@/lib/owner/owner-theme';
import { createStaff, generateTrainerInvite } from '@/lib/owner/fetch-staff';

export function AddStaffModal({
  studioId,
  onClose,
  onDone,
}: {
  studioId: string;
  onClose: () => void;
  onDone: () => Promise<void> | void;
}) {
  const [inviteEmail, setInviteEmail] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [inviting, setInviting] = useState(false);
  const [saving, setSaving] = useState(false);
  const busy = inviting || saving;

  const inputClass =
    'w-full rounded-[12px] bg-[#FCF3EC] px-3.5 py-3 text-sm outline-none';

  const inviteViaEmail = async () => {
    const em = inviteEmail.trim();
    if (!em || !em.includes('@')) {
      setError('Enter a valid email for the invite');
      return;
    }
    setError(null);
    setInviting(true);
    try {
      const tempName = em.split('@')[0] || 'Trainer';
      const created = await createStaff({
        name: tempName,
        studioId,
        email: em,
        accessLevel: 'EMPLOYEE',
      });
      await generateTrainerInvite(created.id, em);
      await onDone();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Invite failed');
    } finally {
      setInviting(false);
    }
  };

  const submitManual = async () => {
    const n = name.trim();
    if (!n) {
      setError('Enter a name');
      return;
    }
    setError(null);
    setSaving(true);
    try {
      await createStaff({
        name: n,
        studioId,
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
        accessLevel: 'EMPLOYEE',
      });
      await onDone();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Create failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center sm:items-center sm:p-4">
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0 bg-black/40"
        onClick={busy ? undefined : onClose}
        disabled={busy}
      />
      <div
        className="relative z-10 max-h-[90vh] w-full max-w-md overflow-y-auto rounded-t-[20px] bg-white p-5 shadow-xl sm:rounded-[20px]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-staff-title"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2
            id="add-staff-title"
            className="text-lg font-bold"
            style={{ color: ownerTheme.text }}
          >
            Add staff
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            aria-label="Close"
          >
            <X
              className="h-5 w-5"
              style={{ color: ownerTheme.textSecondary }}
            />
          </button>
        </div>

        <div className="space-y-5">
          <section>
            <h3
              className="text-[13px] font-bold uppercase tracking-[0.06em]"
              style={{ color: ownerTheme.text }}
            >
              Invite by email
            </h3>
            <p
              className="mt-1 text-sm leading-snug"
              style={{ color: ownerTheme.textSecondary }}
            >
              We’ll create a trainer profile and email them a link to join.
            </p>
            <input
              type="email"
              value={inviteEmail}
              disabled={busy}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="Email"
              className={`mt-3 ${inputClass}`}
              style={{ color: ownerTheme.text }}
            />
            <button
              type="button"
              disabled={busy}
              onClick={() => void inviteViaEmail()}
              className="mt-3 w-full rounded-[12px] py-3 text-sm font-semibold text-white disabled:opacity-50"
              style={{ backgroundColor: ownerTheme.accent }}
            >
              {inviting ? 'Sending…' : 'Send invite'}
            </button>
          </section>

          <div className="flex items-center gap-3">
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

          <section>
            <h3
              className="text-[13px] font-bold uppercase tracking-[0.06em]"
              style={{ color: ownerTheme.text }}
            >
              Add manually
            </h3>
            <p
              className="mt-1 text-sm leading-snug"
              style={{ color: ownerTheme.textSecondary }}
            >
              Create a profile now — you can send an invite later.
            </p>
            <div className="mt-3 space-y-2.5">
              <input
                value={name}
                disabled={busy}
                onChange={(e) => setName(e.target.value)}
                placeholder="Full name *"
                className={inputClass}
                style={{ color: ownerTheme.text }}
              />
              <input
                type="email"
                value={email}
                disabled={busy}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email"
                className={inputClass}
                style={{ color: ownerTheme.text }}
              />
              <input
                value={phone}
                disabled={busy}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Phone"
                className={inputClass}
                style={{ color: ownerTheme.text }}
              />
            </div>
            {error ? (
              <p className="mt-2 text-sm text-red-600">{error}</p>
            ) : null}
            <button
              type="button"
              disabled={busy}
              onClick={() => void submitManual()}
              className="mt-3 w-full rounded-[12px] py-3 text-sm font-semibold text-white disabled:opacity-50"
              style={{ backgroundColor: ownerTheme.accent }}
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
          </section>
        </div>
      </div>
    </div>
  );
}

/** Resend / generate invite link for an existing trainer. */
export function InviteStaffModal({
  member,
  onClose,
  onDone,
}: {
  member: { id: string; name: string; email?: string | null };
  onClose: () => void;
  onDone?: () => Promise<void> | void;
}) {
  const [email, setEmail] = useState(member.email?.trim() || '');
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const run = async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await generateTrainerInvite(
        member.id,
        email.trim() || undefined,
      );
      setInviteUrl(res.inviteUrl || null);
      await onDone?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Invite failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center sm:items-center sm:p-4">
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
      />
      <div
        className="relative z-10 w-full max-w-md rounded-t-[20px] bg-white p-5 shadow-xl sm:rounded-[20px]"
        role="dialog"
        aria-modal="true"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold" style={{ color: ownerTheme.text }}>
            Invite {member.name}
          </h2>
          <button type="button" onClick={onClose} aria-label="Close">
            <X
              className="h-5 w-5"
              style={{ color: ownerTheme.textSecondary }}
            />
          </button>
        </div>
        <p className="text-sm" style={{ color: ownerTheme.textSecondary }}>
          Send or copy an invite link so they can join your studio.
        </p>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email (optional)"
          className="mt-3 w-full rounded-[12px] bg-[#FCF3EC] px-3.5 py-3 text-sm outline-none"
          style={{ color: ownerTheme.text }}
        />
        {inviteUrl ? (
          <div className="mt-3 space-y-2">
            <p
              className="break-all rounded-[12px] bg-[#FCF3EC] px-3 py-2.5 text-xs"
              style={{ color: ownerTheme.text }}
            >
              {inviteUrl}
            </p>
            <button
              type="button"
              onClick={async () => {
                await navigator.clipboard.writeText(inviteUrl);
                setCopied(true);
                window.setTimeout(() => setCopied(false), 1500);
              }}
              className="w-full rounded-[12px] bg-[#FCF3EC] py-3 text-sm font-semibold"
              style={{ color: ownerTheme.text }}
            >
              {copied ? 'Copied' : 'Copy link'}
            </button>
          </div>
        ) : null}
        {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
        <button
          type="button"
          disabled={loading}
          onClick={() => void run()}
          className="mt-4 w-full rounded-[12px] py-3 text-sm font-semibold text-white disabled:opacity-50"
          style={{ backgroundColor: ownerTheme.accent }}
        >
          {loading
            ? 'Working…'
            : inviteUrl
              ? 'Regenerate link'
              : email.trim()
                ? 'Send invite'
                : 'Generate link'}
        </button>
      </div>
    </div>
  );
}
