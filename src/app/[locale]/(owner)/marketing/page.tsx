'use client';

import { useState, useEffect } from 'react';
import { useSalon } from '@/hooks/useSalon';
import { useSalonSlug } from '@/hooks/useSalonSlug';
import LoadingSpinner from '@/components/LoadingSpinner';
import toast from 'react-hot-toast';
import { apiClient } from '@/lib/api-client';
import { useTranslation } from '@/contexts/LanguageContext';

export default function MarketingPage() {
	const { t, language } = useTranslation();
	const { data: salon, isLoading } = useSalon();
	const { getSalonUrl } = useSalonSlug();
	const [salonUrl, setSalonUrl] = useState<string>('');
	const [qrCodeUrl, setQrCodeUrl] = useState<string>('');

	// Generate salon URL and QR code when salon data is loaded
	useEffect(() => {
		if (salon) {
			const baseUrl =
				process.env.NEXT_PUBLIC_FRONTEND_URL || 'https://henzo.app';
			const url = `${baseUrl}${getSalonUrl(salon)}`;
			setSalonUrl(url);

			// Generate QR code immediately
			const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(url)}`;
			setQrCodeUrl(qrApiUrl);
		}
	}, [salon, getSalonUrl]);

	const copyToClipboard = async () => {
		if (!salonUrl) {
			toast.error(t('owner.marketing.pleaseWaitForSalonData'));
			return;
		}

		try {
			await navigator.clipboard.writeText(salonUrl);
			toast.success(t('owner.marketing.linkCopied'));
		} catch (err) {
			toast.error(t('owner.marketing.failedToCopy'));
		}
	};

	const shareLink = async () => {
		if (!salonUrl) {
			toast.error(t('owner.marketing.pleaseWaitForSalonData'));
			return;
		}

		if (navigator.share) {
			try {
				await navigator.share({
					title: `${salon?.name || t('owner.marketing.title')} - ${t('common.bookNow')}`,
					text: `${t('common.checkOut') || 'Check out'} ${salon?.name || t('owner.marketing.title')} ${t('common.andBookAppointment') || 'and book your appointment!'}`,
					url: salonUrl,
				});
			} catch (err) {
				// User cancelled sharing or error occurred
				copyToClipboard(); // Fallback to copy
			}
		} else {
			// Fallback for browsers that don't support Web Share API
			copyToClipboard();
		}
	};

	const downloadQRCodePDF = async () => {
		try {
			// Get current language from context
			const currentLanguage = language || 'en';
			
			// Generate PDF using backend endpoint with language parameter
			const blob = await apiClient.get<Blob>(`/salons/current/qr-pdf?locale=${currentLanguage}`, {
				responseType: 'blob',
			});

			console.log('Received blob:', blob);
			console.log('Blob size:', blob.size);
			console.log('Blob type:', blob.type);

			if (!blob || blob.size === 0) {
				toast.error(t('owner.marketing.pdfGenerationFailed'));
				return;
			}

			// Ensure blob is valid PDF
			if (blob.type !== 'application/pdf' && blob.type !== '') {
				console.warn('Unexpected blob type:', blob.type);
			}

			// Create blob URL and open in new tab
			const url = URL.createObjectURL(blob);
			console.log('Created blob URL:', url);

			// Use the simplest and most reliable method
			window.open(url, '_blank');

			// Clean up after a delay to ensure the tab has loaded
			setTimeout(() => {
				URL.revokeObjectURL(url);
			}, 5000); // Increased timeout

			toast.success(t('owner.marketing.qrCodeOpened'));
		} catch (error) {
			console.error('Error generating PDF:', error);
			toast.error(t('owner.marketing.failedToGeneratePDF'));
		}
	};

	if (isLoading) {
		return (
			<div className="flex items-center justify-center min-h-[400px]">
				<LoadingSpinner />
			</div>
		);
	}

	return (
		<div className="px-4 sm:px-3 lg:px-8 max-w-7xl mx-auto">
			<div className="max-w-4xl mx-auto">
				{/* Header */}
				<div className="text-center mb-8 md:mb-12">
					<h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2 md:mb-4">
						{t('owner.marketing.title')}
					</h1>
					<p className="text-sm md:text-lg text-gray-600 px-4 md:px-0">
						{t('owner.marketing.subtitle')}
					</p>
				</div>

				{/* Main Content */}
				<div className="bg-white rounded-xl shadow-lg p-3 md:p-8">
					<div className="flex flex-col lg:flex-row gap-6 md:gap-8">
						{/* Left Side - Link and Actions */}
						<div className="flex-1 space-y-4 md:space-y-6">
							{/* Salon Link Display */}
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-3">
									{t('owner.marketing.salonLink')}
								</label>
								<div className="space-y-3">
									<input
										type="text"
										value={salonUrl}
										readOnly
										className="w-full px-3 md:px-4 py-2 md:py-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-900 cursor-default text-sm md:text-base"
										placeholder={t('owner.marketing.loadingSalonLink')}
									/>
									<div className="flex gap-3">
										<button
											onClick={copyToClipboard}
											disabled={!salonUrl}
											className="flex-1 px-3 md:px-4 py-2 md:py-3 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 flex items-center justify-center gap-2 text-sm md:text-base"
											title={t('owner.marketing.copy')}
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
													d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
												/>
											</svg>
											{t('owner.marketing.copy')}
										</button>
										<button
											onClick={shareLink}
											disabled={!salonUrl}
											className="flex-1 px-3 md:px-4 py-2 md:py-3 bg-[#ff5b5b] text-white rounded-lg font-medium hover:bg-[#e04a4a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-[#ff5b5b] focus:ring-offset-2 flex items-center justify-center gap-2 text-sm md:text-base"
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
													d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z"
												/>
											</svg>
											{t('owner.marketing.share')}
										</button>
									</div>
								</div>
							</div>

							{/* Instructions */}
							<div className="p-4 md:p-6 bg-blue-50 rounded-lg">
								<h3 className="text-base md:text-lg font-medium text-blue-900 mb-3">
									{t('owner.marketing.howToUse')}
								</h3>
								<ul className="space-y-2 text-sm md:text-base text-blue-800">
									<li>• {t('owner.marketing.copyLinkInstruction')}</li>
									<li>
										• {t('owner.marketing.shareButtonInstruction')}
									</li>
									<li>• {t('owner.marketing.downloadQRInstruction')}</li>
									<li>• {t('owner.marketing.scanInstruction')}</li>
								</ul>
							</div>
						</div>

						{/* Right Side - QR Code */}
						<div className="w-full lg:w-80 flex flex-col items-center space-y-4">
							<div className="text-center">
								<h3 className="text-base md:text-lg font-medium text-gray-900 mb-3">
									{t('owner.marketing.qrCode')}
								</h3>
								{qrCodeUrl ? (
									<div className="bg-white p-3 md:p-4 rounded-lg border-2 border-gray-200 inline-block">
										<img
											src={qrCodeUrl}
											alt={t('owner.marketing.salonQRCode')}
											className="w-28 h-28 md:w-32 md:h-32 mx-auto"
										/>
									</div>
								) : (
									<div className="bg-gray-100 p-3 md:p-4 rounded-lg border-2 border-gray-200 inline-block">
										<div className="w-28 h-28 md:w-32 md:h-32 bg-gray-200 rounded flex items-center justify-center">
											<svg
												className="w-6 h-6 md:w-8 md:h-8 text-gray-400"
												fill="none"
												stroke="currentColor"
												viewBox="0 0 24 24"
											>
												<path
													strokeLinecap="round"
													strokeLinejoin="round"
													strokeWidth={2}
													d="M12 4v16m8-8H4"
												/>
											</svg>
										</div>
										<p className="text-center text-xs text-gray-500 mt-2">
											{t('owner.marketing.loading')}
										</p>
									</div>
								)}
							</div>

							{/* Download Button */}
							<button
								onClick={downloadQRCodePDF}
								disabled={!qrCodeUrl}
								className="w-full md:w-auto flex items-center justify-center gap-2 px-4 md:px-6 py-2 md:py-3 bg-gray-800 text-white rounded-lg font-medium hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-gray-800 focus:ring-offset-2 text-sm md:text-base"
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
										d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
									/>
								</svg>
								{t('owner.marketing.downloadPDF')}
							</button>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
