'use client';

import React, { useRef, useState, useCallback, useEffect } from 'react';
import { Clock } from 'lucide-react';

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

	const filterButtons = [
		{ key: 'all', label: 'All' },
		{ key: 'morning', label: 'Morning' },
		{ key: 'afternoon', label: 'Afternoon' },
		{ key: 'evening', label: 'Evening' },
	] as const;

	return (
		<div className="mb-6">
			<h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
				<Clock className="w-5 h-5" />
				Select a Time
			</h3>

			{/* Time Filter Buttons */}
			<div className="flex gap-2 mb-4">
				{filterButtons.map((filter) => (
					<button
						key={filter.key}
						onClick={() => onTimeFilterChange(filter.key)}
						className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
							timeFilter === filter.key
								? 'bg-[#ff5b5b] text-white'
								: 'bg-gray-100 text-gray-600 hover:bg-gray-200'
						}`}
					>
						{filter.label}
					</button>
				))}
			</div>

			{/* Time Slots */}
			{timeSlotsLoading ? (
				<div className="flex justify-center py-8">
					<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#ff5b5b]"></div>
				</div>
			) : (
				<div className="relative">
					{/* Scroll Navigation */}
					{canScrollLeft && (
						<button
							onClick={scrollTimeLeft}
							className="absolute left-0 top-1/2 transform -translate-y-1/2 z-10 w-8 h-8 bg-white rounded-full shadow-md flex items-center justify-center text-gray-600 hover:bg-gray-50"
						>
							←
						</button>
					)}

					{canScrollRight && (
						<button
							onClick={scrollTimeRight}
							className="absolute right-0 top-1/2 transform -translate-y-1/2 z-10 w-8 h-8 bg-white rounded-full shadow-md flex items-center justify-center text-gray-600 hover:bg-gray-50"
						>
							→
						</button>
					)}

					{/* Time Slots Container */}
					<div
						ref={timeScrollRef}
						className="flex overflow-x-auto scrollbar-hide gap-2 px-4 cursor-grab select-none"
						onMouseDown={handleMouseDown}
						onMouseLeave={handleMouseLeave}
						onMouseUp={handleMouseUp}
						onMouseMove={handleMouseMove}
						style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
					>
						{filteredTimeSlots.length > 0 ? (
							filteredTimeSlots.map((time) => {
								const available = isTimeSlotAvailable(time, selectedStaff);
								const isSelected = selectedTime === time;

								return (
									<button
										key={time}
										onClick={(e) => {
											if (available && !hasMoved) {
												onTimeSelect(time);
											}
										}}
										disabled={!available}
										className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex-shrink-0 ${
											!available
												? 'bg-gray-100 text-gray-400 cursor-not-allowed'
												: isSelected
													? 'bg-[#ff5b5b] text-white shadow-md'
													: 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50 hover:border-gray-300'
										}`}
									>
										{time}
									</button>
								);
							})
						) : (
							<div className="text-center py-8 text-gray-500 w-full">
								No available time slots for this date
							</div>
						)}
					</div>
				</div>
			)}
		</div>
	);
}


