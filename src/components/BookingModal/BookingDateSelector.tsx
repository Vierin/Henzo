'use client';

import React, { useRef, useState, useCallback, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useTranslation } from '@/contexts/LanguageContext';

interface DateInfo {
	dateString: string;
	displayDate?: string;
	displayMonth?: string;
	dayName: string;
	day?: number;
	monthShort?: string;
	isToday: boolean;
	isClosed: boolean;
}

interface BookingDateSelectorProps {
	dates: DateInfo[];
	selectedDate: string;
	onDateSelect: (date: string) => void;
	currentDateIndex: number;
	onDateIndexChange: (index: number) => void;
	loadedDaysCount: number;
	onLoadMoreDays: () => void;
	isLoadingMoreDays: boolean;
	canScrollLeft: boolean;
	canScrollRight: boolean;
	onScrollLeft: (canScroll: boolean) => void;
	onScrollRight: (canScroll: boolean) => void;
}

export default function BookingDateSelector({
	dates,
	selectedDate,
	onDateSelect,
	currentDateIndex,
	onDateIndexChange,
	loadedDaysCount,
	onLoadMoreDays,
	isLoadingMoreDays,
	canScrollLeft,
	canScrollRight,
	onScrollLeft,
	onScrollRight,
}: BookingDateSelectorProps) {
	const t = useTranslation();
	const dateScrollRef = useRef<HTMLDivElement>(null);
	const [isDragging, setIsDragging] = useState(false);
	const [startX, setStartX] = useState(0);
	const [scrollLeft, setScrollLeft] = useState(0);
	const [hasMoved, setHasMoved] = useState(false);

	const checkScrollPosition = useCallback(() => {
		if (dateScrollRef.current) {
			const { scrollLeft, scrollWidth, clientWidth } = dateScrollRef.current;
			onScrollLeft(scrollLeft > 10);
			onScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
		}
	}, [onScrollLeft, onScrollRight]);

	const handleMouseDown = useCallback((e: React.MouseEvent) => {
		if (!dateScrollRef.current) return;
		setIsDragging(true);
		setHasMoved(false);
		setStartX(e.pageX - dateScrollRef.current.offsetLeft);
		setScrollLeft(dateScrollRef.current.scrollLeft);
	}, []);

	const handleMouseLeave = useCallback(() => {
		setIsDragging(false);
	}, []);

	const handleMouseUp = useCallback(() => {
		setIsDragging(false);
	}, []);

	const handleMouseMove = useCallback(
		(e: React.MouseEvent) => {
			if (!isDragging || !dateScrollRef.current) return;
			e.preventDefault();
			const x = e.pageX - dateScrollRef.current.offsetLeft;
			const walk = (x - startX) * 2;
			dateScrollRef.current.scrollLeft = scrollLeft - walk;
			setHasMoved(true);
		},
		[isDragging, startX, scrollLeft]
	);

	useEffect(() => {
		const scrollContainer = dateScrollRef.current;
		if (!scrollContainer) return;

		scrollContainer.addEventListener('scroll', checkScrollPosition);
		return () =>
			scrollContainer.removeEventListener('scroll', checkScrollPosition);
	}, [checkScrollPosition]);

	const handleScrollLeftClick = useCallback(() => {
		if (dateScrollRef.current) {
			dateScrollRef.current.scrollBy({ left: -200, behavior: 'smooth' });
		}
	}, []);

	const handleScrollRightClick = useCallback(() => {
		if (dateScrollRef.current) {
			dateScrollRef.current.scrollBy({ left: 200, behavior: 'smooth' });
		}
	}, []);

	return (
		<div className="mb-6 sm:mb-8">
			<div className="flex items-center justify-between mb-3 sm:mb-4">
				<h3 className="text-base sm:text-lg font-bold text-gray-900">
					{t.booking.selectDate}
				</h3>
			</div>

			<div className="relative">
				{/* Navigation Buttons */}
				<button
					onClick={handleScrollLeftClick}
					disabled={!canScrollLeft}
					className={`absolute left-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full shadow-md flex items-center justify-center transition-colors hidden sm:flex ${
						canScrollLeft
							? 'bg-white hover:bg-gray-50'
							: 'bg-gray-100 cursor-not-allowed'
					}`}
				>
					<ChevronLeft
						className={`w-4 h-4 ${canScrollLeft ? 'text-gray-600' : 'text-gray-400'}`}
					/>
				</button>

				<button
					onClick={handleScrollRightClick}
					disabled={!canScrollRight}
					className={`absolute right-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full shadow-md flex items-center justify-center transition-colors hidden sm:flex ${
						canScrollRight
							? 'bg-white hover:bg-gray-50'
							: 'bg-gray-100 cursor-not-allowed'
					}`}
				>
					<ChevronRight
						className={`w-4 h-4 ${canScrollRight ? 'text-gray-600' : 'text-gray-400'}`}
					/>
				</button>

				{/* Date Pills Container */}
				<div
					ref={dateScrollRef}
					onMouseDown={handleMouseDown}
					onMouseLeave={handleMouseLeave}
					onMouseUp={handleMouseUp}
					onMouseMove={handleMouseMove}
					className="flex gap-2 overflow-x-auto scrollbar-hide scroll-smooth cursor-grab select-none px-8 sm:px-12"
					style={{
						scrollbarWidth: 'none',
						msOverflowStyle: 'none',
					}}
				>
					{dates.map((date, index) => {
						const isSelected = selectedDate === date.dateString;

						return (
							<button
								key={date.dateString}
								onClick={() => {
									if (!date.isClosed && !hasMoved) {
										onDateSelect(date.dateString);
										onDateIndexChange(index);
									}
								}}
								disabled={!!date.isClosed}
								className={`flex-shrink-0 flex flex-col items-center justify-center py-1 px-1 sm:py-3 sm:px-2 rounded-xl border-2 transition-all w-[50px] sm:w-[65px] md:w-[70px] min-h-[50px] sm:min-h-[80px] ${
									date.isClosed
										? 'border-gray-200 bg-gray-50 text-gray-300 cursor-not-allowed'
										: isSelected
											? 'border-[#ff5b5b] bg-[#ff5b5b] text-white shadow-lg'
											: 'border-gray-200 bg-white hover:border-[#ff5b5b] hover:shadow-md'
								}`}
							>
								<span
									className={`text-[10px] sm:text-xs font-medium mb-0.5 sm:mb-1 ${isSelected ? 'text-white' : 'text-gray-500'}`}
								>
									{date.dayName}
								</span>
								<span className="text-sm sm:text-lg md:text-2xl font-bold mb-0.5 sm:mb-1">
									{date.displayDate || date.day}
								</span>
								<span
									className={`text-[10px] sm:text-xs ${isSelected ? 'text-white/80' : 'text-gray-500'}`}
								>
									{date.displayMonth || date.monthShort}
								</span>
							</button>
						);
					})}
				</div>
			</div>

			{/* Load More Button */}
			{isLoadingMoreDays && (
				<div className="text-center py-2">
					<span className="text-sm text-gray-500">Loading more dates...</span>
				</div>
			)}
		</div>
	);
}
