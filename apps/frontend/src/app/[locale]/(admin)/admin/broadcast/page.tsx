'use client';

import { FormEvent, useEffect, useState } from 'react';
import { AdminGuard } from '@/components/admin/admin-guard';
import { fetchAdminStudios, sendAdminBroadcast } from '@/lib/admin/api';
import type {
  AdminBroadcastPayload,
  AdminBroadcastResult,
  AdminStudioRow,
} from '@/lib/admin/types';

type Audience = AdminBroadcastPayload['audience'];
type Channel = AdminBroadcastPayload['channels'];

function BroadcastContent() {
  const [channels, setChannels] = useState<Channel>('push');
  const [audience, setAudience] = useState<Audience>('all_owners');
  const [activityTier, setActivityTier] = useState('sleeping');
  const [studioSearch, setStudioSearch] = useState('');
  const [studioOptions, setStudioOptions] = useState<AdminStudioRow[]>([]);
  const [selectedStudios, setSelectedStudios] = useState<
    { id: string; name: string }[]
  >([]);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [preview, setPreview] = useState<AdminBroadcastResult | null>(null);
  const [result, setResult] = useState<AdminBroadcastResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    if (audience !== 'studio_ids') return;
    const timer = setTimeout(() => {
      fetchAdminStudios({
        page: 1,
        limit: 10,
        search: studioSearch || undefined,
      })
        .then((res) => setStudioOptions(res.items))
        .catch(() => setStudioOptions([]));
    }, 300);
    return () => clearTimeout(timer);
  }, [audience, studioSearch]);

  const buildPayload = (dryRun: boolean): AdminBroadcastPayload => ({
    channels,
    title: title.trim(),
    body: body.trim(),
    audience,
    ...(audience === 'activity_tier'
      ? { activityTier: activityTier as AdminBroadcastPayload['activityTier'] }
      : {}),
    ...(audience === 'studio_ids'
      ? { studioIds: selectedStudios.map((s) => s.id) }
      : {}),
    dryRun,
  });

  const canSubmit =
    title.trim().length > 0 &&
    body.trim().length > 0 &&
    (audience !== 'studio_ids' || selectedStudios.length > 0);

  const doPreview = async () => {
    setError(null);
    setResult(null);
    setBusy(true);
    try {
      const res = await sendAdminBroadcast(buildPayload(true));
      setPreview(res);
      setConfirming(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Preview failed');
    } finally {
      setBusy(false);
    }
  };

  const doSend = async () => {
    setError(null);
    setBusy(true);
    try {
      const res = await sendAdminBroadcast(buildPayload(false));
      setResult(res);
      setConfirming(false);
      setPreview(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Broadcast failed');
    } finally {
      setBusy(false);
    }
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    void doPreview();
  };

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-semibold text-foreground">Broadcast</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Send push or email to studio owners. Every broadcast is logged.
      </p>

      <form onSubmit={onSubmit} className="mt-6 space-y-5">
        <fieldset>
          <legend className="text-sm font-medium text-foreground">
            Channel
          </legend>
          <div className="mt-2 flex gap-2">
            {(
              [
                { id: 'push', label: 'Push' },
                { id: 'email', label: 'Email' },
                { id: 'both', label: 'Push + Email' },
              ] as { id: Channel; label: string }[]
            ).map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setChannels(c.id)}
                className={`rounded-lg border px-3 py-1.5 text-sm ${
                  channels === c.id
                    ? 'border-primary bg-primary text-white'
                    : 'border-border bg-white text-muted-foreground hover:bg-secondary'
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend className="text-sm font-medium text-foreground">
            Audience
          </legend>
          <select
            value={audience}
            onChange={(e) => setAudience(e.target.value as Audience)}
            className="mt-2 w-full rounded-lg border border-border px-3 py-2 text-sm"
          >
            <option value="all_owners">All studio owners</option>
            <option value="activity_tier">By activity tier</option>
            <option value="onboarding_incomplete">Onboarding incomplete</option>
            <option value="studio_ids">Specific studios</option>
          </select>

          {audience === 'activity_tier' ? (
            <select
              value={activityTier}
              onChange={(e) => setActivityTier(e.target.value)}
              className="mt-2 w-full rounded-lg border border-border px-3 py-2 text-sm"
            >
              <option value="active">Active (7d)</option>
              <option value="warming">Warming (8–30d)</option>
              <option value="sleeping">Sleeping (30d+)</option>
              <option value="never_used">Never used</option>
              <option value="draft">Draft / Ready</option>
            </select>
          ) : null}

          {audience === 'studio_ids' ? (
            <div className="mt-2">
              <input
                type="search"
                placeholder="Search studios to add"
                value={studioSearch}
                onChange={(e) => setStudioSearch(e.target.value)}
                className="w-full rounded-lg border border-border px-3 py-2 text-sm"
              />
              {studioOptions.length > 0 ? (
                <ul className="mt-2 max-h-44 overflow-auto rounded-lg border border-border bg-white">
                  {studioOptions
                    .filter((o) => !selectedStudios.some((s) => s.id === o.id))
                    .map((o) => (
                      <li key={o.id}>
                        <button
                          type="button"
                          onClick={() =>
                            setSelectedStudios((prev) => [
                              ...prev,
                              { id: o.id, name: o.name },
                            ])
                          }
                          className="w-full px-3 py-2 text-left text-sm hover:bg-secondary"
                        >
                          {o.name}
                          <span className="ml-2 text-xs text-muted-foreground">
                            {o.User.email}
                          </span>
                        </button>
                      </li>
                    ))}
                </ul>
              ) : null}
              {selectedStudios.length > 0 ? (
                <div className="mt-2 flex flex-wrap gap-2">
                  {selectedStudios.map((s) => (
                    <span
                      key={s.id}
                      className="inline-flex items-center gap-1 rounded-full bg-secondary px-3 py-1 text-sm"
                    >
                      {s.name}
                      <button
                        type="button"
                        aria-label={`Remove ${s.name}`}
                        onClick={() =>
                          setSelectedStudios((prev) =>
                            prev.filter((x) => x.id !== s.id),
                          )
                        }
                        className="text-muted-foreground hover:text-foreground"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}
        </fieldset>

        <label className="block text-sm font-medium text-foreground">
          Title
          <input
            type="text"
            value={title}
            maxLength={120}
            onChange={(e) => setTitle(e.target.value)}
            className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm"
          />
        </label>

        <label className="block text-sm font-medium text-foreground">
          Message
          <textarea
            value={body}
            rows={5}
            maxLength={4000}
            onChange={(e) => setBody(e.target.value)}
            className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm"
          />
        </label>

        {error ? <p className="text-sm text-red-600">{error}</p> : null}

        {confirming && preview ? (
          <div className="rounded-xl border border-amber-300 bg-amber-50 p-4">
            <p className="text-sm font-medium text-amber-900">
              This will reach {preview.ownerCount} owner
              {preview.ownerCount === 1 ? '' : 's'} across {preview.studioCount}{' '}
              studio
              {preview.studioCount === 1 ? '' : 's'} via {channels}.
            </p>
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={() => void doSend()}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                {busy ? 'Sending…' : 'Confirm and send'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setConfirming(false);
                  setPreview(null);
                }}
                className="rounded-lg border border-border px-4 py-2 text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            type="submit"
            disabled={!canSubmit || busy}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {busy ? 'Checking audience…' : 'Preview recipients'}
          </button>
        )}

        {result ? (
          <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-4 text-sm text-emerald-900">
            <p className="font-medium">Broadcast sent.</p>
            <p className="mt-1">
              {result.ownerCount} owners · {result.studioCount} studios
              {result.pushTokens != null
                ? ` · ${result.pushTokens} push tokens`
                : ''}
              {result.emailsSent != null
                ? ` · ${result.emailsSent} emails sent`
                : ''}
              {result.emailsFailed
                ? ` · ${result.emailsFailed} emails failed`
                : ''}
            </p>
          </div>
        ) : null}
      </form>
    </div>
  );
}

export default function AdminBroadcastPage() {
  return (
    <AdminGuard>
      <BroadcastContent />
    </AdminGuard>
  );
}
