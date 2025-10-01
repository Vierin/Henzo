'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Calendar, MapPin, Search, Clock } from 'lucide-react';

interface BooksySearchProps {
	className?: string;
}

const TIME_INTERVALS = [
	{ value: 'any', label: 'Any time' },
	{ value: 'morning', label: 'Morning (6:00 - 12:00)' },
	{ value: 'afternoon', label: 'Afternoon (12:00 - 18:00)' },
	{ value: 'evening', label: 'Evening (18:00 - 24:00)' },
];

export default function BooksySearch({ className = '' }: BooksySearchProps) {
	const router = useRouter();
	const [searchData, setSearchData] = useState({
		service: '',
		location: '',
		date: '',
		timeInterval: 'any',
	});
	const [showCalendar, setShowCalendar] = useState(false);
	const [showTimeIntervals, setShowTimeIntervals] = useState(false);
	const calendarRef = useRef<HTMLDivElement>(null);

	// Close calendar when clicking outside
	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (
				calendarRef.current &&
				!calendarRef.current.contains(event.target as Node)
			) {
				setShowCalendar(false);
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

	const handleDateSelect = (date: string) => {
		setSearchData((prev) => ({
			...prev,
			date,
		}));
		setShowCalendar(false);
		setShowTimeIntervals(true);
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
		if (searchData.date) params.set('date', searchData.date);
		if (searchData.timeInterval && searchData.timeInterval !== 'any') {
			params.set('time', searchData.timeInterval);
		}

		router.push(`/salons?${params.toString()}`);
	};

	const formatDate = (dateString: string) => {
		if (!dateString) return 'Select date';
		const date = new Date(dateString);
		return date.toLocaleDateString('en-US', {
			day: 'numeric',
			month: 'long',
			year: 'numeric',
		});
	};

	const generateCalendarDays = () => {
		const today = new Date();
		const currentMonth = today.getMonth();
		const currentYear = today.getFullYear();
		const firstDay = new Date(currentYear, currentMonth, 1);
		const lastDay = new Date(currentYear, currentMonth + 1, 0);
		const daysInMonth = lastDay.getDate();
		const startingDayOfWeek = firstDay.getDay();

		const days = [];

		// Add empty cells for days before the first day of the month
		for (let i = 0; i < startingDayOfWeek; i++) {
			days.push(<div key={`empty-${i}`} className="h-10"></div>);
		}

		// Add days of the month
		for (let day = 1; day <= daysInMonth; day++) {
			const dateString = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
			const isToday = day === today.getDate();
			const isSelected = searchData.date === dateString;
			const isPast =
				new Date(dateString) <
				new Date(today.getFullYear(), today.getMonth(), today.getDate());

			days.push(
				<button
					key={day}
					onClick={() => !isPast && handleDateSelect(dateString)}
					disabled={isPast}
					className={`h-10 w-10 rounded-full text-sm font-medium transition-colors ${
						isSelected
							? 'bg-[#ff5b5b] text-white'
							: isToday
								? 'bg-gray-100 text-gray-900'
								: isPast
									? 'text-gray-300 cursor-not-allowed'
									: 'text-gray-700 hover:bg-gray-100'
					}`}
				>
					{day}
				</button>
			);
		}

		return days;
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
					<div className="relative">
						<Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
						<button
							type="button"
							onClick={() => setShowCalendar(!showCalendar)}
							className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#ff5b5b] focus:border-transparent text-left text-gray-900 hover:bg-gray-50"
						>
							{formatDate(searchData.date)}
						</button>
					</div>

					{/* Calendar Modal */}
					{showCalendar && (
						<div
							ref={calendarRef}
							className="absolute top-full left-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg p-4 z-50 min-w-[300px]"
						>
							<div className="text-center mb-4">
								<h3 className="text-lg font-semibold text-gray-900">
									{new Date().toLocaleDateString('en-US', {
										month: 'long',
										year: 'numeric',
									})}
								</h3>
							</div>
							<div className="grid grid-cols-7 gap-1 mb-2">
								{['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(
									(day) => (
										<div
											key={day}
											className="h-10 flex items-center justify-center text-sm font-medium text-gray-500"
										>
											{day}
										</div>
									)
								)}
							</div>
							<div className="grid grid-cols-7 gap-1">
								{generateCalendarDays()}
							</div>
						</div>
					)}

					{/* Time Intervals Modal */}
					{showTimeIntervals && (
						<div
							ref={calendarRef}
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
