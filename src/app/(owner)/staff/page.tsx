'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import EditStaffModal from '@/components/EditStaffModal';
import { useStaffBySalon, useDeleteStaff } from '@/hooks/useStaff';
import LoadingSpinner from '@/components/LoadingSpinner';
import ErrorDisplay from '@/components/ErrorDisplay';
import { Staff } from '@/types';

export default function StaffPage() {
	const [isEditModalOpen, setIsEditModalOpen] = useState(false);
	const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null);
	const router = useRouter();

	// Временное решение - используем salonId = "1" для тестирования
	// В реальном приложении это должно браться из контекста пользователя
	const salonId = '1';

	const {
		data: staff = [],
		isLoading: loading,
		error,
		refetch,
	} = useStaffBySalon(salonId);

	const deleteStaffMutation = useDeleteStaff();

	const handleEditStaff = (staffMember: Staff) => {
		setSelectedStaff(staffMember);
		setIsEditModalOpen(true);
	};

	const handleDeleteStaff = async (staffId: string) => {
		if (!confirm('Are you sure you want to delete this staff member?')) return;
		deleteStaffMutation.mutate(staffId);
	};

	const handleSaveStaff = (updatedStaff: Staff) => {
		refetch(); // Обновляем данные после изменения
	};

	const getAccessLevelBadge = (accessLevel: string) => {
		if (accessLevel === 'ADMIN') {
			return (
				<span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
					Admin
				</span>
			);
		}
		return (
			<span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
				Employee
			</span>
		);
	};

	if (loading) {
		return (
			<div className="flex items-center justify-center min-h-[400px]">
				<LoadingSpinner size="lg" />
			</div>
		);
	}

	if (error) {
		return <ErrorDisplay error={error} onRetry={refetch} />;
	}

	return (
		<div>
			<div className="flex items-center justify-between mb-8">
				<div>
					<h1 className="text-3xl font-bold text-gray-900 mb-2">Staff</h1>
					<p className="text-gray-600">
						Manage your salon staff members and their access levels
					</p>
				</div>
				<button
					onClick={() => router.push('/staff/new')}
					className="bg-[#ff5b5b] text-white px-6 py-3 rounded-lg font-medium hover:bg-[#e04a4a] transition-colors"
				>
					Add New Staff
				</button>
			</div>

			{staff.length === 0 ? (
				<div className="text-center py-12">
					<div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
						<span className="text-2xl">👥</span>
					</div>
					<h3 className="text-xl font-semibold text-gray-900 mb-2">
						No staff members yet
					</h3>
					<p className="text-gray-600 mb-6">
						Get started by adding your first staff member to your salon
					</p>
					<button
						onClick={() => router.push('/staff/new')}
						className="bg-[#ff5b5b] text-white px-6 py-3 rounded-lg font-medium hover:bg-[#e04a4a] transition-colors"
					>
						Add Your First Staff Member
					</button>
				</div>
			) : (
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
					{staff.map((staffMember) => (
						<div
							key={staffMember.id}
							className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md transition-shadow"
						>
							<div className="flex items-start justify-between mb-4">
								<div className="flex items-center gap-3">
									<div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-blue-200 rounded-full flex items-center justify-center">
										<span className="text-lg font-semibold text-blue-600">
											{staffMember.name.charAt(0).toUpperCase()}
										</span>
									</div>
									<div>
										<h3 className="text-lg font-semibold text-gray-900">
											{staffMember.name}
										</h3>
										{getAccessLevelBadge(staffMember.accessLevel)}
									</div>
								</div>
								<div className="flex gap-2">
									<button
										onClick={() => handleEditStaff(staffMember)}
										className="text-gray-400 hover:text-gray-600 transition-colors"
										title="Edit staff member"
									>
										<svg
											className="w-4 h-4"
											fill="none"
											stroke="currentColor"
											viewBox="0 0 24 24"
										>
											<path
												strokeLinecap="round"
												strokeLinejoin="round"
												strokeWidth={2}
												d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
											/>
										</svg>
									</button>
									<button
										onClick={() => handleDeleteStaff(staffMember.id)}
										className="text-gray-400 hover:text-red-600 transition-colors"
										title="Delete staff member"
									>
										<svg
											className="w-4 h-4"
											fill="none"
											stroke="currentColor"
											viewBox="0 0 24 24"
										>
											<path
												strokeLinecap="round"
												strokeLinejoin="round"
												strokeWidth={2}
												d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
											/>
										</svg>
									</button>
								</div>
							</div>

							<div className="space-y-2 text-sm text-gray-600">
								{staffMember.email && (
									<div className="flex items-center gap-2">
										<span>📧</span>
										<span>{staffMember.email}</span>
									</div>
								)}
								{staffMember.phone && (
									<div className="flex items-center gap-2">
										<span>📱</span>
										<span>{staffMember.phone}</span>
									</div>
								)}
								<div className="flex items-center gap-2">
									<span>🔑</span>
									<span className="capitalize">
										{staffMember.accessLevel.toLowerCase()}
									</span>
								</div>
							</div>

							{staffMember.services && staffMember.services.length > 0 && (
								<div className="mt-4 pt-4 border-t border-gray-200">
									<p className="text-xs text-gray-500 mb-2">Services:</p>
									<div className="flex flex-wrap gap-1">
										{staffMember.services.slice(0, 3).map((service) => (
											<span
												key={service.id}
												className="inline-block px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded"
											>
												{service.name}
											</span>
										))}
										{staffMember.services.length > 3 && (
											<span className="inline-block px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded">
												+{staffMember.services.length - 3} more
											</span>
										)}
									</div>
								</div>
							)}
						</div>
					))}
				</div>
			)}

			{/* Edit Staff Modal */}
			{selectedStaff && (
				<EditStaffModal
					isOpen={isEditModalOpen}
					onClose={() => {
						setIsEditModalOpen(false);
						setSelectedStaff(null);
					}}
					staff={selectedStaff}
					onSuccess={handleSaveStaff}
				/>
			)}
		</div>
	);
}
