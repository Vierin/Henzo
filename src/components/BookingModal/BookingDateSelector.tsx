'use client';

import React, { useRef, useState, useCallback, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface DateInfo {
	dateString: string;
	displayDate: string;
	displayMonth: string;
	dayName: string;
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
		<div className="mb-6">
			<h3 className="text-lg font-semibold text-gray-900 mb-3">
				Select a Date
			</h3>

			{/* Date Navigation */}
			<div className="relative mb-4">
				<button
					onClick={handleScrollLeftClick}
					disabled={!canScrollLeft}
					className={`absolute left-0 top-1/2 transform -translate-y-1/2 z-10 w-8 h-8 bg-white rounded-full shadow-md flex items-center justify-center ${
						canScrollLeft
							? 'text-gray-600 hover:bg-gray-50'
							: 'text-gray-300 cursor-not-allowed'
					}`}
				>
					<ChevronLeft className="w-5 h-5" />
				</button>

				<button
					onClick={handleScrollRightClick}
					disabled={!canScrollRight}
					className={`absolute right-0 top-1/2 transform -translate-y-1/2 z-10 w-8 h-8 bg-white rounded-full shadow-md flex items-center justify-center ${
						canScrollRight
							? 'text-gray-600 hover:bg-gray-50'
							: 'text-gray-300 cursor-not-allowed'
					}`}
				>
					<ChevronRight className="w-5 h-5" />
				</button>

				{/* Date Scroller */}
				<div
					ref={dateScrollRef}
					className="flex overflow-x-auto scrollbar-hide gap-2 px-10 cursor-grab select-none"
					onMouseDown={handleMouseDown}
					onMouseLeave={handleMouseLeave}
					onMouseUp={handleMouseUp}
					onMouseMove={handleMouseMove}
					style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
				>
					{dates.map((date, index) => {
						const isSelected = selectedDate === date.dateString;

						return (
							<button
								key={date.dateString}
								onClick={(e) => {
									if (!date.isClosed && !hasMoved) {
										onDateSelect(date.dateString);
										onDateIndexChange(index);
									}
								}}
								disabled={date.isClosed}
								className={`flex flex-col items-center justify-center min-w-[70px] md:min-w-[80px] h-16 md:h-20 p-2 rounded-lg border transition-all duration-200 flex-shrink-0 ${
									date.isClosed
										? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
										: isSelected
											? 'bg-[#ff5b5b] text-white border-[#ff5b5b] shadow-md'
											: 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50 hover:border-gray-300'
								}`}
							>
								<span className="text-xs font-medium">{date.dayName}</span>
								<span className="text-sm md:text-base font-bold">
									{date.displayDate}
								</span>
								<span className="text-xs">{date.displayMonth}</span>
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
