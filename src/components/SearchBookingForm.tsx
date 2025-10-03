'use client';

import { useState, useRef, useEffect } from 'react';
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
	const [activeTab, setActiveTab] = useState<'treatments' | 'salon'>(
		'treatments'
	);
	const [searchQuery, setSearchQuery] = useState('');
	const [selectedLocation, setSelectedLocation] = useState('');
	const [selectedDate, setSelectedDate] = useState<Date | null>(null);
	const [selectedTimeInterval, setSelectedTimeInterval] = useState<string>('');

	const handleSearch = () => {
		const params = new URLSearchParams();

		if (activeTab === 'treatments') {
			if (searchQuery) params.set('service', searchQuery);
			if (selectedLocation) params.set('location', selectedLocation);
			if (selectedDate)
				params.set('date', selectedDate.toISOString().split('T')[0]);
			if (selectedTimeInterval) params.set('time', selectedTimeInterval);
		} else {
			if (searchQuery) params.set('salon', searchQuery);
		}

		router.push(`/salons${params.toString() ? `?${params.toString()}` : ''}`);
	};

	const handleClearSearch = () => {
		setSearchQuery('');
	};

	return (
		<div
			className={`bg-white rounded-xl p-6 shadow-lg ${className}`}
			role="search"
			aria-label="Appointment booking form"
		>
			{/* Tabs */}
			<div className="flex mb-4">
				<button
					onClick={() => setActiveTab('treatments')}
					className={`flex items-center space-x-2 px-3 py-2 text-sm font-medium transition-colors ${
						activeTab === 'treatments'
							? 'border-b-2 border-[#ff5b5b] text-[#ff5b5b]'
							: 'text-gray-600 hover:text-gray-800'
					}`}
				>
					<svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
						<path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
					</svg>
					<span>Treatments</span>
				</button>
				<button
					onClick={() => setActiveTab('salon')}
					className={`flex items-center space-x-2 px-3 py-2 text-sm font-medium transition-colors ${
						activeTab === 'salon'
							? 'border-b-2 border-[#ff5b5b] text-[#ff5b5b]'
							: 'text-gray-600 hover:text-gray-800'
					}`}
				>
					<svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
						<path
							fillRule="evenodd"
							d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a1 1 0 110 2h-3a1 1 0 01-1-1v-6a1 1 0 00-1-1H9a1 1 0 00-1 1v6a1 1 0 01-1 1H4a1 1 0 110-2V4zm3 1h2v2H7V5zm2 4H7v2h2V9zm2-4h2v2h-2V5zm2 4h-2v2h2V9z"
							clipRule="evenodd"
						/>
					</svg>
					<span>Salon Name</span>
				</button>
			</div>

			{/* Input Fields */}
			<div className="space-y-3">
				{/* Search by treatment or salon */}
				<div className="relative h-13">
					{activeTab === 'treatments' ? (
						<ServiceAutocomplete
							value={searchQuery}
							onChange={setSearchQuery}
							placeholder="Search for treatments"
							className="w-full h-full text-sm py-3"
						/>
					) : (
						<>
							<input
								type="text"
								placeholder="Search for salon name"
								value={searchQuery}
								onChange={(e) => setSearchQuery(e.target.value)}
								className="w-full px-4 py-3 pl-12 pr-12 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff5b5b] focus:border-transparent text-gray-900 text-sm"
							/>
							<svg
								className="absolute left-4 top-3.5 h-5 w-5 text-gray-400"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
									d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
								/>
							</svg>
							{/* Clear button for salon search */}
							{searchQuery && (
								<button
									onClick={handleClearSearch}
									className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1 hover:bg-gray-100 rounded-full transition-colors"
									type="button"
								>
									<svg
										className="w-4 h-4 text-gray-400 hover:text-gray-600"
										fill="none"
										stroke="currentColor"
										viewBox="0 0 24 24"
									>
										<path
											strokeLinecap="round"
											strokeLinejoin="round"
											strokeWidth={2}
											d="M6 18L18 6M6 6l12 12"
										/>
									</svg>
								</button>
							)}
						</>
					)}
				</div>

				{/* Location Input - только для Treatments */}
				{activeTab === 'treatments' && (
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
				)}

				{/* Date and Time Picker - только для Treatments */}
				{activeTab === 'treatments' && (
					<DateTimePicker
						date={selectedDate}
						timeInterval={selectedTimeInterval}
						onDateChange={setSelectedDate}
						onTimeChange={setSelectedTimeInterval}
						placeholder="Select date and time"
						className="w-full h-13"
					/>
				)}
			</div>

			{/* Search Button */}
			<button
				onClick={handleSearch}
				className="w-full bg-[#ff5b5b] text-white py-3 rounded-lg font-medium hover:bg-[#e04a4a] transition-colors mt-4 text-sm"
			>
				Search
			</button>
		</div>
	);
}
