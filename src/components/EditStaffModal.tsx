'use client';

import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';

interface Staff {
	id: string;
	name: string;
	accessLevel: 'ADMIN' | 'EMPLOYEE';
	email: string;
	phone: string;
}

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
	const [formData, setFormData] = useState({
		name: '',
		accessLevel: 'EMPLOYEE' as 'ADMIN' | 'EMPLOYEE',
		email: '',
		phone: '',
	});
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState('');

	useEffect(() => {
		if (staff) {
			setFormData({
				name: staff.name,
				accessLevel: staff.accessLevel,
				email: staff.email || '',
				phone: staff.phone || '',
			});
		}
	}, [staff]);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setLoading(true);
		setError('');

		const updateToast = toast.loading('Updating staff member...');

		try {
			if (!staff) return;

			const response = await fetch(`/api/staff/${staff.id}`, {
				method: 'PUT',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify(formData),
			});

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.error || 'Failed to update staff member');
			}

			const updatedStaff = await response.json();
			onSave(updatedStaff.staff);
			toast.success('Staff member updated successfully!', { id: updateToast });
			onClose();
		} catch (err: any) {
			setError(err.message);
			toast.error(err.message || 'Failed to update staff member', {
				id: updateToast,
			});
		} finally {
			setLoading(false);
		}
	};

	if (!isOpen || !staff) return null;

	return (
		<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
			<div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
				<div className="p-6">
					<div className="flex items-center justify-between mb-6">
						<h2 className="text-2xl font-bold text-gray-900">
							Edit Staff Member
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
								Full Name *
							</label>
							<input
								type="text"
								required
								value={formData.name}
								onChange={(e) =>
									setFormData({ ...formData, name: e.target.value })
								}
								className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#ff5b5b] focus:border-[#ff5b5b] text-gray-900"
								placeholder="Enter full name"
							/>
						</div>

						<div>
							<label className="block text-sm font-medium text-gray-700 mb-2">
								Access Level *
							</label>
							<select
								required
								value={formData.accessLevel}
								onChange={(e) =>
									setFormData({
										...formData,
										accessLevel: e.target.value as 'ADMIN' | 'EMPLOYEE',
									})
								}
								className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#ff5b5b] focus:border-[#ff5b5b] text-gray-900"
							>
								<option value="EMPLOYEE">Employee - Limited access</option>
								<option value="ADMIN">
									Admin - Full access to salon management
								</option>
							</select>
							<p className="text-xs text-gray-500 mt-1">
								Admins can manage staff, services, and appointments. Employees
								have limited access.
							</p>
						</div>

						<div>
							<label className="block text-sm font-medium text-gray-700 mb-2">
								Email
							</label>
							<input
								type="email"
								value={formData.email}
								onChange={(e) =>
									setFormData({ ...formData, email: e.target.value })
								}
								className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#ff5b5b] focus:border-[#ff5b5b] text-gray-900"
								placeholder="staff@salon.com"
							/>
						</div>

						<div>
							<label className="block text-sm font-medium text-gray-700 mb-2">
								Phone
							</label>
							<input
								type="tel"
								value={formData.phone}
								onChange={(e) =>
									setFormData({ ...formData, phone: e.target.value })
								}
								className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#ff5b5b] focus:border-[#ff5b5b] text-gray-900"
								placeholder="+1 (555) 123-4567"
							/>
						</div>

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
								Cancel
							</button>
							<button
								type="submit"
								disabled={loading}
								className="flex-1 bg-[#ff5b5b] text-white px-4 py-2 rounded-md hover:bg-[#e04a4a] focus:outline-none focus:ring-2 focus:ring-[#ff5b5b] focus:ring-offset-2 disabled:opacity-50"
							>
								{loading ? 'Saving...' : 'Save Changes'}
							</button>
						</div>
					</form>
				</div>
			</div>
		</div>
	);
}
