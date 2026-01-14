'use client';

import {
	useState,
	useEffect,
	useRef,
	useCallback,
	lazy,
	Suspense,
} from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import LoadingSpinner from '@/components/LoadingSpinner';

// P1: Lazy load тяжелых компонентов для code splitting - загружаем только при необходимости
const AddressSelectModal = dynamic(
	() => import('@/components/AddressSelectModal'),
	{ ssr: false }
);
const EnhancedFileUpload = lazy(
	() => import('@/components/EnhancedFileUpload')
);
const EnhancedPhotoUpload = lazy(
	() => import('@/components/EnhancedPhotoUpload')
);
const WorkingHoursSection = lazy(
	() => import('@/components/WorkingHoursSection')
);
import { useSalon } from '@/hooks/useSalons';
import { useSalonSlug } from '@/hooks/useSalonSlug';
import { apiClient } from '@/lib/api-client';
import { logger } from '@/lib/logger';
import { Clock4, Copy, QrCode, Share2, MapPin, X } from 'lucide-react';
import { useTranslation } from '@/contexts/LanguageContext';

export default function SalonInfoPage() {
	const t = useTranslation();
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
		reminderSettings: {
			intervals: [24] as number[], // Default: 24 hours (1 day)
		},
	});
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState('');
	const [selectedCoords, setSelectedCoords] = useState<{
		lat: number;
		lon: number;
	} | null>(null);
	const [showDeleteModal, setShowDeleteModal] = useState(false);
	const [deleteLoading, setDeleteLoading] = useState(false);
	const [isUpdatingAddress, setIsUpdatingAddress] = useState(false);
	const [showAddressModal, setShowAddressModal] = useState(false);
	const [showQrModal, setShowQrModal] = useState(false);
	const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
	const addressUpdateTimerRef = useRef<NodeJS.Timeout | null>(null);
	const router = useRouter();
	const { getSalonUrl } = useSalonSlug();
	const [salonUrl, setSalonUrl] = useState<string>('');

	// Используем оптимизированный хук для получения данных салона
	const {
		data: salon,
		isLoading: initialLoading,
		error: salonError,
	} = useSalon();
	const hasExistingSalon = !!salon?.id;

	// Helper function to geocode address
	const geocodeAddress = useCallback(async (address: string) => {
		try {
			const API_BASE_URL =
				process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
			const response = await fetch(
				`${API_BASE_URL}/mapbox/geocode?address=${encodeURIComponent(address)}`
			);

			if (response.ok) {
				const data = await response.json();
				if (data.lat && data.lon) {
					return { lat: data.lat, lon: data.lon };
				}
			}
		} catch (error) {
			console.error('Failed to geocode address:', error);
		}
		return null;
	}, []);

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
				// categories are derived from services; no manual selection
				reminderSettings: (salon as any).reminderSettings || {
					intervals: [24],
				},
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

			// Set initial coordinates if salon has latitude/longitude
			if (salon.latitude && salon.longitude) {
				logger.log('📍 Setting coordinates from salon:', {
					lat: salon.latitude,
					lon: salon.longitude,
				});
				setSelectedCoords({
					lat: salon.latitude,
					lon: salon.longitude,
				});
			} else if (salon.address && salon.address.trim()) {
				// If salon has address but no coordinates, geocode it
				logger.log('🔍 Geocoding salon address:', salon.address);
				geocodeAddress(salon.address.trim()).then((coords) => {
					if (coords) {
						logger.log('✅ Geocoding successful:', coords);
						setSelectedCoords(coords);
					} else {
						logger.warn('⚠️ Geocoding failed for address:', salon.address);
					}
				});
			} else {
				logger.log('ℹ️ No coordinates or address found in salon');
			}
		}
	}, [salon, geocodeAddress]);

	// Handle marker move with debounce for address update (deprecated - now handled in modal)
	const handleMarkerMove = useCallback(
		async (lat: number, lon: number, address?: string) => {
			// Update coordinates immediately
			setSelectedCoords({ lat, lon });

			// Update address if provided directly
			if (address) {
				setFormData((prev) => ({ ...prev, address }));
				setIsUpdatingAddress(false);
				return;
			}

			// Show loading indicator
			setIsUpdatingAddress(true);

			// Clear existing timer
			if (addressUpdateTimerRef.current) {
				clearTimeout(addressUpdateTimerRef.current);
			}

			// Debounce reverse geocoding
			addressUpdateTimerRef.current = setTimeout(async () => {
				try {
					const API_BASE_URL =
						process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
					const response = await fetch(
						`${API_BASE_URL}/mapbox/reverse-geocode?lat=${lat}&lon=${lon}`
					);

					if (response.ok) {
						const data = await response.json();
						if (data.address) {
							setFormData((prev) => ({ ...prev, address: data.address }));
						}
					}
				} catch (error) {
					console.error('Failed to reverse geocode:', error);
				} finally {
					setIsUpdatingAddress(false);
					addressUpdateTimerRef.current = null;
				}
			}, 800); // 800ms debounce
		},
		[]
	);

	// Cleanup timer on unmount
	useEffect(() => {
		return () => {
			if (addressUpdateTimerRef.current) {
				clearTimeout(addressUpdateTimerRef.current);
			}
		};
	}, []);

	// Generate salon URL when salon data is loaded
	useEffect(() => {
		if (salon && hasExistingSalon) {
			const baseUrl =
				process.env.NEXT_PUBLIC_FRONTEND_URL || 'https://henzo.app';
			const url = `${baseUrl}${getSalonUrl(salon)}`;
			setSalonUrl(url);
			// Generate QR code URL
			const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(url)}`;
			setQrCodeUrl(qrApiUrl);
		} else {
			setSalonUrl('');
			setQrCodeUrl('');
		}
	}, [salon, hasExistingSalon, getSalonUrl]);

	// Map props removed - map is now in modal

	const copyToClipboard = async () => {
		if (!salonUrl) {
			toast.error(t('owner.salonInfo.pleaseWaitForSalonData'));
			return;
		}

		try {
			await navigator.clipboard.writeText(salonUrl);
			toast.success(t('owner.salonInfo.linkCopied'));
		} catch (err) {
			toast.error(t('owner.salonInfo.failedToCopy'));
		}
	};

	const shareLink = async () => {
		if (!salonUrl) {
			toast.error(t('owner.salonInfo.pleaseWaitForSalonData'));
			return;
		}

		if (navigator.share) {
			try {
				await navigator.share({
					title: `${salon?.name || formData.salonName || t('owner.salonInfo.title')} - ${t('common.bookNow')}`,
					text: `${t('common.checkOut') || 'Check out'} ${salon?.name || formData.salonName || t('owner.salonInfo.title')} ${t('common.andBookAppointment') || 'and book your appointment!'}`,
					url: salonUrl,
				});
				toast.success(
					t('owner.salonInfo.sharedSuccessfully') || 'Ссылка успешно отправлена'
				);
			} catch (err: any) {
				// User cancelled sharing or error occurred
				if (err.name !== 'AbortError') {
					// Only show error if it's not a user cancellation
					copyToClipboard(); // Fallback to copy
				}
			}
		} else {
			// Fallback for browsers that don't support Web Share API
			copyToClipboard();
		}
	};

	const openQrModal = () => {
		if (!salonUrl) {
			toast.error(t('owner.salonInfo.pleaseWaitForSalonData'));
			return;
		}
		setShowQrModal(true);
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setLoading(true);
		setError('');

		const actionText = hasExistingSalon
			? t('owner.salonInfo.updatingSalon')
			: t('owner.salonInfo.creatingSalon');
		const saveToast = toast.loading(actionText);

		try {
			// Валидация данных
			if (!formData.salonName.trim()) {
				throw new Error(t('owner.salonInfo.salonNameRequired'));
			}

			if (!formData.address.trim()) {
				throw new Error(t('owner.salonInfo.addressRequired'));
			}

			// No manual salon categories validation

			const salonData = {
				name: formData.salonName,
				description: formData.description,
				address: formData.address,
				latitude: selectedCoords?.lat,
				longitude: selectedCoords?.lon,
				phone: formData.phone,
				email: formData.email,
				website: formData.website,
				instagram: formData.instagram,
				logo: formData.logo,
				photos: formData.photos,
				workingHours: formData.operatingHours,
				reminderSettings: formData.reminderSettings,
			};

			console.log('📤 Sending salon data:', JSON.stringify(salonData, null, 2));

			// Выбираем метод запроса в зависимости от того, есть ли уже салон
			if (hasExistingSalon) {
				await apiClient.put('/salons/current', salonData);
				toast.success(t('owner.salonInfo.salonUpdated'), {
					id: saveToast,
				});
			} else {
				await apiClient.post('/salons/current', salonData);
				toast.success(t('owner.salonInfo.salonCreated'), { id: saveToast });
			}

			// Stay on the page after successful save
		} catch (err: unknown) {
			const errorMessage =
				err instanceof Error ? err.message : t('owner.salonInfo.failedToSave');
			setError(errorMessage);
			toast.error(errorMessage, {
				id: saveToast,
			});
		} finally {
			setLoading(false);
		}
	};

	const handleDeleteAccount = async () => {
		setDeleteLoading(true);
		try {
			// Вызываем API для удаления аккаунта
			await apiClient.delete('/auth/account');

			toast.success(t('owner.salonInfo.accountDeleted'));

			// Перенаправляем на главную страницу
			setTimeout(() => {
				window.location.href = '/';
			}, 2000);
		} catch (error: any) {
			console.error('Error deleting account:', error);
			toast.error(error.message || t('owner.salonInfo.failedToDelete'));
		} finally {
			setDeleteLoading(false);
		}
	};

	// Categories selection removed: categories are derived from actual services

	// Показываем загрузку
	if (initialLoading) {
		return (
			<div className="flex items-center justify-center min-h-[400px]">
				<LoadingSpinner message={t('owner.salonInfo.loading')} />
			</div>
		);
	}

	return (
		<div className="px-0 md:px-4 max-w-7xl mx-auto">
			<div className="text-center mb-8">
				<h1 className="text-2xl md:text-4xl font-bold text-gray-900 mb-2 md:mb-4">
					{t('owner.salonInfo.title')}
				</h1>
				<p className="text-sm md:text-lg text-gray-600 px-4 md:px-0">
					{t('owner.salonInfo.subtitle')}
				</p>
			</div>

			<form onSubmit={handleSubmit} className="space-y-6 md:space-y-8">
				{/* Basic Details Section */}
				<div className="bg-white border border-gray-200 rounded-lg p-3 md:p-6 overflow-visible">
					<h2 className="text-xl md:text-2xl font-semibold text-gray-900 mb-4 md:mb-6">
						{t('owner.salonInfo.basicDetails')}
					</h2>

					<div className="space-y-6">
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-2">
								{t('owner.salonInfo.salonName')}
							</label>
							<input
								type="text"
								required
								value={formData.salonName}
								onChange={(e) =>
									setFormData({ ...formData, salonName: e.target.value })
								}
								className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#ff5b5b] focus:border-[#ff5b5b] text-gray-900"
								placeholder={t('owner.salonInfo.salonNamePlaceholder')}
							/>
						</div>

						<div>
							<label className="block text-sm font-medium text-gray-700 mb-2">
								{t('owner.salonInfo.description')}
							</label>
							<textarea
								rows={4}
								value={formData.description}
								onChange={(e) =>
									setFormData({ ...formData, description: e.target.value })
								}
								className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#ff5b5b] focus:border-[#ff5b5b] text-gray-900"
								placeholder={t('owner.salonInfo.descriptionPlaceholder')}
							/>
						</div>

						{/* Categories selection removed */}

						<div>
							<label className="block text-sm font-medium text-gray-700 mb-2">
								{t('owner.salonInfo.address')}
							</label>
							<button
								type="button"
								onClick={() => setShowAddressModal(true)}
								className="w-full px-3 py-2 border border-gray-300 rounded-md text-left text-gray-900 bg-white hover:border-[#ff5b5b] focus:outline-none focus:ring-2 focus:ring-[#ff5b5b] focus:border-[#ff5b5b] flex items-center justify-between"
							>
								<span
									className={
										formData.address ? 'text-gray-900' : 'text-gray-500'
									}
								>
									{formData.address ||
										t('owner.salonInfo.addressPlaceholder') ||
										'Выберите адрес'}
								</span>
								<MapPin className="w-5 h-5 text-gray-400" />
							</button>
							{showAddressModal && (
								<AddressSelectModal
									isOpen={showAddressModal}
									onClose={() => setShowAddressModal(false)}
									value={formData.address}
									initialLat={selectedCoords?.lat}
									initialLon={selectedCoords?.lon}
									onSelect={(address, lat, lon) => {
										setFormData({ ...formData, address });
										setSelectedCoords({ lat, lon });
										setShowAddressModal(false);
									}}
								/>
							)}
						</div>

						{/* Salon Link - only show if salon exists */}
						{hasExistingSalon && (
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-2">
									{t('owner.salonInfo.salonLink')}
								</label>
								<div className="space-y-2">
									<input
										type="text"
										value={salonUrl}
										readOnly
										className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-900 cursor-default text-sm"
										placeholder={t('owner.salonInfo.loadingSalonLink')}
									/>
									<div className="flex gap-2 mt-4">
										<button
											type="button"
											onClick={copyToClipboard}
											disabled={!salonUrl}
											className="flex-1 px-3 py-2 bg-gray-100 text-gray-700 rounded-md font-medium hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 flex items-center justify-center gap-2 text-sm"
											title={t('owner.salonInfo.copy')}
										>
											<Copy className="w-4 h-4" />
											{t('owner.salonInfo.copy')}
										</button>
										<button
											type="button"
											onClick={shareLink}
											disabled={!salonUrl}
											className="flex-1 px-3 py-2 bg-gray-100 text-gray-700 rounded-md font-medium hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 flex items-center justify-center gap-2 text-sm"
											title={t('owner.salonInfo.share')}
										>
											<Share2 className="w-4 h-4" />
											{t('owner.salonInfo.share')}
										</button>
										<button
											type="button"
											onClick={openQrModal}
											disabled={!salonUrl}
											className="flex-1 px-3 py-2 bg-gray-100 text-gray-700 rounded-md font-medium hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 flex items-center justify-center gap-2 text-sm"
										>
											<QrCode className="w-4 h-4" />
											{t('owner.salonInfo.qrCode') || 'QR Code'}
										</button>
									</div>
								</div>
							</div>
						)}
					</div>
				</div>

				{/* Contact Information Section */}
				<div className="bg-white border border-gray-200 rounded-lg p-3 md:p-6">
					<h2 className="text-xl md:text-2xl font-semibold text-gray-900 mb-4 md:mb-6">
						{t('owner.salonInfo.contactInformation')}
					</h2>

					<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-2">
								{t('owner.salonInfo.phoneNumber')}
							</label>
							<input
								type="tel"
								value={formData.phone}
								onChange={(e) =>
									setFormData({ ...formData, phone: e.target.value })
								}
								className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#ff5b5b] focus:border-[#ff5b5b] text-gray-900"
								placeholder={t('owner.salonInfo.phonePlaceholder')}
							/>
						</div>

						<div>
							<label className="block text-sm font-medium text-gray-700 mb-2">
								{t('owner.salonInfo.emailAddress')}
							</label>
							<input
								type="email"
								value={formData.email}
								onChange={(e) =>
									setFormData({ ...formData, email: e.target.value })
								}
								className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#ff5b5b] focus:border-[#ff5b5b] text-gray-900"
								placeholder={t('owner.salonInfo.emailPlaceholder')}
							/>
						</div>

						<div>
							<label className="block text-sm font-medium text-gray-700 mb-2">
								{t('owner.salonInfo.website')}
							</label>
							<input
								type="url"
								value={formData.website}
								onChange={(e) =>
									setFormData({ ...formData, website: e.target.value })
								}
								className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#ff5b5b] focus:border-[#ff5b5b] text-gray-900"
								placeholder={t('owner.salonInfo.websitePlaceholder')}
							/>
						</div>

						<div>
							<label className="block text-sm font-medium text-gray-700 mb-2">
								{t('owner.salonInfo.instagram')}
							</label>
							<input
								type="text"
								value={formData.instagram}
								onChange={(e) =>
									setFormData({ ...formData, instagram: e.target.value })
								}
								className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#ff5b5b] focus:border-[#ff5b5b] text-gray-900"
								placeholder={t('owner.salonInfo.instagramPlaceholder')}
							/>
						</div>
					</div>
				</div>

				{/* Logo Section */}
				<div className="bg-white border border-gray-200 rounded-lg p-3 md:p-6">
					<h2 className="text-xl md:text-2xl font-semibold text-gray-900 mb-4 md:mb-6">
						{t('owner.salonInfo.salonLogo')}
					</h2>

					<div>
						<label className="block text-sm font-medium text-gray-700 mb-2">
							{t('owner.salonInfo.salonLogo')}
						</label>
						<Suspense fallback={<LoadingSpinner />}>
							<EnhancedFileUpload
								onUpload={(filePath) =>
									setFormData({ ...formData, logo: filePath })
								}
								onRemove={() => setFormData({ ...formData, logo: '' })}
								currentFile={formData.logo}
								accept="image/*"
								maxSize={2}
								placeholder={t('owner.salonInfo.logoPlaceholder')}
								disabled={loading}
							/>
						</Suspense>
					</div>
				</div>

				{/* Salon Photos Section */}
				<div className="bg-white border border-gray-200 rounded-lg p-3 md:p-6">
					<h2 className="text-xl md:text-2xl font-semibold text-gray-900 mb-4 md:mb-6">
						{t('owner.salonInfo.salonPhotos')}
					</h2>

					<div>
						<label className="block text-sm font-medium text-gray-700 mb-2">
							{t('owner.salonInfo.photosLabel')}
						</label>
						<Suspense fallback={<LoadingSpinner />}>
							<EnhancedPhotoUpload
								photos={formData.photos}
								onPhotosChange={(photos) =>
									setFormData({ ...formData, photos })
								}
								maxPhotos={3}
								maxSize={2}
								disabled={loading}
							/>
						</Suspense>
					</div>
				</div>

				{/* Operating Hours Section */}
				<div className="bg-white border border-gray-200 rounded-lg p-3 md:p-6">
					<h2 className="text-xl md:text-2xl font-semibold text-gray-900 mb-4 md:mb-6 flex items-center gap-2">
						{t('owner.salonInfo.operatingHours')}
					</h2>
					<Suspense fallback={<LoadingSpinner />}>
						<WorkingHoursSection
							workingHours={formData.operatingHours}
							onChange={(workingHours) =>
								setFormData({ ...formData, operatingHours: workingHours })
							}
						/>
					</Suspense>
				</div>

				{/* Reminder Settings Section */}
				<div className="bg-white border border-gray-200 rounded-lg p-3 md:p-6">
					<h2 className="text-xl md:text-2xl font-semibold text-gray-900 mb-4 md:mb-6">
						{t('owner.salonInfo.reminderSettings') ||
							'Booking Reminder Settings'}
					</h2>
					<p className="text-sm text-gray-600 mb-4">
						{t('owner.salonInfo.reminderSettingsDescription') ||
							'Select when to send reminder notifications to clients before their appointments. At least one option must be selected.'}
					</p>
					<div className="space-y-3">
						{/* 3 hours option */}
						<label className="flex items-center space-x-3 cursor-pointer group">
							<input
								type="checkbox"
								checked={formData.reminderSettings.intervals.includes(3)}
								onChange={(e) => {
									const intervals = formData.reminderSettings.intervals;
									if (e.target.checked) {
										setFormData({
											...formData,
											reminderSettings: {
												intervals: [...intervals, 3].sort((a, b) => b - a),
											},
										});
									} else {
										// Prevent removing if it's the only option
										if (intervals.length > 1) {
											setFormData({
												...formData,
												reminderSettings: {
													intervals: intervals.filter((i) => i !== 3),
												},
											});
										}
									}
								}}
								disabled={
									formData.reminderSettings.intervals.length === 1 &&
									formData.reminderSettings.intervals.includes(3)
								}
								className="sr-only"
							/>
							<div
								className={`relative w-4 h-4 border-2 border-[#ff5b5b] rounded flex items-center justify-center transition-colors ${
									formData.reminderSettings.intervals.includes(3)
										? 'bg-[#ff5b5b]'
										: 'bg-white'
								} ${formData.reminderSettings.intervals.length === 1 && formData.reminderSettings.intervals.includes(3) ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
							>
								{formData.reminderSettings.intervals.includes(3) && (
									<svg
										className="w-3 h-3 text-white"
										fill="none"
										stroke="currentColor"
										viewBox="0 0 24 24"
									>
										<path
											strokeLinecap="round"
											strokeLinejoin="round"
											strokeWidth={3}
											d="M5 13l4 4L19 7"
										/>
									</svg>
								)}
							</div>
							<span className="text-gray-700">
								{t('owner.salonInfo.reminder3Hours') || '3 hours before'}
							</span>
						</label>

						{/* 24 hours (1 day) option - default */}
						<label className="flex items-center space-x-3 cursor-pointer group">
							<input
								type="checkbox"
								checked={formData.reminderSettings.intervals.includes(24)}
								onChange={(e) => {
									const intervals = formData.reminderSettings.intervals;
									if (e.target.checked) {
										setFormData({
											...formData,
											reminderSettings: {
												intervals: [...intervals, 24].sort((a, b) => b - a),
											},
										});
									} else {
										// Prevent removing if it's the only option
										if (intervals.length > 1) {
											setFormData({
												...formData,
												reminderSettings: {
													intervals: intervals.filter((i) => i !== 24),
												},
											});
										}
									}
								}}
								disabled={
									formData.reminderSettings.intervals.length === 1 &&
									formData.reminderSettings.intervals.includes(24)
								}
								className="sr-only"
							/>
							<div
								className={`relative w-4 h-4 border-2 border-[#ff5b5b] rounded flex items-center justify-center transition-colors ${
									formData.reminderSettings.intervals.includes(24)
										? 'bg-[#ff5b5b]'
										: 'bg-white'
								} ${formData.reminderSettings.intervals.length === 1 && formData.reminderSettings.intervals.includes(24) ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
							>
								{formData.reminderSettings.intervals.includes(24) && (
									<svg
										className="w-3 h-3 text-white"
										fill="none"
										stroke="currentColor"
										viewBox="0 0 24 24"
									>
										<path
											strokeLinecap="round"
											strokeLinejoin="round"
											strokeWidth={3}
											d="M5 13l4 4L19 7"
										/>
									</svg>
								)}
							</div>
							<span className="text-gray-700 font-medium">
								{t('owner.salonInfo.reminder1Day') || '1 day (24 hours) before'}{' '}
								({t('owner.salonInfo.default') || 'Default'})
							</span>
						</label>

						{/* 168 hours (1 week) option */}
						<label className="flex items-center space-x-3 cursor-pointer group">
							<input
								type="checkbox"
								checked={formData.reminderSettings.intervals.includes(168)}
								onChange={(e) => {
									const intervals = formData.reminderSettings.intervals;
									if (e.target.checked) {
										setFormData({
											...formData,
											reminderSettings: {
												intervals: [...intervals, 168].sort((a, b) => b - a),
											},
										});
									} else {
										// Prevent removing if it's the only option
										if (intervals.length > 1) {
											setFormData({
												...formData,
												reminderSettings: {
													intervals: intervals.filter((i) => i !== 168),
												},
											});
										}
									}
								}}
								disabled={
									formData.reminderSettings.intervals.length === 1 &&
									formData.reminderSettings.intervals.includes(168)
								}
								className="sr-only"
							/>
							<div
								className={`relative w-4 h-4 border-2 border-[#ff5b5b] rounded flex items-center justify-center transition-colors ${
									formData.reminderSettings.intervals.includes(168)
										? 'bg-[#ff5b5b]'
										: 'bg-white'
								} ${formData.reminderSettings.intervals.length === 1 && formData.reminderSettings.intervals.includes(168) ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
							>
								{formData.reminderSettings.intervals.includes(168) && (
									<svg
										className="w-3 h-3 text-white"
										fill="none"
										stroke="currentColor"
										viewBox="0 0 24 24"
									>
										<path
											strokeLinecap="round"
											strokeLinejoin="round"
											strokeWidth={3}
											d="M5 13l4 4L19 7"
										/>
									</svg>
								)}
							</div>
							<span className="text-gray-700">
								{t('owner.salonInfo.reminder1Week') ||
									'1 week (168 hours) before'}
							</span>
						</label>
					</div>
					{formData.reminderSettings.intervals.length === 0 && (
						<p className="mt-2 text-sm text-red-600">
							{t('owner.salonInfo.atLeastOneReminderRequired') ||
								'At least one reminder option must be selected'}
						</p>
					)}
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
									{t('owner.salonInfo.errorSaving')}
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
						className="w-full sm:w-auto bg-[#ff5b5b] text-white px-6 md:px-8 py-3 rounded-lg font-medium hover:bg-[#e04a4a] focus:outline-none focus:ring-2 focus:ring-[#ff5b5b] focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
					>
						{loading
							? hasExistingSalon
								? t('owner.salonInfo.updating')
								: t('owner.salonInfo.creating')
							: hasExistingSalon
								? t('owner.salonInfo.updateSalonInfo')
								: t('owner.salonInfo.addSalon')}
					</button>
				</div>
			</form>

			{/* Account Deletion Section */}
			<div className="mt-8 md:mt-12 bg-red-50 border border-red-200 rounded-lg p-3 md:p-6">
				<div className="flex items-start">
					<div className="flex-shrink-0">
						<svg
							className="h-6 w-6 text-red-400"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={2}
								d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
							/>
						</svg>
					</div>
					<div className="ml-3 flex-1">
						<h3 className="text-lg font-medium text-red-800">
							{t('owner.salonInfo.deleteAccount')}
						</h3>
						<div className="mt-2 text-sm text-red-700">
							<p className="mb-3">
								{t('owner.salonInfo.deleteAccountWarning')}
							</p>
							<ul className="list-disc list-inside space-y-1 mb-4">
								<li>{t('owner.salonInfo.deleteAccountWarning1')}</li>
								<li>{t('owner.salonInfo.deleteAccountWarning2')}</li>
								<li>{t('owner.salonInfo.deleteAccountWarning3')}</li>
								<li>{t('owner.salonInfo.deleteAccountWarning4')}</li>
								<li>{t('owner.salonInfo.deleteAccountWarning5')}</li>
							</ul>
							<p className="font-medium">
								{t('owner.salonInfo.deleteAccountIrreversible')}
							</p>
						</div>
						<div className="mt-4">
							<button
								type="button"
								onClick={() => setShowDeleteModal(true)}
								className="bg-red-600 !text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
							>
								{t('owner.salonInfo.deleteMyAccount')}
							</button>
						</div>
					</div>
				</div>
			</div>

			{/* QR Code Modal */}
			{showQrModal && (
				<div className="fixed inset-0 bg-black/40 overflow-y-auto h-full w-full z-50">
					<div className="relative top-10 md:top-20 mx-auto p-5 border w-[90vw] md:w-96 max-w-md shadow-lg rounded-md bg-white">
						<div className="mt-3 text-center">
							<div className="flex items-center justify-between mb-4">
								<h3 className="text-lg font-medium text-gray-900">
									{t('owner.salonInfo.qrCode') || 'QR Code'}
								</h3>
								<button
									type="button"
									onClick={() => setShowQrModal(false)}
									className="text-gray-400 hover:text-gray-600 transition-colors"
								>
									<X className="w-6 h-6" />
								</button>
							</div>
							<div className="mt-4 flex flex-col items-center">
								{qrCodeUrl ? (
									<div className="p-4 bg-white rounded-lg border border-gray-200">
										<img
											src={qrCodeUrl}
											alt={t('owner.salonInfo.salonQRCode') || 'Salon QR Code'}
											className="w-64 h-64"
										/>
									</div>
								) : (
									<div className="w-64 h-64 flex items-center justify-center bg-gray-100 rounded-lg">
										<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#ff5b5b]"></div>
									</div>
								)}
								<p className="mt-4 text-sm text-gray-600">
									{t('owner.salonInfo.qrCodeDescription') ||
										'Отсканируйте QR-код, чтобы открыть страницу салона'}
								</p>
							</div>
						</div>
					</div>
				</div>
			)}

			{/* Delete Confirmation Modal */}
			{showDeleteModal && (
				<div className="fixed inset-0 bg-black/40 overflow-y-auto h-full w-full z-50">
					<div className="relative top-10 md:top-20 mx-auto p-5 border w-[90vw] md:w-96 max-w-md shadow-lg rounded-md bg-white">
						<div className="mt-3 text-center">
							<div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
								<svg
									className="h-6 w-6 text-red-600"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={2}
										d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
									/>
								</svg>
							</div>
							<h3 className="text-lg font-medium text-gray-900 mt-4">
								{t('owner.salonInfo.areYouAbsolutelySure')}
							</h3>
							<div className="mt-2 px-2 md:px-7 py-3">
								<p className="text-sm text-gray-500">
									{t('owner.salonInfo.deleteAccountConfirmation')}
								</p>
							</div>
							<div className="flex flex-col sm:flex-row justify-center gap-3 sm:gap-4 mt-6">
								<button
									type="button"
									onClick={() => setShowDeleteModal(false)}
									className="bg-gray-300 text-gray-700 px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
								>
									{t('common.cancel')}
								</button>
								<button
									type="button"
									onClick={handleDeleteAccount}
									disabled={deleteLoading}
									className="bg-red-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
								>
									{deleteLoading
										? t('owner.salonInfo.deleting')
										: t('owner.salonInfo.yesDeleteAccount')}
								</button>
							</div>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
