'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { MapPin, Search, Clock } from 'lucide-react';
import DatePicker from './DatePicker';
import { TIME_INTERVALS } from '@/constants/timeIntervals';

interface BooksySearchProps {
	className?: string;
}

export default function BooksySearch({ className = '' }: BooksySearchProps) {
	const router = useRouter();
	const [searchData, setSearchData] = useState({
		service: '',
		location: '',
		date: null as Date | null,
		timeInterval: 'any',
	});
	const [showTimeIntervals, setShowTimeIntervals] = useState(false);
	const timeIntervalsRef = useRef<HTMLDivElement>(null);

	// Close time intervals when clicking outside
	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (
				timeIntervalsRef.current &&
				!timeIntervalsRef.current.contains(event.target as Node)
			) {
				setShowTimeIntervals(false);
			}
		};

		document.addEventListener('mousedown', handleClickOutside);
		return () => {
			document.removeEventListener('mousedown', handleClickOutside);
		};
	}, []);

	const handleInputChange = (field: string, value: string) => {
		setSearchData((prev) => ({
			...prev,
			[field]: value,
		}));
	};

	const handleDateSelect = (date: Date | null) => {
		setSearchData((prev) => ({
			...prev,
			date,
		}));
		if (date) {
			setShowTimeIntervals(true);
		}
	};

	const handleTimeIntervalSelect = (interval: string) => {
		setSearchData((prev) => ({
			...prev,
			timeInterval: interval,
		}));
		setShowTimeIntervals(false);
	};

	const handleSearch = () => {
		const params = new URLSearchParams();

		if (searchData.service) params.set('service', searchData.service);
		if (searchData.location) params.set('location', searchData.location);
		if (searchData.date) {
			const dateString = searchData.date.toISOString().split('T')[0];
			params.set('date', dateString);
		}
		if (searchData.timeInterval && searchData.timeInterval !== 'any') {
			params.set('time', searchData.timeInterval);
		}

		router.push(`/salons?${params.toString()}`);
	};

	return (
		<div>
			<div className="flex flex-col lg:flex-row gap-4">
				{/* Service Input */}
				<div className="flex-1">
					<div className="relative">
						<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
						<input
							type="text"
							placeholder="Service name"
							value={searchData.service}
							onChange={(e) => handleInputChange('service', e.target.value)}
							className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#ff5b5b] focus:border-transparent text-gray-900"
						/>
					</div>
				</div>

				{/* Location Input */}
				<div className="flex-1">
					<div className="relative">
						<MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
						<input
							type="text"
							placeholder="Location"
							value={searchData.location}
							onChange={(e) => handleInputChange('location', e.target.value)}
							className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#ff5b5b] focus:border-transparent text-gray-900"
						/>
					</div>
				</div>

				{/* Date Input */}
				<div className="flex-1 relative">
					<DatePicker
						value={searchData.date}
						onChange={handleDateSelect}
						placeholder="Select date"
						className="w-full"
					/>

					{/* Time Intervals Modal */}
					{showTimeIntervals && (
						<div
							ref={timeIntervalsRef}
							className="absolute top-full left-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg p-4 z-50 min-w-[250px]"
						>
							<div className="text-center mb-3">
								<h3 className="text-lg font-semibold text-gray-900">Time</h3>
							</div>
							<div className="space-y-2">
								{TIME_INTERVALS.map((interval) => (
									<button
										key={interval.value}
										onClick={() => handleTimeIntervalSelect(interval.value)}
										className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
											searchData.timeInterval === interval.value
												? 'bg-[#ff5b5b] text-white'
												: 'hover:bg-gray-100 text-gray-700'
										}`}
									>
										<div className="flex items-center">
											<Clock className="w-4 h-4 mr-2" />
											{interval.label}
										</div>
									</button>
								))}
							</div>
						</div>
					)}
				</div>

				{/* Search Button */}
				<button
					onClick={handleSearch}
					className="bg-[#ff5b5b] text-white px-8 py-3 rounded-lg font-semibold hover:bg-[#e04a4a] transition-colors flex items-center justify-center"
				>
					<Search className="w-5 h-5 mr-2" />
					Search
				</button>
			</div>
		</div>
	);
}
