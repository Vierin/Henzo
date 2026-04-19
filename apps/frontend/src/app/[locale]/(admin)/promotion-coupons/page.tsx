'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import LoadingSpinner from '@/components/LoadingSpinner';
import toast from 'react-hot-toast';

interface PromotionCouponRow {
	id: string;
	label: string;
	stripeCouponId: string;
	isActive: boolean;
	useForAutoAnnual: boolean;
	percentOff: number | null;
	timesRedeemed: number | null;
	valid: boolean;
	stripeError?: string;
}

export default function AdminPromotionCouponsPage() {
	const qc = useQueryClient();
	const [label, setLabel] = useState('');
	const [stripeCouponId, setStripeCouponId] = useState('');
	const [useForAutoAnnual, setUseForAutoAnnual] = useState(false);

	const { data, isLoading, error } = useQuery({
		queryKey: ['admin-promotion-coupons'],
		queryFn: () =>
			apiClient.get<PromotionCouponRow[]>('/admin/promotion-coupons'),
	});

	const createMutation = useMutation({
		mutationFn: () =>
			apiClient.post('/admin/promotion-coupons', {
				label,
				stripeCouponId,
				useForAutoAnnual,
			}),
		onSuccess: async () => {
			toast.success('Coupon saved');
			setLabel('');
			setStripeCouponId('');
			setUseForAutoAnnual(false);
			await qc.invalidateQueries({ queryKey: ['admin-promotion-coupons'] });
		},
		onError: (e: unknown) =>
			toast.error(e instanceof Error ? e.message : 'Failed to create'),
	});

	const patchMutation = useMutation({
		mutationFn: ({
			id,
			patch,
		}: {
			id: string;
			patch: Partial<
				Pick<
					PromotionCouponRow,
					'isActive' | 'useForAutoAnnual' | 'label'
				>
			>;
		}) => apiClient.patch(`/admin/promotion-coupons/${id}`, patch),
		onSuccess: async () => {
			await qc.invalidateQueries({ queryKey: ['admin-promotion-coupons'] });
			toast.success('Updated');
		},
		onError: (e: unknown) =>
			toast.error(e instanceof Error ? e.message : 'Failed to update'),
	});

	const deleteMutation = useMutation({
		mutationFn: (id: string) =>
			apiClient.delete(`/admin/promotion-coupons/${id}`),
		onSuccess: async () => {
			await qc.invalidateQueries({ queryKey: ['admin-promotion-coupons'] });
			toast.success('Removed');
		},
		onError: (e: unknown) =>
			toast.error(e instanceof Error ? e.message : 'Failed to delete'),
	});

	const refreshMutation = useMutation({
		mutationFn: (id: string) =>
			apiClient.post(`/admin/promotion-coupons/${id}/refresh`, {}),
		onSuccess: async () => {
			await qc.invalidateQueries({ queryKey: ['admin-promotion-coupons'] });
			toast.success('Synced from Stripe');
		},
		onError: (e: unknown) =>
			toast.error(e instanceof Error ? e.message : 'Failed to sync'),
	});

	if (isLoading) {
		return <LoadingSpinner size="lg" message="Loading coupons…" />;
	}

	if (error) {
		return (
			<div className="text-center py-12 text-red-600">
				{error instanceof Error ? error.message : 'Failed to load'}
			</div>
		);
	}

	const rows = data ?? [];

	return (
		<div className="space-y-8 max-w-6xl">
			<div>
				<h1 className="text-3xl font-bold text-gray-900">Stripe coupons</h1>
				<p className="text-gray-600 mt-1">
					Add Stripe Coupon IDs created in the Stripe Dashboard. Mark one as{' '}
					<strong>auto annual</strong> to apply it to owner yearly checkout.
					Times redeemed comes from Stripe.
				</p>
			</div>

			<div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
				<h2 className="text-lg font-semibold text-gray-900 mb-4">
					Add coupon
				</h2>
				<div className="grid gap-4 md:grid-cols-2">
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-1">
							Label
						</label>
						<input
							className="w-full border border-gray-300 rounded-lg px-3 py-2"
							value={label}
							onChange={(e) => setLabel(e.target.value)}
							placeholder="Launch -10% annual"
						/>
					</div>
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-1">
							Stripe coupon ID
						</label>
						<input
							className="w-full border border-gray-300 rounded-lg px-3 py-2 font-mono text-sm"
							value={stripeCouponId}
							onChange={(e) => setStripeCouponId(e.target.value)}
							placeholder="zAb1CD2e or full cpn_…"
						/>
					</div>
				</div>
				<label className="flex items-center gap-2 mt-4 cursor-pointer">
					<input
						type="checkbox"
						checked={useForAutoAnnual}
						onChange={(e) => setUseForAutoAnnual(e.target.checked)}
					/>
					<span className="text-sm text-gray-800">
						Use for automatic annual subscription checkout
					</span>
				</label>
				<button
					type="button"
					disabled={
						createMutation.isPending || !label.trim() || !stripeCouponId.trim()
					}
					onClick={() => createMutation.mutate()}
					className="mt-4 px-5 py-2.5 rounded-lg bg-[#ea4b4b] text-white font-semibold disabled:opacity-50"
				>
					{createMutation.isPending ? 'Saving…' : 'Add coupon'}
				</button>
			</div>

			<div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
				<div className="overflow-x-auto">
					<table className="w-full text-sm">
						<thead className="bg-gray-50 border-b border-gray-200">
							<tr>
								<th className="text-left p-3 font-semibold text-gray-700">
									Label
								</th>
								<th className="text-left p-3 font-semibold text-gray-700">
									Stripe ID
								</th>
								<th className="text-right p-3 font-semibold text-gray-700">
									%
								</th>
								<th className="text-right p-3 font-semibold text-gray-700">
									Used
								</th>
								<th className="text-center p-3 font-semibold text-gray-700">
									Active
								</th>
								<th className="text-center p-3 font-semibold text-gray-700">
									Auto annual
								</th>
								<th className="text-right p-3 font-semibold text-gray-700">
									Actions
								</th>
							</tr>
						</thead>
						<tbody>
							{rows.length === 0 ? (
								<tr>
									<td colSpan={7} className="p-8 text-center text-gray-500">
										No coupons yet.
									</td>
								</tr>
							) : (
								rows.map((row) => (
									<tr key={row.id} className="border-b border-gray-100">
										<td className="p-3 text-gray-900">{row.label}</td>
										<td className="p-3 font-mono text-xs text-gray-600 break-all">
											{row.stripeCouponId}
											{!row.valid && row.stripeError && (
												<span
													className="block text-amber-700 mt-1"
													title={row.stripeError}
												>
													Stripe error
												</span>
											)}
										</td>
										<td className="p-3 text-right tabular-nums">
											{row.percentOff != null ? `${row.percentOff}%` : '—'}
										</td>
										<td className="p-3 text-right tabular-nums">
											{row.timesRedeemed != null ? row.timesRedeemed : '—'}
										</td>
										<td className="p-3 text-center">
											<input
												type="checkbox"
												checked={row.isActive}
												onChange={(e) =>
													patchMutation.mutate({
														id: row.id,
														patch: { isActive: e.target.checked },
													})
												}
												disabled={patchMutation.isPending}
											/>
										</td>
										<td className="p-3 text-center">
											<input
												type="checkbox"
												checked={row.useForAutoAnnual}
												onChange={(e) =>
													patchMutation.mutate({
														id: row.id,
														patch: { useForAutoAnnual: e.target.checked },
													})
												}
												disabled={patchMutation.isPending}
											/>
										</td>
										<td className="p-3 text-right space-x-2 whitespace-nowrap">
											<button
												type="button"
												className="text-[#ea4b4b] hover:underline text-xs"
												onClick={() => refreshMutation.mutate(row.id)}
												disabled={refreshMutation.isPending}
											>
												Sync %
											</button>
											<button
												type="button"
												className="text-gray-500 hover:text-red-600 text-xs"
												onClick={() => {
													if (
														confirm(
															'Delete this record? Stripe coupon itself is not deleted.'
														)
													)
														deleteMutation.mutate(row.id);
												}}
												disabled={deleteMutation.isPending}
											>
												Delete
											</button>
										</td>
									</tr>
								))
							)}
						</tbody>
					</table>
				</div>
			</div>
		</div>
	);
}
