'use client';

import { useCallback, useEffect, useState } from 'react';
import { AdminGuard } from '@/components/admin/admin-guard';
import { AdminTable } from '@/components/admin/admin-table';
import { fetchAdminFeedback } from '@/lib/admin/api';

function FeedbackContent() {
	const [rows, setRows] = useState<Record<string, unknown>[]>([]);
	const [total, setTotal] = useState(0);
	const [page, setPage] = useState(1);
	const [error, setError] = useState<string | null>(null);

	const load = useCallback(async () => {
		setError(null);
		try {
			const res = await fetchAdminFeedback({ page, limit: 20 });
			setRows(res.items);
			setTotal(res.total);
		} catch (e) {
			setError(e instanceof Error ? e.message : 'Failed to load feedback');
		}
	}, [page]);

	useEffect(() => {
		void load();
	}, [load]);

	return (
		<div>
			<h1 className="text-2xl font-semibold">Feedback</h1>
			{error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}
			<div className="mt-6">
				<AdminTable
					rows={rows}
					columns={[
						{
							key: 'name',
							header: 'Name',
							render: (r) => String(r.name ?? ''),
						},
						{
							key: 'email',
							header: 'Email',
							render: (r) => String(r.email ?? ''),
						},
						{
							key: 'platform',
							header: 'Platform',
							render: (r) => String(r.platform ?? '—'),
						},
						{
							key: 'message',
							header: 'Message',
							render: (r) => (
								<span className="line-clamp-2 max-w-md">
									{String(r.message ?? '')}
								</span>
							),
						},
						{
							key: 'at',
							header: 'When',
							render: (r) =>
								new Date(String(r.createdAt)).toLocaleString(),
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

export default function AdminFeedbackPage() {
	return (
		<AdminGuard>
			<FeedbackContent />
		</AdminGuard>
	);
}
