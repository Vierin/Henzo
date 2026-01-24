'use client';

import { useState, useEffect, useRef, useCallback, useMemo, lazy, Suspense } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { toast } from 'react-hot-toast';
import LoadingSpinner from '@/components/LoadingSpinner';
import { useSalon } from '@/hooks/useSalons';
import { useSalonSlug } from '@/hooks/useSalonSlug';
import { apiClient } from '@/lib/api-client';
import { useTranslation } from '@/contexts/LanguageContext';

// Lazy load components only when needed
const WorkingHoursSection = lazy(
	() => import('@/components/WorkingHoursSection')
);

// Import optimized section components
import BasicDetailsSection from './components/BasicDetailsSection';
import ContactInfoSection from './components/ContactInfoSection';
import PhotosSection from './components/PhotosSection';
import ReminderSettingsSection from './components/ReminderSettingsSection';
import DeleteAccountSection from './components/DeleteAccountSection';
import QrCodeModal from './components/QrCodeModal';
import DeleteModal from './components/DeleteModal';

export default function SalonInfoClient() {
	const t = useTranslation();
	const router = useRouter();
	const { getSalonUrl } = useSalonSlug();
	const addressUpdateTimerRef = useRef<NodeJS.Timeout | null>(null);

	const [formData, setFormData] = useState({
		salonName: '',
		description: '',
		address: '',
		phone: '',
		email: '',
		website: '',
		instagram: '',
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
			intervals: [24] as number[],
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
	const [showQrModal, setShowQrModal] = useState(false);

	// Get salon data - show UI immediately, data loads in parallel
	const {
		data: salon,
		isLoading: initialLoading,
		error: salonError,
	} = useSalon();
	const hasExistingSalon = !!salon?.id;

	const pathname = usePathname();

	// Scroll to anchor on page load (e.g., from onboarding)
	useEffect(() => {
		if (typeof window !== 'undefined') {
			const hash = window.location.hash;
			if (hash === '#photos') {
				// Wait for page to render and DOM to be ready
				const scrollToPhotos = () => {
					const element = document.getElementById('photos');
					if (element) {
						// Use requestAnimationFrame to ensure DOM is ready
						requestAnimationFrame(() => {
							setTimeout(() => {
								element.scrollIntoView({ behavior: 'smooth', block: 'start' });
								// Clean up hash from URL after scrolling
								window.history.replaceState(null, '', window.location.pathname);
							}, 100);
						});
					} else {
						// Retry if element not found yet
						setTimeout(scrollToPhotos, 100);
					}
				};
				scrollToPhotos();
			}
		}
	}, [pathname]);

	// Memoize salon URL and QR code URL
	const { salonUrl, qrCodeUrl } = useMemo(() => {
		if (salon && hasExistingSalon) {
			const baseUrl =
				process.env.NEXT_PUBLIC_FRONTEND_URL || 'https://henzo.app';
			const url = `${baseUrl}${getSalonUrl(salon)}`;
			const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(url)}`;
			return { salonUrl: url, qrCodeUrl: qrApiUrl };
		}
		return { salonUrl: '', qrCodeUrl: '' };
	}, [salon, hasExistingSalon, getSalonUrl]);

	// Helper function to geocode address (memoized)
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

	// Fill form with salon data - optimized to run only when salon changes
	useEffect(() => {
		if (!salon) return;

		setFormData((prev) => ({
			...prev,
			salonName: salon.name || '',
			description: salon.description || '',
			address: salon.address || '',
			phone: salon.phone || '',
			email: salon.email || '',
			website: salon.website || '',
			instagram: salon.instagram || '',
			photos: salon.photos || [],
			reminderSettings: {
				intervals: ((salon as any).reminderSettings?.intervals || [24]).filter(
					(interval: number) => interval !== 168
				),
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
				: prev.operatingHours,
		}));

		// Set coordinates - geocode only if needed
		if (salon.latitude && salon.longitude) {
			setSelectedCoords({
				lat: salon.latitude,
				lon: salon.longitude,
			});
		} else if (salon.address && salon.address.trim()) {
			// Geocode in background, don't block UI
			geocodeAddress(salon.address.trim()).then((coords) => {
				if (coords) {
					setSelectedCoords(coords);
				}
			});
		}
	}, [salon, geocodeAddress]);

	// Cleanup timer on unmount
	useEffect(() => {
		return () => {
			if (addressUpdateTimerRef.current) {
				clearTimeout(addressUpdateTimerRef.current);
			}
		};
	}, []);

	// Handlers - memoized
	const handleFieldChange = useCallback((field: string, value: string) => {
		setFormData((prev) => ({ ...prev, [field]: value }));
	}, []);

	const handleAddressSelect = useCallback(
		(address: string, lat: number, lon: number) => {
			setFormData((prev) => ({ ...prev, address }));
			setSelectedCoords({ lat, lon });
		},
		[]
	);

	const handleReminderChange = useCallback((intervals: number[]) => {
		setFormData((prev) => ({
			...prev,
			reminderSettings: { intervals },
		}));
	}, []);

	const handleOperatingHoursChange = useCallback(
		(workingHours: typeof formData.operatingHours) => {
			setFormData((prev) => ({ ...prev, operatingHours: workingHours }));
		},
		[]
	);

	const copyToClipboard = useCallback(async () => {
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
	}, [salonUrl, t]);

	const shareLink = useCallback(async () => {
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
				if (err.name !== 'AbortError') {
					copyToClipboard();
				}
			}
		} else {
			copyToClipboard();
		}
	}, [salonUrl, salon, formData.salonName, t, copyToClipboard]);

	const openQrModal = useCallback(() => {
		if (!salonUrl) {
			toast.error(t('owner.salonInfo.pleaseWaitForSalonData'));
			return;
		}
		setShowQrModal(true);
	}, [salonUrl, t]);

	const handleSubmit = useCallback(
		async (e: React.FormEvent) => {
			e.preventDefault();
			setLoading(true);
			setError('');

			const actionText = hasExistingSalon
				? t('owner.salonInfo.updatingSalon')
				: t('owner.salonInfo.creatingSalon');
			const saveToast = toast.loading(actionText);

			try {
				if (!formData.salonName.trim()) {
					throw new Error(t('owner.salonInfo.salonNameRequired'));
				}

				if (!formData.address.trim()) {
					throw new Error(t('owner.salonInfo.addressRequired'));
				}

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
					photos: formData.photos,
					workingHours: formData.operatingHours,
					reminderSettings: formData.reminderSettings,
				};

				if (hasExistingSalon) {
					await apiClient.put('/salons/current', salonData);
					toast.success(t('owner.salonInfo.salonUpdated'), {
						id: saveToast,
					});
				} else {
					await apiClient.post('/salons/current', salonData);
					toast.success(t('owner.salonInfo.salonCreated'), { id: saveToast });
				}
			} catch (err: unknown) {
				const errorMessage =
					err instanceof Error
						? err.message
						: t('owner.salonInfo.failedToSave');
				setError(errorMessage);
				toast.error(errorMessage, {
					id: saveToast,
				});
			} finally {
				setLoading(false);
			}
		},
		[formData, selectedCoords, hasExistingSalon, t]
	);

	const handleDeleteAccount = useCallback(async () => {
		setDeleteLoading(true);
		try {
			await apiClient.delete('/auth/account');
			toast.success(t('owner.salonInfo.accountDeleted'));
			setTimeout(() => {
				window.location.href = '/';
			}, 2000);
		} catch (error: any) {
			console.error('Error deleting account:', error);
			toast.error(error.message || t('owner.salonInfo.failedToDelete'));
		} finally {
			setDeleteLoading(false);
		}
	}, [t]);

	// Show UI immediately, data loads in parallel
	return (
		<div className="px-4 md:px-8 py-6 w-full max-w-7xl mx-auto">
			<div className="text-center mb-8">
				<h1 className="text-2xl md:text-4xl font-bold text-gray-900 mb-2 md:mb-4">
					{t('owner.salonInfo.title')}
				</h1>
				<p className="text-sm md:text-lg text-gray-600 px-4 md:px-0">
					{t('owner.salonInfo.subtitle')}
				</p>
			</div>

			{/* Error Display */}
			{error && (
				<div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
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

			<form onSubmit={handleSubmit} className="space-y-6 md:space-y-8">
				<BasicDetailsSection
					formData={{
						salonName: formData.salonName,
						description: formData.description,
						address: formData.address,
					}}
					onChange={handleFieldChange}
					onAddressSelect={handleAddressSelect}
					selectedCoords={selectedCoords}
					salonUrl={salonUrl}
					hasExistingSalon={hasExistingSalon}
					onCopy={copyToClipboard}
					onShare={shareLink}
					onQrCode={openQrModal}
				/>

				<ContactInfoSection
					formData={{
						phone: formData.phone,
						email: formData.email,
						website: formData.website,
						instagram: formData.instagram,
					}}
					onChange={handleFieldChange}
				/>

				<PhotosSection
					photos={formData.photos}
					onPhotosChange={(photos) =>
						setFormData((prev) => ({ ...prev, photos }))
					}
					loading={loading}
				/>

				<div className="bg-white border border-gray-200 rounded-lg p-3 md:p-6">
					<h2 className="text-xl md:text-2xl font-semibold text-gray-900 mb-4 md:mb-6 flex items-center gap-2">
						{t('owner.salonInfo.operatingHours')}
					</h2>
					<Suspense fallback={<LoadingSpinner />}>
						<WorkingHoursSection
							workingHours={formData.operatingHours}
							onChange={handleOperatingHoursChange}
						/>
					</Suspense>
				</div>

				<ReminderSettingsSection
					intervals={formData.reminderSettings.intervals}
					onChange={handleReminderChange}
				/>

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

			<DeleteAccountSection onDeleteClick={() => setShowDeleteModal(true)} />

			<QrCodeModal
				isOpen={showQrModal}
				onClose={() => setShowQrModal(false)}
				qrCodeUrl={qrCodeUrl}
				salonUrl={salonUrl}
				onCopy={copyToClipboard}
			/>

			<DeleteModal
				isOpen={showDeleteModal}
				onClose={() => setShowDeleteModal(false)}
				onConfirm={handleDeleteAccount}
				isDeleting={deleteLoading}
			/>
		</div>
	);
}

