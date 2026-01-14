'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { MapPin, Copy, Share2, QrCode } from 'lucide-react';
import { useTranslation } from '@/contexts/LanguageContext';

// Lazy load AddressSelectModal only when needed (not on initial render)
const AddressSelectModal = dynamic(
	() => import('@/components/AddressSelectModal'),
	{ ssr: false }
);

interface BasicDetailsSectionProps {
	formData: {
		salonName: string;
		description: string;
		address: string;
	};
	onChange: (field: string, value: string) => void;
	onAddressSelect: (address: string, lat: number, lon: number) => void;
	selectedCoords: { lat: number; lon: number } | null;
	salonUrl: string;
	hasExistingSalon: boolean;
	onCopy: () => void;
	onShare: () => void;
	onQrCode: () => void;
}

export default function BasicDetailsSection({
	formData,
	onChange,
	onAddressSelect,
	selectedCoords,
	salonUrl,
	hasExistingSalon,
	onCopy,
	onShare,
	onQrCode,
}: BasicDetailsSectionProps) {
	const t = useTranslation();
	const [showAddressModal, setShowAddressModal] = useState(false);

	return (
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
						onChange={(e) => onChange('salonName', e.target.value)}
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
						onChange={(e) => onChange('description', e.target.value)}
						className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#ff5b5b] focus:border-[#ff5b5b] text-gray-900"
						placeholder={t('owner.salonInfo.descriptionPlaceholder')}
					/>
				</div>

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
							onSelect={(address: string, lat: number, lon: number) => {
								onAddressSelect(address, lat, lon);
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
									onClick={onCopy}
									disabled={!salonUrl}
									className="flex-1 px-3 py-2 bg-gray-100 text-gray-700 rounded-md font-medium hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 flex items-center justify-center gap-2 text-sm"
									title={t('owner.salonInfo.copy')}
								>
									<Copy className="w-4 h-4" />
									{t('owner.salonInfo.copy')}
								</button>
								<button
									type="button"
									onClick={onShare}
									disabled={!salonUrl}
									className="flex-1 px-3 py-2 bg-gray-100 text-gray-700 rounded-md font-medium hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 flex items-center justify-center gap-2 text-sm"
									title={t('owner.salonInfo.share')}
								>
									<Share2 className="w-4 h-4" />
									{t('owner.salonInfo.share')}
								</button>
								<button
									type="button"
									onClick={onQrCode}
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
	);
}

