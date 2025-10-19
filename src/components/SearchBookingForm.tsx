'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import AddressAutocomplete from './AddressAutocomplete';
import ServiceAutocomplete from './ServiceAutocomplete';
import DateTimePicker from './DateTimePicker';

interface SearchBookingFormProps {
	className?: string;
	inline?: boolean;
}

export default function SearchBookingForm({
	className = '',
	inline = false,
}: SearchBookingFormProps) {
	const router = useRouter();
	const [searchQuery, setSearchQuery] = useState('');
	const [selectedLocation, setSelectedLocation] = useState('');
	const [selectedDate, setSelectedDate] = useState<Date | null>(null);
	const [selectedTimeInterval, setSelectedTimeInterval] = useState<string>('');
	const [isLoading, setIsLoading] = useState(false);
	const [validationError, setValidationError] = useState<string>('');
	const [errorField, setErrorField] = useState<string>('');

	const handleSearch = async () => {
		// Clear previous validation errors
		setValidationError('');
		setErrorField('');

		// Validate that at least one of the first two fields is filled (search or location)
		// Date is optional
		if (!searchQuery.trim() && !selectedLocation.trim()) {
			setValidationError('Please enter a search term or location');
			setErrorField('searchQuery'); // Focus on the first field (search)
			return;
		}

		setIsLoading(true);

		try {
			const params = new URLSearchParams();

			if (searchQuery.trim()) params.set('search', searchQuery.trim());
			if (selectedLocation.trim())
				params.set('location', selectedLocation.trim());
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
		} catch (error) {
			console.error('Search error:', error);
			setValidationError(
				'An error occurred while searching. Please try again.'
			);
		} finally {
			setIsLoading(false);
		}
	};

	if (inline) {
		return (
			<div
				className={`bg-white rounded-lg border border-gray-200 p-4 shadow-sm ${className}`}
				role="search"
				aria-label="Appointment booking form"
			>
				{/* Validation Error Message */}
				{validationError && (
					<div className="mb-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
						{validationError}
					</div>
				)}

				{/* Input Fields in Row - Desktop only */}
				<div className="flex gap-3 items-end">
					{/* Unified Search Field - Service, Category or Salon */}
					<div className="relative flex-1 min-w-0 h-10">
						{validationError && errorField === 'searchQuery' && (
							<div className="absolute -top-6 left-0 text-xs text-red-600">
								Please enter a search term
							</div>
						)}
						<ServiceAutocomplete
							value={searchQuery}
							onChange={(value) => {
								setSearchQuery(value);
								// Clear error when user starts typing
								if (errorField === 'searchQuery') {
									setValidationError('');
									setErrorField('');
								}
							}}
							placeholder="Search treatments, categories..."
							className={`h-full ${validationError && errorField === 'searchQuery' ? 'border-red-500 focus:ring-red-500' : ''}`}
							inline={true}
						/>
					</div>

					{/* Location Input */}
					<div className="relative flex-1 min-w-0 h-10">
						<AddressAutocomplete
							value={selectedLocation}
							onChange={(value) => {
								setSelectedLocation(value);
								// Clear error when user starts typing
								if (validationError) {
									setValidationError('');
									setErrorField('');
								}
							}}
							onAddressSelect={(address, lat, lon) => {
								setSelectedLocation(address);
								// Clear error when user selects address
								if (validationError) {
									setValidationError('');
									setErrorField('');
								}
							}}
							placeholder="Enter address"
							className={`h-full ${validationError && errorField === 'searchQuery' ? 'border-red-500 focus:ring-red-500' : ''}`}
							inline={true}
						/>
					</div>

					{/* Date and Time Picker */}
					<div className="relative flex-1 min-w-0 h-10">
						<DateTimePicker
							date={selectedDate}
							timeInterval={selectedTimeInterval}
							onDateChange={setSelectedDate}
							onTimeChange={setSelectedTimeInterval}
							placeholder="Select date and time"
							className="h-full"
							inline={true}
						/>
					</div>

					{/* Search Button */}
					<button
						onClick={handleSearch}
						disabled={isLoading}
						className={`bg-[#ff5b5b] text-white px-6 py-2 h-10 rounded-lg font-medium transition-colors text-sm whitespace-nowrap flex-shrink-0 flex items-center justify-center gap-2 ${
							isLoading ? 'opacity-70 cursor-not-allowed' : 'hover:bg-[#e04a4a]'
						}`}
					>
						{isLoading ? (
							<>
								<div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
								Searching...
							</>
						) : (
							'Find salon'
						)}
					</button>
				</div>
			</div>
		);
	}

	return (
		<div
			className={`bg-white rounded-xl p-6 shadow-lg max-w-[460px] ${className}`}
			role="search"
			aria-label="Appointment booking form"
		>
			{/* Validation Error Message */}
			{validationError && (
				<div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
					{validationError}
				</div>
			)}

			{/* Input Fields */}
			<div className="space-y-3">
				{/* Unified Search Field - Service, Category or Salon */}
				<div className="relative h-13">
					{validationError && errorField === 'searchQuery' && (
						<div className="absolute -top-6 left-0 text-xs text-red-600">
							Please enter a search term
						</div>
					)}
					<ServiceAutocomplete
						value={searchQuery}
						onChange={(value) => {
							setSearchQuery(value);
							// Clear error when user starts typing
							if (errorField === 'searchQuery') {
								setValidationError('');
								setErrorField('');
							}
						}}
						placeholder="Search for treatments, categories or salon name..."
						className={`w-full h-full text-sm py-3 ${validationError && errorField === 'searchQuery' ? 'border-red-500 focus:ring-red-500' : ''}`}
					/>
				</div>

				{/* Location Input */}
				<div className="relative h-13">
					<AddressAutocomplete
						value={selectedLocation}
						onChange={(value) => {
							setSelectedLocation(value);
							// Clear error when user starts typing
							if (validationError) {
								setValidationError('');
								setErrorField('');
							}
						}}
						onAddressSelect={(address, lat, lon) => {
							setSelectedLocation(address);
							// Clear error when user selects address
							if (validationError) {
								setValidationError('');
								setErrorField('');
							}
						}}
						placeholder="Enter address"
						className={`w-full h-full px-4 py-3 placeholder:text-gray-900 pl-12 pr-12 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff5b5b] focus:border-transparent text-gray-900 text-sm ${
							validationError && errorField === 'searchQuery'
								? 'border-red-500 focus:ring-red-500'
								: ''
						}`}
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
				disabled={isLoading}
				className={`w-full bg-[#ff5b5b] text-white py-3 rounded-lg font-medium transition-colors mt-4 text-sm flex items-center justify-center gap-2 ${
					isLoading ? 'opacity-70 cursor-not-allowed' : 'hover:bg-[#e04a4a]'
				}`}
			>
				{isLoading ? (
					<>
						<div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
						Searching...
					</>
				) : (
					'Find salon'
				)}
			</button>
		</div>
	);
}
