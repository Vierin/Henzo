import { RefObject, useState } from 'react';
import dynamic from 'next/dynamic';
import { MapPin } from 'lucide-react';
import { SalonSetupData } from '@/hooks/useSalonSetup';

// Lazy load AddressSelectModal only when needed (not on initial render)
const AddressSelectModal = dynamic(
	() => import('@/components/AddressSelectModal'),
	{ ssr: false }
);

interface SetupStep1Props {
	formData: SalonSetupData;
	errors: { [key: string]: string };
	mapProps: { lat?: number; lon?: number; address: string };
	isUpdatingAddress: boolean;
	nameInputRef: RefObject<HTMLInputElement | null>;
	onInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
	onAddressSelect: (address: string, lat: number, lon: number) => void;
	t: (key: string) => string;
}

export default function SetupStep1({
	formData,
	errors,
	mapProps,
	isUpdatingAddress,
	nameInputRef,
	onInputChange,
	onAddressSelect,
	t,
}: SetupStep1Props) {
	const [showAddressModal, setShowAddressModal] = useState(false);

	return (
		<div className="space-y-6">
			{/* Salon Name */}
			<div className="relative">
				<label
					htmlFor="name"
					className="block text-sm font-medium text-gray-900 mb-2"
				>
					{t('business.completeSetup.step1.salonName')}
				</label>
				<input
					ref={nameInputRef}
					type="text"
					id="name"
					name="name"
					value={formData.name}
					onChange={onInputChange}
					className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:ring-2 bg-white focus:ring-[#F8F5F2] focus:border-transparent"
					placeholder={t('business.completeSetup.step1.salonNamePlaceholder')}
				/>
				{errors.name && (
					<p className="absolute -bottom-[1.4rem] right-0 text-sm text-red-400">
						{errors.name}
					</p>
				)}
			</div>

			{/* Salon Address */}
			<div className="relative">
				<label
					htmlFor="address"
					className="block text-sm font-medium text-gray-900 mb-2"
				>
					{t('business.completeSetup.step1.salonAddress')}
				</label>
				{/* Address button field (opens modal with map) */}
				<div className="relative">
					<button
						type="button"
						onClick={() => setShowAddressModal(true)}
						className="w-full px-4 py-3 border border-gray-300 rounded-lg text-left text-gray-900 bg-white hover:border-[#ff5b5b] focus:outline-none focus:ring-2 focus:ring-[#ff5b5b] focus:border-[#ff5b5b] flex items-center justify-between"
					>
						<span
							className={
								formData.address ? 'text-gray-900' : 'text-gray-500'
							}
						>
							{formData.address ||
								t('business.completeSetup.step1.selectSalonAddress') ||
								'Выберите адрес'}
						</span>
						<MapPin className="w-5 h-5 text-gray-400 flex-shrink-0 ml-2" />
					</button>
					{showAddressModal && (
						<AddressSelectModal
							isOpen={showAddressModal}
							onClose={() => setShowAddressModal(false)}
							value={formData.address}
							initialLat={mapProps.lat}
							initialLon={mapProps.lon}
							onSelect={(address: string, lat: number, lon: number) => {
								onAddressSelect(address, lat, lon);
								setShowAddressModal(false);
							}}
						/>
					)}
					{isUpdatingAddress && (
						<div className="absolute right-3 top-1/2 transform -translate-y-1/2">
							<div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-400"></div>
						</div>
					)}
				</div>
				{errors.address && (
					<p className="absolute -bottom-[1.4rem] right-0 text-sm text-red-400">
						{errors.address}
					</p>
				)}
			</div>
		</div>
	);
}

