'use client';

import React, { useRef, useState, useCallback, useEffect, useMemo } from 'react';
import { Clock } from 'lucide-react';
import { useTranslation } from '@/contexts/LanguageContext';

interface BookingTimeSelectorProps {
	timeSlots: string[];
	filteredTimeSlots: string[];
	selectedTime: string;
	onTimeSelect: (time: string) => void;
	timeFilter: 'all' | 'morning' | 'afternoon' | 'evening';
	onTimeFilterChange: (
		filter: 'all' | 'morning' | 'afternoon' | 'evening'
	) => void;
	isTimeSlotAvailable: (timeSlot: string, selectedStaffId?: string) => boolean;
	selectedStaff?: string;
	timeSlotsLoading: boolean;
}

export default function BookingTimeSelector({
	timeSlots,
	filteredTimeSlots,
	selectedTime,
	onTimeSelect,
	timeFilter,
	onTimeFilterChange,
	isTimeSlotAvailable,
	selectedStaff,
	timeSlotsLoading,
}: BookingTimeSelectorProps) {
	const t = useTranslation();
	const timeScrollRef = useRef<HTMLDivElement>(null);
	const [isDragging, setIsDragging] = useState(false);
	const [startX, setStartX] = useState(0);
	const [scrollLeft, setScrollLeft] = useState(0);
	const [hasMoved, setHasMoved] = useState(false);
	const [canScrollLeft, setCanScrollLeft] = useState(false);
	const [canScrollRight, setCanScrollRight] = useState(false);

	const checkScrollPosition = useCallback(() => {
		if (timeScrollRef.current) {
			const { scrollLeft, scrollWidth, clientWidth } = timeScrollRef.current;
			setCanScrollLeft(scrollLeft > 10);
			setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
		}
	}, []);

	const scrollTimeLeft = useCallback(() => {
		if (timeScrollRef.current) {
			timeScrollRef.current.scrollBy({ left: -200, behavior: 'smooth' });
		}
	}, []);

	const scrollTimeRight = useCallback(() => {
		if (timeScrollRef.current) {
			timeScrollRef.current.scrollBy({ left: 200, behavior: 'smooth' });
		}
	}, []);

	const handleMouseDown = useCallback((e: React.MouseEvent) => {
		if (!timeScrollRef.current) return;
		setIsDragging(true);
		setHasMoved(false);
		setStartX(e.pageX - timeScrollRef.current.offsetLeft);
		setScrollLeft(timeScrollRef.current.scrollLeft);
	}, []);

	const handleMouseLeave = useCallback(() => {
		setIsDragging(false);
	}, []);

	const handleMouseUp = useCallback(() => {
		setIsDragging(false);
	}, []);

	const handleMouseMove = useCallback(
		(e: React.MouseEvent) => {
			if (!isDragging || !timeScrollRef.current) return;
			e.preventDefault();
			const x = e.pageX - timeScrollRef.current.offsetLeft;
			const walk = (x - startX) * 2;
			timeScrollRef.current.scrollLeft = scrollLeft - walk;
			setHasMoved(true);
		},
		[isDragging, startX, scrollLeft]
	);

	useEffect(() => {
		const scrollContainer = timeScrollRef.current;
		if (!scrollContainer) return;

		scrollContainer.addEventListener('scroll', checkScrollPosition);
		return () =>
			scrollContainer.removeEventListener('scroll', checkScrollPosition);
	}, [checkScrollPosition]);

	// Reset scroll position when time filter changes
	useEffect(() => {
		if (timeScrollRef.current) {
			timeScrollRef.current.scrollLeft = 0;
			checkScrollPosition();
		}
	}, [timeFilter, checkScrollPosition]);

	// Memoize availability checks to avoid recalculating on every render
	const availabilityMap = useMemo(() => {
		const map = new Map<string, boolean>();
		filteredTimeSlots.forEach((time) => {
			map.set(time, isTimeSlotAvailable(time, selectedStaff));
		});
		return map;
	}, [filteredTimeSlots, selectedStaff, isTimeSlotAvailable]);

	const filterButtons = [
		{ key: 'all', label: t.booking.timeFilters.all },
		{ key: 'morning', label: t.booking.timeFilters.morning },
		{ key: 'afternoon', label: t.booking.timeFilters.afternoon },
		{ key: 'evening', label: t.booking.timeFilters.evening },
	] as const;

	return (
		<div className="mt-10">
			<div className="flex items-center justify-between mb-2">
				<h3 className="text-base sm:text-lg font-bold text-gray-900">
					{t.booking.selectATime}
				</h3>
			</div>

			{/* Time Filters */}
			<div className="mb-4 sm:mb-6 flex justify-center">
				<div className="bg-gray-100 rounded-xl p-1 inline-flex w-full sm:w-auto">
					{filterButtons.map((filter) => (
						<button
							key={filter.key}
							onClick={() => onTimeFilterChange(filter.key)}
							className={`flex-1 sm:flex-none px-3 sm:px-6 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all ${
								timeFilter === filter.key
									? 'bg-white text-gray-900 shadow-sm'
									: 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
							}`}
						>
							{filter.label}
						</button>
					))}
				</div>
			</div>

			{/* Time Slots - Native Scroll */}
			{filteredTimeSlots.length > 0 ? (
				<div className="relative px-0 sm:px-8">
					{/* Navigation Buttons */}
					<button
						onClick={scrollTimeLeft}
						disabled={!canScrollLeft}
						className={`absolute left-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full shadow-md flex items-center justify-center transition-colors hidden sm:flex ${
							canScrollLeft
								? 'bg-white hover:bg-gray-50'
								: 'bg-gray-100 cursor-not-allowed'
						}`}
					>
						←
					</button>

					<button
						onClick={scrollTimeRight}
						disabled={!canScrollRight}
						className={`absolute right-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full shadow-md flex items-center justify-center transition-colors hidden sm:flex ${
							canScrollRight
								? 'bg-white hover:bg-gray-50'
								: 'bg-gray-100 cursor-not-allowed'
						}`}
					>
						→
					</button>

					{/* Time Slots Container */}
					<div
						ref={timeScrollRef}
						onMouseDown={handleMouseDown}
						onMouseLeave={handleMouseLeave}
						onMouseUp={handleMouseUp}
						onMouseMove={handleMouseMove}
						className="flex gap-2 overflow-x-auto scrollbar-hide cursor-grab select-none"
						style={{
							scrollbarWidth: 'none',
							msOverflowStyle: 'none',
						}}
					>
					{filteredTimeSlots.map((timeSlot) => {
						const time = timeSlot; // timeSlot теперь всегда string
						const available = availabilityMap.get(time) ?? true;
							const isSelected = selectedTime === time;

							return (
								<button
									key={time}
									onClick={(e) => {
										if (available && !hasMoved) {
											onTimeSelect(time);
										}
										e.stopPropagation();
									}}
									disabled={!available}
									className={`flex-shrink-0 px-4 py-3 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
										!available
											? 'bg-gray-100 text-gray-400 cursor-not-allowed'
											: isSelected
												? 'bg-[#ff5b5b] text-white'
												: 'bg-white text-gray-900 border border-gray-200 hover:bg-gray-50'
									}`}
								>
									{time}
								</button>
							);
						})}
					</div>
				</div>
			) : (
				<div className="flex justify-center items-center gap-2 py-2">
					<svg
						className="w-5 h-5 text-gray-500"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
					>
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth={1.5}
							d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
						/>
					</svg>
					<p className="text-sm text-gray-500">
						{t.booking.noAvailableSlotsWithSelection}
					</p>
				</div>
			)}
		</div>
	);
}










