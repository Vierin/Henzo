'use client';

import { useState, useEffect } from 'react';
import { useSalon } from '@/hooks/useSalon';
import { useSalonSlug } from '@/hooks/useSalonSlug';
import LoadingSpinner from '@/components/LoadingSpinner';
import toast from 'react-hot-toast';
import jsPDF from 'jspdf';

export default function MarketingPage() {
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
			toast.error('Please wait for salon data to load');
			return;
		}

		try {
			await navigator.clipboard.writeText(salonUrl);
			toast.success('Link copied to clipboard!');
		} catch (err) {
			toast.error('Failed to copy link');
		}
	};

	const shareLink = async () => {
		if (!salonUrl) {
			toast.error('Please wait for salon data to load');
			return;
		}

		if (navigator.share) {
			try {
				await navigator.share({
					title: `${salon?.name || 'Salon'} - Book Now`,
					text: `Check out ${salon?.name || 'this salon'} and book your appointment!`,
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
		if (!qrCodeUrl || !salonUrl) {
			toast.error('Please wait for QR code to load');
			return;
		}

		try {
			// Create new PDF document in A5 format (148 x 210 mm)
			const pdf = new jsPDF({
				orientation: 'portrait',
				unit: 'mm',
				format: 'a5',
			});

			// A5 dimensions: 148mm x 210mm
			const pageWidth = 148;
			const pageHeight = 210;

			// Set background color to light cream
			pdf.setFillColor(248, 245, 242); // #F8F5F2
			pdf.rect(0, 0, pageWidth, pageHeight, 'F');

			// Add Henzo logo from public folder
			const logoImg = new Image();
			logoImg.crossOrigin = 'anonymous';

			const loadLogoAndGenerate = () => {
				// Add logo at the top with proper aspect ratio
				try {
					// Get original logo dimensions to maintain aspect ratio
					const originalWidth = logoImg.naturalWidth || logoImg.width;
					const originalHeight = logoImg.naturalHeight || logoImg.height;

					// Set maximum width and calculate proportional height
					const maxLogoWidth = 40; // 40mm max width
					const aspectRatio = originalHeight / originalWidth;
					const logoWidth = maxLogoWidth;
					const logoHeight = logoWidth * aspectRatio;

					// Center the logo
					const logoX = (pageWidth - logoWidth) / 2;
					const logoY = 15;

					pdf.addImage(logoImg, 'PNG', logoX, logoY, logoWidth, logoHeight);
				} catch (error) {
					// Fallback to text if logo fails to load
					pdf.setFontSize(24);
					pdf.setTextColor(255, 91, 91); // #ff5b5b
					pdf.setFont('helvetica', 'bold');
					pdf.text('Henzo', pageWidth / 2, 30, { align: 'center' });
				}

				// Add subtitle
				pdf.setFontSize(12);
				pdf.setTextColor(75, 85, 99); // gray-600
				pdf.setFont('helvetica', 'normal');
				pdf.text('Book your visit through', pageWidth / 2, 45, {
					align: 'center',
				});
			};

			// Load logo
			logoImg.onload = loadLogoAndGenerate;
			logoImg.onerror = loadLogoAndGenerate; // Fallback if logo fails
			logoImg.src = '/logo.png';

			// Add QR code after logo loads
			const generateQRSection = () => {
				const qrSize = 60; // 60mm x 60mm QR code
				const qrX = (pageWidth - qrSize) / 2;
				const qrY = 65;

				// Load QR code image and add to PDF
				const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(salonUrl)}`;

				// Create image element to load QR code
				const qrImg = new Image();
				qrImg.crossOrigin = 'anonymous';

				qrImg.onload = () => {
					// Add QR code to PDF
					pdf.addImage(qrImg, 'PNG', qrX, qrY, qrSize, qrSize);

					// Add salon name below QR code
					const salonName = salon?.name || 'Our Salon';
					pdf.setFontSize(14);
					pdf.setTextColor(17, 24, 39); // gray-900
					pdf.setFont('helvetica', 'bold');
					pdf.text(salonName, pageWidth / 2, qrY + qrSize + 15, {
						align: 'center',
					});

					// Add instructions
					pdf.setFontSize(10);
					pdf.setTextColor(75, 85, 99); // gray-600
					pdf.setFont('helvetica', 'normal');
					pdf.text(
						'Scan this QR code with your phone camera',
						pageWidth / 2,
						qrY + qrSize + 30,
						{ align: 'center' }
					);
					pdf.text(
						'to book your appointment instantly',
						pageWidth / 2,
						qrY + qrSize + 40,
						{ align: 'center' }
					);

					// Add footer
					pdf.setFontSize(8);
					pdf.setTextColor(156, 163, 175); // gray-400
					pdf.text('Powered by Henzo', pageWidth / 2, pageHeight - 10, {
						align: 'center',
					});

					// Open PDF in new tab
					const pdfBlob = pdf.output('blob');
					const pdfUrl = URL.createObjectURL(pdfBlob);
					window.open(pdfUrl, '_blank');

					toast.success('QR Code brochure opened for download!');
				};

				qrImg.onerror = () => {
					toast.error('Failed to load QR code image');
				};

				qrImg.src = qrImageUrl;
			};

			// Generate QR section after a short delay to ensure logo is processed
			setTimeout(generateQRSection, 100);
		} catch (error) {
			console.error('Error generating PDF:', error);
			toast.error('Failed to generate PDF');
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
		<div className="px-0 sm:px-3 lg:px-8">
			<div className="max-w-4xl mx-auto">
				{/* Header */}
				<div className="text-center mb-8 md:mb-12">
					<h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2 md:mb-4">
						Marketing
					</h1>
					<p className="text-sm md:text-lg text-gray-600 px-4 md:px-0">
						Download or share a QR code for your salon's link for customers to
						scan to book an appointment
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
									Salon Link
								</label>
								<div className="space-y-3">
									<input
										type="text"
										value={salonUrl}
										readOnly
										className="w-full px-3 md:px-4 py-2 md:py-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-900 cursor-default text-sm md:text-base"
										placeholder="Loading salon link..."
									/>
									<div className="flex gap-3">
										<button
											onClick={copyToClipboard}
											disabled={!salonUrl}
											className="flex-1 px-3 md:px-4 py-2 md:py-3 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 flex items-center justify-center gap-2 text-sm md:text-base"
											title="Copy to clipboard"
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
											Copy
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
											Share
										</button>
									</div>
								</div>
							</div>

							{/* Instructions */}
							<div className="p-4 md:p-6 bg-blue-50 rounded-lg">
								<h3 className="text-base md:text-lg font-medium text-blue-900 mb-3">
									How to use:
								</h3>
								<ul className="space-y-2 text-sm md:text-base text-blue-800">
									<li>• Copy the link to share with customers</li>
									<li>
										• Use the Share button to send via social media or messaging
									</li>
									<li>• Download the QR code for print materials</li>
									<li>• Customers can scan or click to book appointments</li>
								</ul>
							</div>
						</div>

						{/* Right Side - QR Code */}
						<div className="w-full lg:w-80 flex flex-col items-center space-y-4">
							<div className="text-center">
								<h3 className="text-base md:text-lg font-medium text-gray-900 mb-3">
									QR Code
								</h3>
								{qrCodeUrl ? (
									<div className="bg-white p-3 md:p-4 rounded-lg border-2 border-gray-200 inline-block">
										<img
											src={qrCodeUrl}
											alt="Salon QR Code"
											className="w-28 h-28 md:w-32 md:h-32 mx-auto"
										/>
										<p className="text-center text-xs text-gray-600 mt-2 font-medium">
											{salon?.name || 'Salon'}
										</p>
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
											Loading...
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
								Download PDF
							</button>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
