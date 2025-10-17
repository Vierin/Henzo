'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AddressAutocomplete from './AddressAutocomplete';
import ServiceAutocomplete from './ServiceAutocomplete';
import DateTimePicker from './DateTimePicker';

interface SearchBookingFormProps {
	className?: string;
}

export default function SearchBookingForm({
	className = '',
}: SearchBookingFormProps) {
	const router = useRouter();
	const [searchQuery, setSearchQuery] = useState('');
	const [selectedLocation, setSelectedLocation] = useState('');
	const [selectedDate, setSelectedDate] = useState<Date | null>(null);
	const [selectedTimeInterval, setSelectedTimeInterval] = useState<string>('');


	const handleSearch = () => {
		const params = new URLSearchParams();

		if (searchQuery) params.set('search', searchQuery);
		if (selectedLocation) params.set('location', selectedLocation);
		if (selectedDate) {
			// Format date as YYYY-MM-DD in local timezone to avoid timezone issues
			const year = selectedDate.getFullYear();
			const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
			const day = String(selectedDate.getDate()).padStart(2, '0');
			const urlDate = `${year}-${month}-${day}`;
			params.set('date', urlDate);
		}
		if (selectedTimeInterval) params.set('time', selectedTimeInterval);

		const finalUrl = `/salons${params.toString() ? `?${params.toString()}` : ''}`;
		router.push(finalUrl);
	};

	return (
		<div
			className={`bg-white rounded-xl p-6 shadow-lg max-w-[460px] ${className}`}
			role="search"
			aria-label="Appointment booking form"
		>
			{/* Input Fields */}
			<div className="space-y-3">
				{/* Unified Search Field - Service, Category or Salon */}
				<div className="relative h-13">
					<ServiceAutocomplete
						value={searchQuery}
						onChange={setSearchQuery}
						placeholder="Search for treatments, categories or salon name..."
						className="w-full h-full text-sm py-3"
					/>
				</div>

				{/* Location Input */}
				<div className="relative h-13">
					<AddressAutocomplete
						value={selectedLocation}
						onChange={setSelectedLocation}
						onAddressSelect={(address, lat, lon) => {
							setSelectedLocation(address);
						}}
						placeholder="Enter address"
						className="w-full h-full px-4 py-3 placeholder:text-gray-900 pl-12 pr-12 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff5b5b] focus:border-transparent text-gray-900 text-sm"
					/>
				</div>

				{/* Date and Time Picker */}
				<DateTimePicker
					date={selectedDate}
					timeInterval={selectedTimeInterval}
					onDateChange={setSelectedDate}
					onTimeChange={setSelectedTimeInterval}
					placeholder="Select date and time"
					className="w-full h-13"
				/>
			</div>

			{/* Search Button */}
			<button
				onClick={handleSearch}
				className="w-full bg-[#ff5b5b] text-white py-3 rounded-lg font-medium hover:bg-[#e04a4a] transition-colors mt-4 text-sm"
			>
				Find salon
			</button>
		</div>
	);
}
