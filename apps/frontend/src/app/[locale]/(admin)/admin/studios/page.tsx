'use client';

import { useCallback, useEffect, useState } from 'react';
import { AdminGuard } from '@/components/admin/admin-guard';
import { AdminTable } from '@/components/admin/admin-table';
import { fetchAdminStudios } from '@/lib/admin/api';
import type { AdminStudioRow } from '@/lib/admin/types';

function StudiosContent() {
	const [rows, setRows] = useState<AdminStudioRow[]>([]);
	const [total, setTotal] = useState(0);
	const [page, setPage] = useState(1);
	const [search, setSearch] = useState('');
	const [status, setStatus] = useState('');
	const [error, setError] = useState<string | null>(null);

	const load = useCallback(async () => {
		setError(null);
		try {
			const res = await fetchAdminStudios({
				page,
				limit: 20,
				search: search || undefined,
				status: status || undefined,
			});
			setRows(res.items);
			setTotal(res.total);
		} catch (e) {
			setError(e instanceof Error ? e.message : 'Failed to load studios');
		}
	}, [page, search, status]);

	useEffect(() => {
		void load();
	}, [load]);

	return (
		<div>
			<h1 className="text-2xl font-semibold">Studios</h1>
			<div className="mt-4 flex flex-wrap gap-2">
				<input
					type="search"
					placeholder="Search name, slug, owner email"
					value={search}
					onChange={(e) => {
						setSearch(e.target.value);
						setPage(1);
					}}
					className="rounded-lg border border-zinc-200 px-3 py-2 text-sm"
				/>
				<select
					value={status}
					onChange={(e) => {
						setStatus(e.target.value);
						setPage(1);
					}}
					className="rounded-lg border border-zinc-200 px-3 py-2 text-sm"
				>
					<option value="">All statuses</option>
					<option value="ACTIVE">ACTIVE</option>
					<option value="READY">READY</option>
					<option value="DRAFT">DRAFT</option>
				</select>
			</div>
			{error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}
			<div className="mt-6">
				<AdminTable
					rows={rows}
					columns={[
						{ key: 'name', header: 'Name', render: (r) => r.name },
						{
							key: 'status',
							header: 'Status',
							render: (r) => r.status,
						},
						{
							key: 'owner',
							header: 'Owner',
							render: (r) => r.User.email,
						},
						{
							key: 'sub',
							header: 'Subscription',
							render: (r) =>
								r.Subscription
									? `${r.Subscription.type} / ${r.Subscription.status}`
									: '—',
						},
						{
							key: 'created',
							header: 'Created',
							render: (r) =>
								new Date(r.createdAt).toLocaleDateString(),
						},
					]}
				/>
			</div>
			<p className="mt-4 text-sm text-zinc-500">
				{total} total · page {page}
			</p>
			<div className="mt-2 flex gap-2">
				<button
					type="button"
					disabled={page <= 1}
					onClick={() => setPage((p) => p - 1)}
					className="rounded border px-3 py-1 text-sm disabled:opacity-40"
				>
					Prev
				</button>
				<button
					type="button"
					disabled={page * 20 >= total}
					onClick={() => setPage((p) => p + 1)}
					className="rounded border px-3 py-1 text-sm disabled:opacity-40"
				>
					Next
				</button>
			</div>
		</div>
	);
}

export default function AdminStudiosPage() {
	return (
		<AdminGuard>
			<StudiosContent />
		</AdminGuard>
	);
}
