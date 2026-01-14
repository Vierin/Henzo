'use client';

import { useTranslation } from '@/contexts/LanguageContext';
// Optimized icon imports
import X from 'lucide-react/dist/esm/icons/x';
import Copy from 'lucide-react/dist/esm/icons/copy';

interface QrCodeModalProps {
	isOpen: boolean;
	onClose: () => void;
	qrCodeUrl: string;
	salonUrl: string;
	onCopy: () => void;
}

export default function QrCodeModal({
	isOpen,
	onClose,
	qrCodeUrl,
	salonUrl,
	onCopy,
}: QrCodeModalProps) {
	const t = useTranslation();

	if (!isOpen) return null;

	return (
		<div className="fixed inset-0 bg-black/40 overflow-y-auto h-full w-full z-50">
			<div className="relative top-10 md:top-20 mx-auto p-5 border w-[90vw] md:w-96 max-w-md shadow-lg rounded-md bg-white">
				<div className="mt-3 text-center">
					<div className="flex items-center justify-between mb-4">
						<h3 className="text-lg font-medium text-gray-900">
							{t('owner.salonInfo.qrCode') || 'QR Code'}
						</h3>
						<button
							type="button"
							onClick={onClose}
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
						<div className="mt-4 w-full">
							<button
								type="button"
								onClick={onCopy}
								className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-md text-sm font-medium hover:bg-gray-200 transition-colors flex items-center justify-center gap-2"
							>
								<Copy className="w-4 h-4" />
								{t('owner.salonInfo.copyLink') || 'Копировать ссылку'}
							</button>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}

