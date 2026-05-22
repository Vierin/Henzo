'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AdminGuard } from '@/components/admin/admin-guard';
import { fetchAdminSettings } from '@/lib/admin/api';
import type { AdminSettings } from '@/lib/admin/types';

function SettingsContent() {
	const [data, setData] = useState<AdminSettings | null>(null);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		fetchAdminSettings()
			.then(setData)
			.catch((e) =>
				setError(e instanceof Error ? e.message : 'Failed to load settings')
			);
	}, []);

	if (error) return <p className="text-sm text-red-600">{error}</p>;
	if (!data) return <p className="text-sm text-zinc-500">Loading…</p>;

	const flags = [
		{ label: 'GA4 backend tracking', on: data.ga4Enabled },
		{ label: 'Sentry', on: data.sentryEnabled },
		{ label: 'Firebase push', on: data.firebasePushEnabled },
		{ label: 'Telegram feedback', on: data.telegramFeedbackEnabled },
		{
			label: 'Admin email allowlist',
			on: data.adminAllowedEmailsConfigured,
		},
	];

	return (
		<div>
			<h1 className="text-2xl font-semibold">Settings</h1>
			<p className="mt-1 text-sm text-zinc-500">
				Environment: {data.nodeEnv} (read-only)
			</p>
			<ul className="mt-6 space-y-2 rounded-xl border border-zinc-200 bg-white p-6">
				{flags.map((f) => (
					<li
						key={f.label}
						className="flex items-center justify-between text-sm"
					>
						<span>{f.label}</span>
						<span
							className={
								f.on ? 'text-emerald-600' : 'text-zinc-400'
							}
						>
							{f.on ? 'enabled' : 'disabled'}
						</span>
					</li>
				))}
			</ul>
			<div className="mt-6 flex flex-wrap gap-3">
				{data.links.crashlytics ? (
					<Link
						href={data.links.crashlytics}
						target="_blank"
						rel="noopener noreferrer"
						className="rounded-lg border px-4 py-2 text-sm hover:bg-white"
					>
						Crashlytics console
					</Link>
				) : null}
				{data.links.sentry ? (
					<Link
						href={data.links.sentry}
						target="_blank"
						rel="noopener noreferrer"
						className="rounded-lg border px-4 py-2 text-sm hover:bg-white"
					>
						Sentry console
					</Link>
				) : null}
			</div>
		</div>
	);
}

export default function AdminSettingsPage() {
	return (
		<AdminGuard>
			<SettingsContent />
		</AdminGuard>
	);
}
