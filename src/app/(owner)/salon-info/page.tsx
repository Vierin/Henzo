'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import AddressAutocomplete from '@/components/AddressAutocomplete';
import MapComponentWithCoords from '@/components/MapComponentWithCoords';
import LoadingSpinner from '@/components/LoadingSpinner';
import FileUpload from '@/components/FileUpload';
import PhotoUpload from '@/components/PhotoUpload';
import { useSalon } from '@/hooks/useSalon';
import { apiClient } from '@/lib/api-client';

// Кастомный компонент для выбора времени в 24-часовом формате
const TimePicker24h = ({
	value,
	onChange,
	className = '',
}: {
	value: string;
	onChange: (value: string) => void;
	className?: string;
}) => {
	const [hours, minutes] = value.split(':').map(Number);

	const handleHoursChange = (newHours: number) => {
		const formattedHours = newHours.toString().padStart(2, '0');
		onChange(`${formattedHours}:${minutes.toString().padStart(2, '0')}`);
	};

	const handleMinutesChange = (newMinutes: number) => {
		const formattedMinutes = newMinutes.toString().padStart(2, '0');
		onChange(`${hours.toString().padStart(2, '0')}:${formattedMinutes}`);
	};

	return (
		<div className={`flex items-center space-x-1 ${className}`}>
			<select
				value={hours}
				onChange={(e) => handleHoursChange(Number(e.target.value))}
				className="px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#ff5b5b] focus:border-[#ff5b5b] text-sm bg-white"
			>
				{Array.from({ length: 24 }, (_, i) => (
					<option key={i} value={i}>
						{i.toString().padStart(2, '0')}
					</option>
				))}
			</select>
			<span className="text-gray-500">:</span>
			<select
				value={minutes}
				onChange={(e) => handleMinutesChange(Number(e.target.value))}
				className="px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#ff5b5b] focus:border-[#ff5b5b] text-sm bg-white"
			>
				{Array.from({ length: 60 }, (_, i) => (
					<option key={i} value={i}>
						{i.toString().padStart(2, '0')}
					</option>
				))}
			</select>
		</div>
	);
};

export default function SalonInfoPage() {
	const [formData, setFormData] = useState({
		salonName: '',
		description: '',
		address: '',
		phone: '',
		email: '',
		website: '',
		instagram: '',
		logo: '',
		photos: [] as string[],
		operatingHours: {
			monday: { open: '09:00', close: '18:00', closed: false },
			tuesday: { open: '09:00', close: '18:00', closed: false },
			wednesday: { open: '09:00', close: '18:00', closed: false },
			thursday: { open: '09:00', close: '18:00', closed: false },
			friday: { open: '09:00', close: '19:00', closed: false },
			saturday: { open: '10:00', close: '17:00', closed: false },
			sunday: { open: '', close: '', closed: true },
		},
	});
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState('');
	const [selectedCoords, setSelectedCoords] = useState<{
		lat: number;
		lon: number;
	} | null>(null);
	const router = useRouter();

	// Используем оптимизированный хук для получения данных салона
	const {
		data: salon,
		isLoading: initialLoading,
		error: salonError,
	} = useSalon();
	const hasExistingSalon = !!salon?.id;

	// Заполняем форму данными из кэша
	useEffect(() => {
		if (salon) {
			setFormData({
				salonName: salon.name || '',
				description: salon.description || '',
				address: salon.address || '',
				phone: salon.phone || '',
				email: salon.email || '',
				website: salon.website || '',
				instagram: salon.instagram || '',
				logo: salon.logo || '',
				photos: salon.photos || [],
				operatingHours: salon.workingHours
					? {
							monday: {
								open: salon.workingHours.monday?.open || '09:00',
								close: salon.workingHours.monday?.close || '18:00',
								closed: salon.workingHours.monday?.closed ?? false,
							},
							tuesday: {
								open: salon.workingHours.tuesday?.open || '09:00',
								close: salon.workingHours.tuesday?.close || '18:00',
								closed: salon.workingHours.tuesday?.closed ?? false,
							},
							wednesday: {
								open: salon.workingHours.wednesday?.open || '09:00',
								close: salon.workingHours.wednesday?.close || '18:00',
								closed: salon.workingHours.wednesday?.closed ?? false,
							},
							thursday: {
								open: salon.workingHours.thursday?.open || '09:00',
								close: salon.workingHours.thursday?.close || '18:00',
								closed: salon.workingHours.thursday?.closed ?? false,
							},
							friday: {
								open: salon.workingHours.friday?.open || '09:00',
								close: salon.workingHours.friday?.close || '18:00',
								closed: salon.workingHours.friday?.closed ?? false,
							},
							saturday: {
								open: salon.workingHours.saturday?.open || '09:00',
								close: salon.workingHours.saturday?.close || '18:00',
								closed: salon.workingHours.saturday?.closed ?? false,
							},
							sunday: {
								open: salon.workingHours.sunday?.open || '09:00',
								close: salon.workingHours.sunday?.close || '18:00',
								closed: salon.workingHours.sunday?.closed ?? false,
							},
						}
					: formData.operatingHours,
			});
		}
	}, [salon]);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setLoading(true);
		setError('');

		const actionText = hasExistingSalon
			? 'Updating salon information...'
			: 'Creating salon...';
		const saveToast = toast.loading(actionText);

		try {
			// Валидация данных
			if (!formData.salonName.trim()) {
				throw new Error('Salon name is required');
			}

			if (!formData.address.trim()) {
				throw new Error('Address is required');
			}

			const salonData = {
				name: formData.salonName,
				description: formData.description,
				address: formData.address,
				phone: formData.phone,
				email: formData.email,
				website: formData.website,
				instagram: formData.instagram,
				logo: formData.logo,
				photos: formData.photos,
				workingHours: formData.operatingHours,
			};

			console.log('📤 Sending salon data:', JSON.stringify(salonData, null, 2));

			// Выбираем метод запроса в зависимости от того, есть ли уже салон
			if (hasExistingSalon) {
				await apiClient.put('/salons/current', salonData);
				toast.success('Salon information updated successfully!', {
					id: saveToast,
				});
			} else {
				await apiClient.post('/salons/current', salonData);
				toast.success('Salon created successfully!', { id: saveToast });
			}

			// Stay on the page after successful save
		} catch (err: unknown) {
			const errorMessage =
				err instanceof Error ? err.message : 'Failed to save salon information';
			setError(errorMessage);
			toast.error(errorMessage, {
				id: saveToast,
			});
		} finally {
			setLoading(false);
		}
	};

	const handleTimeChange = (
		day: string,
		field: 'open' | 'close',
		value: string
	) => {
		setFormData((prev) => ({
			...prev,
			operatingHours: {
				...prev.operatingHours,
				[day]: {
					...prev.operatingHours[day as keyof typeof prev.operatingHours],
					[field]: value,
				},
			},
		}));
	};

	const toggleDayClosed = (day: string) => {
		setFormData((prev) => ({
			...prev,
			operatingHours: {
				...prev.operatingHours,
				[day]: {
					...prev.operatingHours[day as keyof typeof prev.operatingHours],
					closed:
						!prev.operatingHours[day as keyof typeof prev.operatingHours]
							.closed,
					open: prev.operatingHours[day as keyof typeof prev.operatingHours]
						.closed
						? '09:00'
						: '',
					close: prev.operatingHours[day as keyof typeof prev.operatingHours]
						.closed
						? '18:00'
						: '',
				},
			},
		}));
	};

	const days = [
		{ key: 'monday', label: 'Monday' },
		{ key: 'tuesday', label: 'Tuesday' },
		{ key: 'wednesday', label: 'Wednesday' },
		{ key: 'thursday', label: 'Thursday' },
		{ key: 'friday', label: 'Friday' },
		{ key: 'saturday', label: 'Saturday' },
		{ key: 'sunday', label: 'Sunday' },
	];

	// Показываем загрузку
	if (initialLoading) {
		return (
			<div className="flex items-center justify-center min-h-[400px]">
				<LoadingSpinner />
			</div>
		);
	}

	return (
		<div>
			<div className="text-center mb-8">
				<h1 className="text-4xl font-bold text-gray-900 mb-4">
					Salon Information
				</h1>
				<p className="text-lg text-gray-600">
					Provide details about your salon, including name, description,
					address, contact information, photos, and operating hours.
				</p>
			</div>

			<form onSubmit={handleSubmit} className="space-y-8">
				{/* Basic Details Section */}
				<div className="bg-white border border-gray-200 rounded-lg p-6">
					<h2 className="text-2xl font-semibold text-gray-900 mb-6">
						Basic Details
					</h2>

					<div className="space-y-6">
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-2">
								Salon Name
							</label>
							<input
								type="text"
								required
								value={formData.salonName}
								onChange={(e) =>
									setFormData({ ...formData, salonName: e.target.value })
								}
								className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#ff5b5b] focus:border-[#ff5b5b] text-gray-900"
								placeholder="Enter salon name"
							/>
						</div>

						<div>
							<label className="block text-sm font-medium text-gray-700 mb-2">
								Description
							</label>
							<textarea
								rows={4}
								value={formData.description}
								onChange={(e) =>
									setFormData({ ...formData, description: e.target.value })
								}
								className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#ff5b5b] focus:border-[#ff5b5b] text-gray-900"
								placeholder="Describe your salon..."
							/>
						</div>

						<div>
							<label className="block text-sm font-medium text-gray-700 mb-2">
								Address
							</label>
							<AddressAutocomplete
								value={formData.address}
								onChange={(address) => setFormData({ ...formData, address })}
								onAddressSelect={(address, lat, lon) => {
									// Update form data and coordinates
									setFormData({ ...formData, address });
									setSelectedCoords({ lat, lon });
									console.log('📍 Address selected:', { address, lat, lon });
								}}
							/>
						</div>
					</div>
				</div>

				{/* Map Section */}
				{formData.address && (
					<div className="bg-white border border-gray-200 rounded-lg p-6">
						<h2 className="text-2xl font-semibold text-gray-900 mb-6">
							Location Preview
						</h2>
						<MapComponentWithCoords
							lat={selectedCoords?.lat}
							lon={selectedCoords?.lon}
							address={formData.address}
						/>
					</div>
				)}

				{/* Contact Information Section */}
				<div className="bg-white border border-gray-200 rounded-lg p-6">
					<h2 className="text-2xl font-semibold text-gray-900 mb-6">
						Contact Information
					</h2>

					<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-2">
								Phone Number
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

						<div>
							<label className="block text-sm font-medium text-gray-700 mb-2">
								Email Address
							</label>
							<input
								type="email"
								value={formData.email}
								onChange={(e) =>
									setFormData({ ...formData, email: e.target.value })
								}
								className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#ff5b5b] focus:border-[#ff5b5b] text-gray-900"
								placeholder="contact@salon.com"
							/>
						</div>

						<div>
							<label className="block text-sm font-medium text-gray-700 mb-2">
								Website
							</label>
							<input
								type="url"
								value={formData.website}
								onChange={(e) =>
									setFormData({ ...formData, website: e.target.value })
								}
								className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#ff5b5b] focus:border-[#ff5b5b] text-gray-900"
								placeholder="https://www.salon.com"
							/>
						</div>

						<div>
							<label className="block text-sm font-medium text-gray-700 mb-2">
								Instagram
							</label>
							<input
								type="text"
								value={formData.instagram}
								onChange={(e) =>
									setFormData({ ...formData, instagram: e.target.value })
								}
								className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#ff5b5b] focus:border-[#ff5b5b] text-gray-900"
								placeholder="@salon_handle"
							/>
						</div>
					</div>
				</div>

				{/* Logo Section */}
				<div className="bg-white border border-gray-200 rounded-lg p-6">
					<h2 className="text-2xl font-semibold text-gray-900 mb-6">
						Salon Logo
					</h2>

					<div>
						<label className="block text-sm font-medium text-gray-700 mb-2">
							Salon Logo
						</label>
						<FileUpload
							onUpload={(filePath) =>
								setFormData({ ...formData, logo: filePath })
							}
							onRemove={() => setFormData({ ...formData, logo: '' })}
							currentFile={formData.logo}
							accept="image/*"
							maxSize={2}
							placeholder="Click or drag and drop logo here"
							disabled={loading}
						/>
					</div>
				</div>

				{/* Salon Photos Section */}
				<div className="bg-white border border-gray-200 rounded-lg p-6">
					<h2 className="text-2xl font-semibold text-gray-900 mb-6">
						Salon Photos
					</h2>

					<div>
						<label className="block text-sm font-medium text-gray-700 mb-2">
							Upload up to 3 photos of your salon
						</label>
						<PhotoUpload
							photos={formData.photos}
							onPhotosChange={(photos) => setFormData({ ...formData, photos })}
							maxPhotos={3}
							maxSize={2}
							disabled={loading}
						/>
					</div>
				</div>

				{/* Operating Hours Section */}
				<div className="bg-white border border-gray-200 rounded-lg p-6">
					<h2 className="text-2xl font-semibold text-gray-900 mb-6">
						🕒 Operating Hours
					</h2>

					<div className="space-y-3">
						{days.map((day) => {
							const dayData =
								formData.operatingHours[
									day.key as keyof typeof formData.operatingHours
								];
							return (
								<div
									key={day.key}
									className={`flex items-center justify-between p-4 rounded-lg border transition-all duration-200 ${
										dayData.closed
											? 'bg-gray-50 border-gray-200'
											: 'bg-green-50 border-green-200 hover:bg-green-100'
									}`}
								>
									<div className="flex items-center space-x-3">
										<label className="flex items-center space-x-3 cursor-pointer">
											<input
												type="checkbox"
												checked={!dayData.closed}
												onChange={() => toggleDayClosed(day.key)}
												className="w-4 h-4 rounded border-gray-300 text-[#ff5b5b] focus:ring-[#ff5b5b] focus:ring-2"
											/>
											<span className="text-base font-medium text-gray-800">
												{day.label}
											</span>
										</label>
									</div>

									{!dayData.closed ? (
										<div className="flex items-center space-x-3">
											<div className="flex items-center space-x-2">
												<span className="text-sm text-gray-600">Open:</span>
												<TimePicker24h
													value={dayData.open}
													onChange={(value) =>
														handleTimeChange(day.key, 'open', value)
													}
												/>
											</div>
											<span className="text-gray-400">—</span>
											<div className="flex items-center space-x-2">
												<span className="text-sm text-gray-600">Close:</span>
												<TimePicker24h
													value={dayData.close}
													onChange={(value) =>
														handleTimeChange(day.key, 'close', value)
													}
												/>
											</div>
										</div>
									) : (
										<div className="flex items-center space-x-2 text-gray-500">
											<span className="text-sm">🚫</span>
											<span className="text-sm font-medium">Closed</span>
										</div>
									)}
								</div>
							);
						})}
					</div>

					{/* Quick Actions */}
					<div className="mt-6 pt-4 border-t border-gray-200">
						<div className="flex gap-2">
							<button
								type="button"
								onClick={() => {
									// Set all days to open with default hours
									const newHours = { ...formData.operatingHours };
									Object.keys(newHours).forEach((day) => {
										newHours[day as keyof typeof newHours] = {
											open: '09:00',
											close: '18:00',
											closed: false,
										};
									});
									setFormData({ ...formData, operatingHours: newHours });
								}}
								className="px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition-colors"
							>
								Set All Open
							</button>
							<button
								type="button"
								onClick={() => {
									// Set all days to closed
									const newHours = { ...formData.operatingHours };
									Object.keys(newHours).forEach((day) => {
										newHours[day as keyof typeof newHours] = {
											open: '',
											close: '',
											closed: true,
										};
									});
									setFormData({ ...formData, operatingHours: newHours });
								}}
								className="px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
							>
								Set All Closed
							</button>
						</div>
					</div>
				</div>

				{error && (
					<div className="bg-red-50 border border-red-200 rounded-md p-4">
						<div className="flex">
							<div className="flex-shrink-0">
								<svg
									className="h-5 w-5 text-red-400"
									viewBox="0 0 20 20"
									fill="currentColor"
								>
									<path
										fillRule="evenodd"
										d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
										clipRule="evenodd"
									/>
								</svg>
							</div>
							<div className="ml-3">
								<h3 className="text-sm font-medium text-red-800">
									Error saving salon information
								</h3>
								<div className="mt-2 text-sm text-red-700">
									<p>{error}</p>
								</div>
							</div>
						</div>
					</div>
				)}

				{/* Submit Button */}
				<div className="flex justify-end">
					<button
						type="submit"
						disabled={loading}
						className="bg-[#ff5b5b] text-white px-8 py-3 rounded-lg font-medium hover:bg-[#e04a4a] focus:outline-none focus:ring-2 focus:ring-[#ff5b5b] focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
					>
						{loading
							? hasExistingSalon
								? 'Updating...'
								: 'Creating...'
							: hasExistingSalon
								? 'Update Salon Information'
								: 'Add Salon'}
					</button>
				</div>
			</form>
		</div>
	);
}
