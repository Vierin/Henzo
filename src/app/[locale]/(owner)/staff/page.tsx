'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import EditStaffModal from '@/components/EditStaffModal';
import { useStaffBySalon, useDeleteStaff } from '@/hooks/useStaff';
import { useOwnerLayout } from '@/contexts/OwnerLayoutContext';
import LoadingSpinner from '@/components/LoadingSpinner';
import ErrorDisplay from '@/components/ErrorDisplay';
import { Staff } from '@/types';

export default function StaffPage() {
	const [isEditModalOpen, setIsEditModalOpen] = useState(false);
	const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null);
	const router = useRouter();

	// Используем данные салона из контекста (избегаем дублирования запросов)
	const { salonId, isLoading: salonLoading, hasSalon } = useOwnerLayout();

	const {
		data: staff = [],
		isLoading: loading,
		error,
		refetch,
	} = useStaffBySalon(salonId || '');

	const deleteStaffMutation = useDeleteStaff();

	// Перенаправляем на создание салона, если салон не найден
	if (!salonLoading && !hasSalon) {
		router.push('/salon-info');
		return null;
	}

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

	if (salonLoading || loading) {
		return (
			<div className="flex items-center justify-center min-h-[400px]">
				<LoadingSpinner size="lg" />
			</div>
		);
	}

	if (error) {
		return (
			<div className="flex items-center justify-center min-h-[400px]">
				<ErrorDisplay
					error={
						error instanceof Error ? error : new Error('An error occurred')
					}
					onRetry={refetch}
				/>
			</div>
		);
	}

	return (
		<div className="px-4 max-w-7xl mx-auto">
			<div className="mb-8">
				<div className="flex items-center justify-between">
					<div>
						<h1 className="text-2xl md:text-3xl font-bold text-black md:mb-2">
							Staff
						</h1>
						<p className="text-sm md:text-base text-gray-800">
							Manage your salon team and access levels
						</p>
					</div>
					<button
						onClick={() => router.push('/staff/new')}
						className="inline-flex items-center gap-2 rounded-full bg-[#ff5b5b] text-white px-4 py-2 text-sm shadow-sm hover:opacity-95 whitespace-nowrap"
					>
						<span className="text-lg leading-none">＋</span>
						<span>Add New</span>
						<span className="hidden md:inline">Staff</span>
					</button>
				</div>
			</div>

			{staff.length === 0 ? (
				<div className="bg-white rounded-xl border border-[#f1d9d7] p-12 text-center">
					<div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
						<svg
							className="w-8 h-8 text-gray-400"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={2}
								d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"
							/>
						</svg>
					</div>
					<h3 className="text-lg font-semibold text-gray-900 mb-2">
						No staff members yet
					</h3>
					<p className="text-gray-600 mb-6">
						Start by adding your first team member to your salon
					</p>
					<button
						onClick={() => router.push('/staff/new')}
						className="inline-flex items-center gap-2 bg-[#ff5b5b] text-white px-6 py-3 rounded-lg font-medium hover:bg-[#e04a4a] transition-colors"
					>
						<span className="text-lg">＋</span>
						Add Your First Staff Member
					</button>
				</div>
			) : (
				<div className="bg-white rounded-xl border border-[#f1d9d7] overflow-hidden">
					{/* Desktop Table View */}
					<div className="hidden md:block">
						<div className="grid grid-cols-5 px-6 py-3 text-sm text-gray-700 bg-[#fff2f1] font-semibold">
							<div>Name</div>
							<div>Access Level</div>
							<div>Email</div>
							<div>Phone</div>
							<div>Actions</div>
						</div>
						<div className="divide-y divide-[#f1d9d7]">
							{staff.map((member) => (
								<div
									key={member.id}
									className="grid grid-cols-5 px-6 py-4 text-sm text-gray-800"
								>
									<div className="font-semibold">{member.name}</div>
									<div>{getAccessLevelBadge(member.accessLevel)}</div>
									<div className="text-gray-600">
										{member.email || 'No email'}
									</div>
									<div className="text-gray-600">
										{member.phone || 'No phone'}
									</div>
									<div className="flex gap-2">
										<button
											onClick={() => handleEditStaff(member)}
											className="p-1 text-[#ff5b5b] hover:text-[#e04a4a] hover:bg-red-50 rounded transition-colors"
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
											onClick={() => handleDeleteStaff(member.id)}
											className="p-1 text-red-600 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
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
							))}
						</div>
					</div>

					{/* Mobile Card View */}
					<div className="md:hidden divide-y divide-[#f1d9d7]">
						{staff.map((member) => (
							<div key={member.id} className="p-4">
								<div className="flex items-start justify-between mb-3">
									<div className="flex-1 min-w-0">
										<h3 className="font-semibold text-gray-900 truncate">
											{member.name}
										</h3>
										<div className="mt-1">
											{getAccessLevelBadge(member.accessLevel)}
										</div>
									</div>
									<div className="flex gap-2 ml-3">
										<button
											onClick={() => handleEditStaff(member)}
											className="p-2 text-[#ff5b5b] hover:text-[#e04a4a] hover:bg-red-50 rounded transition-colors"
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
											onClick={() => handleDeleteStaff(member.id)}
											className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
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
									{member.email && (
										<div className="flex items-center">
											<span className="font-medium mr-2">Email:</span>
											<span className="truncate">{member.email}</span>
										</div>
									)}
									{member.phone && (
										<div className="flex items-center">
											<span className="font-medium mr-2">Phone:</span>
											<span>{member.phone}</span>
										</div>
									)}
								</div>
							</div>
						))}
					</div>
				</div>
			)}

			{/* Edit Staff Modal */}
			<EditStaffModal
				isOpen={isEditModalOpen}
				onClose={() => {
					setIsEditModalOpen(false);
					setSelectedStaff(null);
				}}
				staff={selectedStaff}
				onSave={handleSaveStaff}
			/>
		</div>
	);
}
