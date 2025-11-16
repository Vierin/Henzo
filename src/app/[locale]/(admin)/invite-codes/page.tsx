'use client';

import { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api-client';
import toast from 'react-hot-toast';
import { Ticket, Copy, Trash2, Ban, Plus, ExternalLink } from 'lucide-react';

interface InviteCode {
	id: string;
	code: string;
	maxUses: number;
	usedCount: number;
	source?: string;
	note?: string;
	status: 'ACTIVE' | 'EXPIRED' | 'REVOKED' | 'EXHAUSTED';
	expiresAt?: string;
	createdAt: string;
	registrationLink: string;
	usedBy: Array<{
		id: string;
		name: string;
		email: string;
		createdAt: string;
	}>;
}

interface Stats {
	total: number;
	active: number;
	used: number;
	totalUses: number;
}

export default function InviteCodesPage() {
	const [codes, setCodes] = useState<InviteCode[]>([]);
	const [stats, setStats] = useState<Stats | null>(null);
	const [loading, setLoading] = useState(true);
	const [showGenerateModal, setShowGenerateModal] = useState(false);

	const loadData = async () => {
		try {
			const [codesData, statsData] = await Promise.all([
				apiClient.get<InviteCode[]>('/invite-codes'),
				apiClient.get<Stats>('/invite-codes/stats'),
			]);
			setCodes(codesData);
			setStats(statsData);
		} catch (error) {
			toast.error('Failed to load invite codes');
			console.error(error);
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		loadData();
	}, []);

	const copyLink = (link: string) => {
		navigator.clipboard.writeText(link);
		toast.success('Registration link copied!');
	};

	const revokeCode = async (id: string) => {
		if (!confirm('Are you sure you want to revoke this code?')) return;

		try {
			await apiClient.put(`/invite-codes/${id}/revoke`, {});
			toast.success('Code revoked successfully');
			loadData();
		} catch (error) {
			toast.error('Failed to revoke code');
		}
	};

	const deleteCode = async (id: string) => {
		if (
			!confirm(
				'Are you sure you want to delete this code? This action cannot be undone.'
			)
		)
			return;

		try {
			await apiClient.delete(`/invite-codes/${id}`);
			toast.success('Code deleted successfully');
			loadData();
		} catch (error: any) {
			toast.error(error.message || 'Failed to delete code');
		}
	};

	const getStatusBadge = (status: string) => {
		const styles: Record<string, string> = {
			ACTIVE: 'bg-green-100 text-green-800',
			EXPIRED: 'bg-gray-100 text-gray-800',
			REVOKED: 'bg-red-100 text-red-800',
			EXHAUSTED: 'bg-blue-100 text-blue-800',
		};
		return (
			<span
				className={`px-2 py-1 text-xs font-medium rounded-full ${styles[status] || 'bg-gray-100 text-gray-800'}`}
			>
				{status}
			</span>
		);
	};

	if (loading) {
		return (
			<div className="flex items-center justify-center h-64">
				<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#ff5b5b]"></div>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-2xl font-bold text-gray-900">Invite Codes</h1>
					<p className="text-gray-600 mt-1">
						Manage salon registration invitations
					</p>
				</div>
				<button
					onClick={() => setShowGenerateModal(true)}
					className="inline-flex items-center px-4 py-2 bg-[#ff5b5b] text-white rounded-lg hover:bg-[#ff4545] transition-colors"
				>
					<Plus className="w-5 h-5 mr-2" />
					Generate Code
				</button>
			</div>

			{/* Stats Cards */}
			{stats && (
				<div className="grid grid-cols-1 md:grid-cols-4 gap-4">
					<div className="bg-white rounded-lg shadow p-6">
						<div className="text-sm text-gray-600">Total Codes</div>
						<div className="text-2xl font-bold text-gray-900 mt-2">
							{stats.total}
						</div>
					</div>
					<div className="bg-white rounded-lg shadow p-6">
						<div className="text-sm text-gray-600">Active Codes</div>
						<div className="text-2xl font-bold text-green-600 mt-2">
							{stats.active}
						</div>
					</div>
					<div className="bg-white rounded-lg shadow p-6">
						<div className="text-sm text-gray-600">Used Codes</div>
						<div className="text-2xl font-bold text-blue-600 mt-2">
							{stats.used}
						</div>
					</div>
					<div className="bg-white rounded-lg shadow p-6">
						<div className="text-sm text-gray-600">Total Registrations</div>
						<div className="text-2xl font-bold text-[#ff5b5b] mt-2">
							{stats.totalUses}
						</div>
					</div>
				</div>
			)}

			{/* Codes Table */}
			<div className="bg-white rounded-lg shadow overflow-hidden">
				<div className="overflow-x-auto">
					<table className="min-w-full divide-y divide-gray-200">
						<thead className="bg-gray-50">
							<tr>
								<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
									Code
								</th>
								<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
									Source
								</th>
								<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
									Usage
								</th>
								<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
									Status
								</th>
								<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
									Created
								</th>
								<th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
									Actions
								</th>
							</tr>
						</thead>
						<tbody className="bg-white divide-y divide-gray-200">
							{codes.map((code) => (
								<tr key={code.id} className="hover:bg-gray-50">
									<td className="px-6 py-4 whitespace-nowrap">
										<div className="flex items-center space-x-2">
											<Ticket className="w-4 h-4 text-gray-400" />
											<span className="text-sm font-mono font-medium text-gray-900">
												{code.code}
											</span>
											<button
												onClick={() => copyLink(code.registrationLink)}
												className="text-gray-400 hover:text-[#ff5b5b] transition-colors"
												title="Copy registration link"
											>
												<Copy className="w-4 h-4" />
											</button>
										</div>
										{code.note && (
											<div className="text-xs text-gray-500 mt-1">
												{code.note}
											</div>
										)}
									</td>
									<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
										{code.source || '-'}
									</td>
									<td className="px-6 py-4 whitespace-nowrap">
										<div className="text-sm text-gray-900">
											{code.usedCount} / {code.maxUses}
										</div>
										{code.usedBy.length > 0 && (
											<div className="text-xs text-gray-500 mt-1">
												{code.usedBy.map((salon) => salon.name).join(', ')}
											</div>
										)}
									</td>
									<td className="px-6 py-4 whitespace-nowrap">
										{getStatusBadge(code.status)}
									</td>
									<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
										{new Date(code.createdAt).toLocaleDateString()}
									</td>
									<td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
										<div className="flex items-center justify-end space-x-2">
											<a
												href={code.registrationLink}
												target="_blank"
												rel="noopener noreferrer"
												className="text-blue-600 hover:text-blue-900"
												title="Open registration page"
											>
												<ExternalLink className="w-4 h-4" />
											</a>
											{code.status === 'ACTIVE' && (
												<button
													onClick={() => revokeCode(code.id)}
													className="text-orange-600 hover:text-orange-900"
													title="Revoke code"
												>
													<Ban className="w-4 h-4" />
												</button>
											)}
											{code.usedCount === 0 && (
												<button
													onClick={() => deleteCode(code.id)}
													className="text-red-600 hover:text-red-900"
													title="Delete code"
												>
													<Trash2 className="w-4 h-4" />
												</button>
											)}
										</div>
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>

				{codes.length === 0 && (
					<div className="text-center py-12">
						<Ticket className="w-12 h-12 text-gray-400 mx-auto mb-4" />
						<p className="text-gray-500">No invite codes yet</p>
						<button
							onClick={() => setShowGenerateModal(true)}
							className="mt-4 text-[#ff5b5b] hover:text-[#ff4545] font-medium"
						>
							Generate your first code
						</button>
					</div>
				)}
			</div>

			{/* Generate Modal */}
			{showGenerateModal && (
				<GenerateCodeModal
					onClose={() => setShowGenerateModal(false)}
					onGenerated={() => {
						loadData();
						setShowGenerateModal(false);
					}}
				/>
			)}
		</div>
	);
}

function GenerateCodeModal({
	onClose,
	onGenerated,
}: {
	onClose: () => void;
	onGenerated: () => void;
}) {
	const [formData, setFormData] = useState({
		ownerEmail: '',
		source: '',
		note: '',
	});
	const [loading, setLoading] = useState(false);
	const [generatedCode, setGeneratedCode] = useState<InviteCode | null>(null);

	const handleGenerate = async (e: React.FormEvent) => {
		e.preventDefault();

		if (!formData.ownerEmail) {
			toast.error('Owner email is required');
			return;
		}

		setLoading(true);

		try {
			const result = await apiClient.post<InviteCode>(
				'/invite-codes/generate',
				{
					maxUses: 1,
					ownerEmail: formData.ownerEmail,
					source: formData.source || undefined,
					note: formData.note || undefined,
				}
			);
			setGeneratedCode(result);
			toast.success('Invite code generated and email sent to salon owner!');
		} catch (error: any) {
			toast.error(error.message || 'Failed to generate code');
		} finally {
			setLoading(false);
		}
	};

	const copyLink = (link: string) => {
		navigator.clipboard.writeText(link);
		toast.success('Registration link copied!');
	};

	return (
		<div className="fixed inset-0 bg-black/60 bg-opacity-50 flex items-center justify-center z-50 p-4">
			<div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
				<div className="p-6">
					<h2 className="text-2xl font-bold text-gray-900 mb-4">
						Generate Invite Code
					</h2>

					{!generatedCode ? (
						<form onSubmit={handleGenerate} className="space-y-4">
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-2">
									Salon Owner Email <span className="text-red-500">*</span>
								</label>
								<input
									type="email"
									required
									placeholder="owner@example.com"
									value={formData.ownerEmail}
									onChange={(e) =>
										setFormData({ ...formData, ownerEmail: e.target.value })
									}
									className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-[#ff5b5b] text-gray-900 focus:border-[#ff5b5b]"
								/>
								<p className="text-xs text-gray-500 mt-1">
									Registration link will be sent to this email
								</p>
							</div>

							<div>
								<label className="block text-sm font-medium text-gray-700 mb-2">
									Source (Optional)
								</label>
								<input
									type="text"
									placeholder="e.g., Facebook, Instagram, Email Campaign"
									value={formData.source}
									onChange={(e) =>
										setFormData({ ...formData, source: e.target.value })
									}
									className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-[#ff5b5b] text-gray-500 focus:border-[#ff5b5b]"
								/>
							</div>

							<div>
								<label className="block text-sm font-medium text-gray-700 mb-2">
									Note (Optional)
								</label>
								<input
									type="text"
									placeholder="e.g., Partner salon, Beta tester"
									value={formData.note}
									onChange={(e) =>
										setFormData({ ...formData, note: e.target.value })
									}
									className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-[#ff5b5b] text-gray-500 focus:border-[#ff5b5b]"
								/>
							</div>

							<div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
								<p className="text-sm text-blue-800">
									<strong>Note:</strong> Each code is single-use and has no
									expiration date. An email with the registration link will be
									sent to the salon owner.
								</p>
							</div>

							<div className="flex space-x-3 pt-4">
								<button
									type="button"
									onClick={onClose}
									className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
								>
									Cancel
								</button>
								<button
									type="submit"
									disabled={loading}
									className="flex-1 px-4 py-2 bg-[#ff5b5b] text-white rounded-md hover:bg-[#ff4545] disabled:opacity-50"
								>
									{loading ? 'Generating...' : 'Generate Code'}
								</button>
							</div>
						</form>
					) : (
						<div>
							<div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-md">
								<p className="text-sm text-green-800 font-medium">
									✓ Successfully generated invite code!
								</p>
							</div>

							<div className="p-4 border border-gray-200 rounded-md hover:border-[#ff5b5b] transition-colors">
								<div className="flex items-center justify-between mb-2">
									<span className="text-lg font-mono font-bold text-gray-900">
										{generatedCode.code}
									</span>
									<button
										onClick={() => copyLink(generatedCode.registrationLink)}
										className="text-[#ff5b5b] hover:text-[#ff4545]"
									>
										<Copy className="w-4 h-4" />
									</button>
								</div>
								<div className="text-xs text-gray-600 font-mono break-all bg-gray-50 p-2 rounded">
									{generatedCode.registrationLink}
								</div>
							</div>

							<div className="flex space-x-3 pt-4 mt-4 border-t">
								<button
									onClick={() => {
										setGeneratedCode(null);
										setFormData({
											ownerEmail: '',
											source: '',
											note: '',
										});
									}}
									className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
								>
									Generate Another
								</button>
								<button
									onClick={() => {
										onGenerated();
										setGeneratedCode(null);
									}}
									className="flex-1 px-4 py-2 bg-[#ff5b5b] text-white rounded-md hover:bg-[#ff4545]"
								>
									Done
								</button>
							</div>
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
