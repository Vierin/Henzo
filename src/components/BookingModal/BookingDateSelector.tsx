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
	startDateIndex: number;
	onStartDateIndexChange: (index: number) => void;
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
	startDateIndex,
	onStartDateIndexChange,
}: BookingDateSelectorProps) {
	const t = useTranslation();
	const [hasMoved, setHasMoved] = useState(false);
	const [touchStart, setTouchStart] = useState<number | null>(null);
	const [touchEnd, setTouchEnd] = useState<number | null>(null);
	const [mouseStart, setMouseStart] = useState<number | null>(null);
	const [mouseEnd, setMouseEnd] = useState<number | null>(null);
	const [isMouseDragging, setIsMouseDragging] = useState(false);
	const minSwipeDistance = 50;
	const minDragDistance = 5;

	// Update scroll position based on startDateIndex
	useEffect(() => {
		const canGoLeft = startDateIndex > 0;
		const canGoRight = startDateIndex + 7 < dates.length;
		onScrollLeft(canGoLeft);
		onScrollRight(canGoRight);
	}, [startDateIndex, dates.length, onScrollLeft, onScrollRight]);

	const handleScrollLeftClick = useCallback(() => {
		// Show previous 7 days
		const prevIndex = Math.max(0, startDateIndex - 7);
		if (prevIndex >= 0) {
			onStartDateIndexChange(prevIndex);
		}
	}, [startDateIndex, onStartDateIndexChange]);

	const handleScrollRightClick = useCallback(() => {
		// Show next 7 days
		const nextIndex = Math.min(
			startDateIndex + 7,
			Math.max(0, dates.length - 7)
		);
		if (nextIndex >= 0 && nextIndex < dates.length) {
			onStartDateIndexChange(nextIndex);
			// Load more days if needed
			if (nextIndex + 7 > loadedDaysCount && !isLoadingMoreDays) {
				onLoadMoreDays();
			}
		}
	}, [
		startDateIndex,
		dates.length,
		loadedDaysCount,
		isLoadingMoreDays,
		onStartDateIndexChange,
		onLoadMoreDays,
	]);

	// Touch handlers for swipe (mobile)
	const onTouchStart = useCallback((e: React.TouchEvent) => {
		setTouchEnd(null);
		setTouchStart(e.targetTouches[0].clientX);
		setHasMoved(false);
	}, []);

	const onTouchMove = useCallback(
		(e: React.TouchEvent) => {
			if (!touchStart) return;
			const currentX = e.targetTouches[0].clientX;
			setTouchEnd(currentX);
			const distance = Math.abs(currentX - touchStart);
			// Mark as moved if moved more than threshold to prevent click
			if (distance > 15) {
				setHasMoved(true);
			}
		},
		[touchStart]
	);

	const onTouchEnd = useCallback(() => {
		if (!touchStart || touchEnd === null) {
			setTouchStart(null);
			setTouchEnd(null);
			setHasMoved(false);
			return;
		}

		const distance = touchStart - touchEnd;
		const isLeftSwipe = distance > minSwipeDistance;
		const isRightSwipe = distance < -minSwipeDistance;

		if (isLeftSwipe) {
			// Swipe left - show next 7 days
			handleScrollRightClick();
			setHasMoved(true);
		} else if (isRightSwipe) {
			// Swipe right - show previous 7 days
			handleScrollLeftClick();
			setHasMoved(true);
		}

		// Reset touch state after a short delay to allow click handler to check hasMoved
		setTimeout(() => {
			setTouchStart(null);
			setTouchEnd(null);
			setHasMoved(false);
		}, 100);
	}, [touchStart, touchEnd, handleScrollLeftClick, handleScrollRightClick]);

	// Mouse handlers for drag (desktop)
	const onMouseDown = useCallback((e: React.MouseEvent) => {
		setMouseStart(e.clientX);
		setMouseEnd(null);
		setIsMouseDragging(true);
		setHasMoved(false);
	}, []);

	const onMouseMove = useCallback(
		(e: React.MouseEvent) => {
			if (!isMouseDragging || mouseStart === null) return;
			setMouseEnd(e.clientX);
			const distance = Math.abs(e.clientX - mouseStart);
			// Only mark as moved if moved more than threshold
			if (distance > minDragDistance) {
				setHasMoved(true);
			}
		},
		[isMouseDragging, mouseStart]
	);

	const onMouseUp = useCallback(() => {
		if (mouseStart === null) {
			setIsMouseDragging(false);
			setMouseStart(null);
			setMouseEnd(null);
			setTimeout(() => setHasMoved(false), 100);
			return;
		}

		// Check if it was a drag (not just a click)
		if (mouseEnd !== null) {
			const distance = mouseStart - mouseEnd;
			const isLeftDrag = distance > minSwipeDistance;
			const isRightDrag = distance < -minSwipeDistance;

			if (isLeftDrag) {
				// Drag left - show next 7 days
				handleScrollRightClick();
				setHasMoved(true);
			} else if (isRightDrag) {
				// Drag right - show previous 7 days
				handleScrollLeftClick();
				setHasMoved(true);
			}
		}

		setIsMouseDragging(false);
		setMouseStart(null);
		setMouseEnd(null);
		// Reset hasMoved after a short delay to allow click events
		setTimeout(() => setHasMoved(false), 100);
	}, [mouseStart, mouseEnd, handleScrollLeftClick, handleScrollRightClick]);

	// Show only 7 days starting from startDateIndex
	const visibleDates = dates.slice(startDateIndex, startDateIndex + 7);

	return (
		<div className="mb-6 sm:mb-8">
			<div className="flex items-center justify-between mb-3 sm:mb-4">
				<h3 className="text-base sm:text-lg font-bold text-gray-900">
					{t.booking.selectDate}
				</h3>
				{/* Navigation Buttons - Right side of header */}
				<div className="flex items-center gap-2">
					<button
						onClick={handleScrollLeftClick}
						disabled={!canScrollLeft}
						className={`w-8 h-8 rounded-full shadow-md flex items-center justify-center transition-colors hidden sm:flex ${
							canScrollLeft
								? 'bg-white hover:bg-gray-50 border border-gray-200'
								: 'bg-gray-100 cursor-not-allowed border border-gray-200'
						}`}
					>
						<ChevronLeft
							className={`w-4 h-4 ${canScrollLeft ? 'text-gray-600' : 'text-gray-400'}`}
						/>
					</button>

					<button
						onClick={handleScrollRightClick}
						disabled={!canScrollRight}
						className={`w-8 h-8 rounded-full shadow-md flex items-center justify-center transition-colors hidden sm:flex ${
							canScrollRight
								? 'bg-white hover:bg-gray-50 border border-gray-200'
								: 'bg-gray-100 cursor-not-allowed border border-gray-200'
						}`}
					>
						<ChevronRight
							className={`w-4 h-4 ${canScrollRight ? 'text-gray-600' : 'text-gray-400'}`}
						/>
					</button>
				</div>
			</div>

			<div className="relative">
				{/* Date Pills Container - Show only 7 days */}
				<div
					onTouchStart={onTouchStart}
					onTouchMove={onTouchMove}
					onTouchEnd={onTouchEnd}
					onMouseDown={onMouseDown}
					onMouseMove={onMouseMove}
					onMouseUp={onMouseUp}
					onMouseLeave={onMouseUp}
					className="flex gap-2 justify-between w-full select-none"
					style={{ touchAction: 'pan-x' }}
				>
					{visibleDates.map((date, index) => {
						const isSelected = selectedDate === date.dateString;
						const actualIndex = startDateIndex + index;

						return (
							<button
								key={date.dateString}
								onClick={() => {
									if (!date.isClosed && !hasMoved) {
										onDateSelect(date.dateString);
										onDateIndexChange(actualIndex);
									}
								}}
								disabled={!!date.isClosed}
								className={`flex-1 flex flex-col items-center justify-center py-1 px-1 sm:py-3 sm:px-2 rounded-xl border-2 transition-all min-h-[50px] sm:min-h-[80px] ${
									date.isClosed
										? 'border-gray-200 bg-gray-50 text-gray-300 cursor-not-allowed'
										: isSelected
											? 'border-[#ff5b5b] bg-[#ff5b5b] !text-white shadow-lg'
											: 'border-gray-200 bg-white hover:border-[#ff5b5b] hover:shadow-md'
								}`}
							>
								<span
									className={`text-[10px] sm:text-xs font-medium mb-0.5 sm:mb-1 ${isSelected ? '!text-white' : 'text-gray-500'}`}
								>
									{date.dayName}
								</span>
								<span className="text-sm sm:text-lg md:text-2xl font-bold mb-0.5 sm:mb-1">
									{date.displayDate || date.day}
								</span>
								<span
									className={`text-[10px] sm:text-xs ${isSelected ? '!text-white/80' : 'text-gray-500'}`}
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
