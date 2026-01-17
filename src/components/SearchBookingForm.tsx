'use client';

import { useState, useRef, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import AddressAutocomplete from './AddressAutocomplete';
import ServiceAutocomplete from './ServiceAutocomplete';
import DateTimePicker from './DateTimePicker';
import { useTranslation } from '@/contexts/LanguageContext';

interface SearchBookingFormProps {
	className?: string;
	inline?: boolean;
	onSearchSuccess?: () => void;
}

export default function SearchBookingForm({
	className = '',
	inline = false,
	onSearchSuccess,
}: SearchBookingFormProps) {
	const router = useRouter();
	const t = useTranslation();
	const [isPending, startTransition] = useTransition();
	const [searchQuery, setSearchQuery] = useState('');
	const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(
		null
	);
	const [selectedLocation, setSelectedLocation] = useState('');
	const [selectedDate, setSelectedDate] = useState<Date | null>(null);
	const [selectedTimeInterval, setSelectedTimeInterval] = useState<string>('');
	const [isLoading, setIsLoading] = useState(false);
	const [validationError, setValidationError] = useState<string>('');
	const [errorField, setErrorField] = useState<string>('');

	const clearValidation = () => {
		setValidationError('');
		setErrorField('');
	};

	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === 'Enter' && !isLoading) {
			e.preventDefault();
			handleSearch();
		}
	};

	const handleSearch = async () => {
		if (isLoading || isPending) return;
		// Clear previous validation errors
		clearValidation();

		// Validate that at least one of the first two fields is filled (search/category or location)
		// Date is optional
		if (
			!searchQuery.trim() &&
			!selectedLocation.trim() &&
			!selectedCategoryId
		) {
			setValidationError(t.common.search + ' / ' + t.salon.address);
			setErrorField('searchQuery'); // Focus on the first field (search)
			return;
		}

		setIsLoading(true);

		try {
			const params = new URLSearchParams();

			// Prefer category filter over plain text search
			if (selectedCategoryId) {
				params.set('category', String(selectedCategoryId));
			} else if (searchQuery.trim()) {
				params.set('search', searchQuery.trim());
			}
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
			
			// Use startTransition for smooth navigation
			startTransition(() => {
				router.push(finalUrl);
			});

			// Give navigation time to start (100-150ms) before closing modal
			// This ensures smooth transition and user sees loading state
			await new Promise(resolve => setTimeout(resolve, 150));
			
			// Close modal if callback provided (for mobile search)
			if (onSearchSuccess) {
				onSearchSuccess();
			}
		} catch (error) {
			console.error('Search error:', error);
			setValidationError('Error');
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
						<ServiceAutocomplete
							value={searchQuery}
							onChange={(value) => {
								setSearchQuery(value);
								// Reset selected category when user edits text
								setSelectedCategoryId(null);
								// Clear error when user starts typing
								if (errorField === 'searchQuery') {
									clearValidation();
								}
							}}
							onServiceSelect={(suggestion: any) => {
								// If user picks a category -> set categoryId and text
								if (suggestion?.type === 'category' && suggestion?.id) {
									setSelectedCategoryId(Number(suggestion.id));
									setSearchQuery(suggestion.name);
								}
							}}
							placeholder={t.homepage.searchPlaceholder}
							className={`h-full ${validationError && errorField === 'searchQuery' ? 'border-red-500 focus:ring-red-500' : ''}`}
							inline={true}
							onKeyDown={handleKeyDown}
						/>
					</div>

					{/* Location Input */}
					<div className="relative flex-1 min-w-0 h-10">
						<AddressAutocomplete
							value={selectedLocation}
							onChange={(value) => {
								setSelectedLocation(value);
								// Clear error when user starts typing
								if (errorField === 'location' || validationError) {
									clearValidation();
								}
							}}
							onAddressSelect={(address, lat, lon) => {
								setSelectedLocation(address);
								// Clear error when user selects address
								if (errorField === 'location' || validationError) {
									clearValidation();
								}
							}}
							placeholder={t.homepage.locationPlaceholder}
							className={`h-full ${validationError && errorField === 'location' ? 'border-red-500 focus:ring-red-500' : ''}`}
							inline={true}
							onKeyDown={handleKeyDown}
						/>
					</div>

					{/* Date and Time Picker */}
					<div className="relative flex-1 min-w-0 h-10">
						<DateTimePicker
							date={selectedDate}
							timeInterval={selectedTimeInterval}
							onDateChange={setSelectedDate}
							onTimeChange={setSelectedTimeInterval}
							placeholder={`${t.homepage.datePlaceholder} & ${t.homepage.timePlaceholder}`}
							className="h-full"
							inline={true}
						/>
					</div>

					{/* Search Button */}
					<button
						onClick={handleSearch}
						disabled={isLoading || isPending}
						className={`bg-[#ff5b5b] text-white px-6 py-2 h-10 rounded-lg font-medium transition-colors text-sm whitespace-nowrap flex-shrink-0 flex items-center justify-center gap-2 ${
							isLoading || isPending ? 'opacity-70 cursor-not-allowed' : 'hover:bg-[#e04a4a]'
						}`}
					>
						{isLoading || isPending ? (
							<>
								<div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
								{t.common.search + '...'}
							</>
						) : (
							t.navigation.salons
						)}
					</button>
				</div>
			</div>
		);
	}

	return (
		<div
			className={`bg-white rounded-xl p-0 pt-6 md:p-6 shadow-lg w-[420px] max-w-[460px] ${className}`}
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
					<ServiceAutocomplete
						value={searchQuery}
						onChange={(value) => {
							setSearchQuery(value);
							setSelectedCategoryId(null);
							// Clear error when user starts typing
							if (errorField === 'searchQuery') {
								clearValidation();
							}
						}}
						onServiceSelect={(suggestion: any) => {
							if (suggestion?.type === 'category' && suggestion?.id) {
								setSelectedCategoryId(Number(suggestion.id));
								setSearchQuery(suggestion.name);
							}
						}}
						placeholder={t.homepage.searchPlaceholder}
						className={`w-full h-full text-sm py-3 ${validationError && errorField === 'searchQuery' ? 'border-red-500 focus:ring-red-500' : ''}`}
						onKeyDown={handleKeyDown}
					/>
				</div>

				{/* Location Input */}
				<div className="relative h-13">
					<AddressAutocomplete
						value={selectedLocation}
						onChange={(value) => {
							setSelectedLocation(value);
							// Clear error when user starts typing
							if (errorField === 'location' || validationError) {
								clearValidation();
							}
						}}
						onAddressSelect={(address, lat, lon) => {
							setSelectedLocation(address);
							// Clear error when user selects address
							if (errorField === 'location' || validationError) {
								clearValidation();
							}
						}}
						placeholder={t.homepage.locationPlaceholder}
						className={`w-full h-full px-4 py-3 placeholder:text-gray-900 pl-12 pr-12 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff5b5b] focus:border-transparent text-gray-900 text-sm ${
							validationError && errorField === 'location'
								? 'border-red-500 focus:ring-red-500'
								: ''
						}`}
						onKeyDown={handleKeyDown}
					/>
				</div>

				{/* Date and Time Picker */}
				<DateTimePicker
					date={selectedDate}
					timeInterval={selectedTimeInterval}
					onDateChange={setSelectedDate}
					onTimeChange={setSelectedTimeInterval}
					placeholder={`${t.homepage.datePlaceholder} & ${t.homepage.timePlaceholder}`}
					className="w-full h-13"
				/>
			</div>

			{/* Search Button */}
			<button
				onClick={handleSearch}
				disabled={isLoading || isPending}
				className={`w-full bg-[#ff5b5b] text-white py-3 rounded-lg font-medium transition-colors mt-4 text-sm flex items-center justify-center gap-2 ${
					isLoading || isPending ? 'opacity-70 cursor-not-allowed' : 'hover:bg-[#e04a4a]'
				}`}
			>
				{isLoading || isPending ? (
					<>
						<div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
						{t.common.search + '...'}
					</>
				) : (
					t.navigation.salons
				)}
			</button>
		</div>
	);
}
