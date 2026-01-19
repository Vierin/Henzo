import { RefObject } from 'react';
import dynamic from 'next/dynamic';
import MapboxAddressAutocomplete from '@/components/MapboxAddressAutocomplete';
import { SalonSetupData } from '@/hooks/useSalonSetup';

const MapComponentWithCoords = dynamic(
	() => import('@/components/MapComponentWithCoords'),
	{ ssr: false }
);

interface SetupStep1Props {
	formData: SalonSetupData;
	errors: { [key: string]: string };
	mapProps: { lat?: number; lon?: number; address: string };
	isUpdatingAddress: boolean;
	nameInputRef: RefObject<HTMLInputElement | null>;
	onInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
	onMarkerMove: (lat: number, lon: number, address?: string) => void;
	onAddressChange: (address: string) => void;
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
	onMarkerMove,
	onAddressChange,
	onAddressSelect,
	t,
}: SetupStep1Props) {
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
				{/* Map above address field */}
				{mapProps.lat && mapProps.lon ? (
					<div className="mb-4 w-full aspect-[4/3] rounded-lg overflow-hidden border border-gray-200 shadow-sm">
						<MapComponentWithCoords
							key={`${mapProps.lat}-${mapProps.lon}`}
							lat={mapProps.lat}
							lon={mapProps.lon}
							address={mapProps.address}
							height="100%"
							zoom={16}
							interactive={true}
							showPopup={false}
							editable={true}
							onMarkerMove={onMarkerMove}
							className="w-full h-full"
						/>
					</div>
				) : (
					<div className="mb-4 w-full aspect-[4/3] rounded-lg border border-gray-200 bg-gray-50 flex items-center justify-center">
						<p className="text-sm text-gray-400">
							{t('business.completeSetup.step1.selectAddressToSeeMap')}
						</p>
					</div>
				)}
				{/* Address input field below map */}
				<div className="relative">
					<MapboxAddressAutocomplete
						value={formData.address}
						onChange={onAddressChange}
						onAddressSelect={onAddressSelect}
						placeholder={t('business.completeSetup.step1.selectSalonAddress')}
						className="w-full h-13 px-4 py-3 rounded-lg text-gray-900 placeholder-gray-300 focus:ring-2 bg-white focus:ring-[#F8F5F2] focus:border-transparent"
						showIcon={false}
					/>
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

