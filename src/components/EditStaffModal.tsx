'use client';

import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { Staff } from '@/types';
import { useTranslation } from '@/contexts/LanguageContext';
import { useServices } from '@/hooks/useServices';
import { apiClient } from '@/lib/api-client';

interface EditStaffModalProps {
	isOpen: boolean;
	onClose: () => void;
	staff: Staff | null;
	onSave: (staff: Staff) => void;
}

export default function EditStaffModal({
	isOpen,
	onClose,
	staff,
	onSave,
}: EditStaffModalProps) {
	const t = useTranslation();
	const [formData, setFormData] = useState({
		name: '',
		email: '',
		phone: '',
	});
	const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState('');

	// Load services for this salon
	const salonId = staff?.salonId;
	const { data: services = [] } = useServices(salonId || '', {});

	useEffect(() => {
		if (staff) {
			setFormData({
				name: staff.name,
				email: staff.email || '',
				phone: staff.phone || '',
			});
			// Set selected service IDs from staff.Service array
			const staffServices = (staff as any).Service || [];
			setSelectedServiceIds(staffServices.map((service: any) => service.id));
		}
	}, [staff]);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setLoading(true);
		setError('');

		const updateToast = toast.loading('Updating staff member...');

		try {
			if (!staff) return;

			const updatedStaff = await apiClient.put(`/staff/${staff.id}`, {
				...formData,
				serviceIds: selectedServiceIds.length > 0 ? selectedServiceIds : [],
			});

			onSave(updatedStaff);
			toast.success('Staff member updated successfully!', { id: updateToast });
			onClose();
		} catch (err: unknown) {
			const errorMessage =
				err instanceof Error ? err.message : 'Failed to update staff member';
			setError(errorMessage);
			toast.error(errorMessage, {
				id: updateToast,
			});
		} finally {
			setLoading(false);
		}
	};

	if (!isOpen || !staff) return null;

	return (
		<div className="fixed inset-0 bg-black/60 bg-opacity-50 flex items-center justify-center z-50 p-4">
			<div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
				<div className="p-6">
					<div className="flex items-center justify-between mb-6">
						<h2 className="text-2xl font-bold text-gray-900">
							{t('owner.staff.editStaffMemberTitle')}
						</h2>
						<button
							onClick={onClose}
							className="p-2 hover:bg-gray-100 rounded-full transition-colors"
						>
							<svg
								className="w-6 h-6 text-gray-500"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
									d="M6 18L18 6M6 6l12 12"
								/>
							</svg>
						</button>
					</div>

					<form onSubmit={handleSubmit} className="space-y-4">
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-2">
								{t('owner.staff.fullName')}
							</label>
							<input
								type="text"
								required
								value={formData.name}
								onChange={(e) =>
									setFormData({ ...formData, name: e.target.value })
								}
								className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#ff5b5b] focus:border-[#ff5b5b] text-gray-900"
								placeholder={t('owner.staff.enterFullName')}
							/>
						</div>

						<div>
							<label className="block text-sm font-medium text-gray-700 mb-2">
								{t('owner.staff.email')}
							</label>
							<input
								type="email"
								value={formData.email}
								onChange={(e) =>
									setFormData({ ...formData, email: e.target.value })
								}
								className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#ff5b5b] focus:border-[#ff5b5b] text-gray-900"
								placeholder={t('owner.staff.emailPlaceholder')}
							/>
						</div>

						<div>
							<label className="block text-sm font-medium text-gray-700 mb-2">
								{t('owner.staff.phone')}
							</label>
							<input
								type="tel"
								value={formData.phone}
								onChange={(e) =>
									setFormData({ ...formData, phone: e.target.value })
								}
								className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#ff5b5b] focus:border-[#ff5b5b] text-gray-900"
								placeholder={t('owner.staff.phonePlaceholder')}
							/>
						</div>

						{services.length > 0 && (
							<div>
								<label
									htmlFor="staff-services"
									className="block text-sm font-medium text-gray-700 mb-2"
								>
									{t('owner.staff.services')}
									<span className="text-xs text-gray-500 ml-1">
										({t('owner.staff.servicesOptional')})
									</span>
								</label>
								<div className="border border-gray-300 rounded-md p-3 max-h-48 overflow-y-auto bg-white">
									{services.map((service) => (
										<label
											key={service.id}
											className="flex items-center space-x-2 py-1 hover:bg-gray-50 px-2 rounded cursor-pointer"
										>
											<input
												type="checkbox"
												checked={selectedServiceIds.includes(service.id)}
												onChange={(e) => {
													if (e.target.checked) {
														setSelectedServiceIds([...selectedServiceIds, service.id]);
													} else {
														setSelectedServiceIds(
															selectedServiceIds.filter((id) => id !== service.id)
														);
													}
												}}
												className="w-4 h-4 text-[#ff5b5b] border-gray-300 rounded focus:ring-[#ff5b5b]"
											/>
											<span className="text-sm text-gray-900">{service.name}</span>
										</label>
									))}
								</div>
								<p className="text-xs text-gray-500 mt-1">
									{t('owner.staff.servicesHelp')}
								</p>
							</div>
						)}

						{error && (
							<div className="text-red-600 text-sm text-center bg-red-50 border border-red-200 rounded-md p-3">
								{error}
							</div>
						)}

						<div className="flex gap-3 pt-4">
							<button
								type="button"
								onClick={onClose}
								className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500"
							>
								{t('common.cancel')}
							</button>
							<button
								type="submit"
								disabled={loading}
								className="flex-1 bg-[#ff5b5b] text-white px-4 py-2 rounded-md hover:bg-[#e04a4a] focus:outline-none focus:ring-2 focus:ring-[#ff5b5b] focus:ring-offset-2 disabled:opacity-50"
							>
								{loading ? t('owner.staff.saving') : t('owner.staff.saveChanges')}
							</button>
						</div>
					</form>
				</div>
			</div>
		</div>
	);
}
