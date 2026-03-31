import { useState, useRef, useEffect, useCallback } from 'react';

interface UseBookingScrollProps {
	isOpen: boolean;
	initialDaysCount?: number;
	loadMoreDaysCount?: number;
	onLoadMore?: () => void;
}

export function useBookingScroll({
	isOpen,
	initialDaysCount = 90,
	loadMoreDaysCount = 40,
	onLoadMore,
}: UseBookingScrollProps) {
	const [loadedDaysCount, setLoadedDaysCount] = useState(initialDaysCount);
	const [isLoadingMoreDays, setIsLoadingMoreDays] = useState(false);
	const [canScrollLeft, setCanScrollLeft] = useState(false);
	const [canScrollRight, setCanScrollRight] = useState(false);
	const [canScrollDateLeft, setCanScrollDateLeft] = useState(false);
	const [canScrollDateRight, setCanScrollDateRight] = useState(false);

	// Drag-to-scroll states for time scroll
	const [isDragging, setIsDragging] = useState(false);
	const [startX, setStartX] = useState(0);
	const [scrollLeft, setScrollLeft] = useState(0);
	const [hasMoved, setHasMoved] = useState(false);

	// Drag-to-scroll states for date scroll
	const [isDateDragging, setIsDateDragging] = useState(false);
	const [dateStartX, setDateStartX] = useState(0);
	const [dateScrollLeft, setDateScrollLeft] = useState(0);

	const timeScrollRef = useRef<HTMLDivElement>(null);
	const dateScrollRef = useRef<HTMLDivElement>(null);

	// Load more days when user scrolls to the end
	const loadMoreDays = useCallback(() => {
		if (isLoadingMoreDays) return;

		setIsLoadingMoreDays(true);
		setLoadedDaysCount((prev) => prev + loadMoreDaysCount);

		if (onLoadMore) {
			onLoadMore();
		}

		setTimeout(() => {
			setIsLoadingMoreDays(false);
		}, 1000);
	}, [isLoadingMoreDays, loadMoreDaysCount, onLoadMore]);

	// Check scroll position for navigation buttons
	const checkScrollPosition = useCallback(() => {
		if (timeScrollRef.current) {
			const { scrollLeft, scrollWidth, clientWidth } = timeScrollRef.current;
			setCanScrollLeft(scrollLeft > 0);
			setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 1);
		}
	}, []);

	const checkDateScrollPosition = useCallback(() => {
		if (dateScrollRef.current) {
			const { scrollLeft, scrollWidth, clientWidth } = dateScrollRef.current;
			setCanScrollDateLeft(scrollLeft > 0);
			setCanScrollDateRight(scrollLeft < scrollWidth - clientWidth - 1);
		}
	}, []);

	// Used by BookingDateSelector (index-based, no scroll ref): child reports canScroll state
	const onDateScrollLeftReport = useCallback((can: boolean) => setCanScrollDateLeft(can), []);
	const onDateScrollRightReport = useCallback((can: boolean) => setCanScrollDateRight(can), []);

	// Native scroll functions for time slots
	const scrollTimeLeft = useCallback(() => {
		if (timeScrollRef.current) {
			timeScrollRef.current.scrollBy({
				left: -200,
				behavior: 'smooth',
			});
			setTimeout(() => {
				checkScrollPosition();
			}, 300);
		}
	}, [checkScrollPosition]);

	const scrollTimeRight = useCallback(() => {
		if (timeScrollRef.current) {
			timeScrollRef.current.scrollBy({
				left: 200,
				behavior: 'smooth',
			});
			setTimeout(() => {
				checkScrollPosition();
			}, 300);
		}
	}, [checkScrollPosition]);

	// Date scroll functions
	const scrollDateLeft = useCallback(() => {
		if (dateScrollRef.current) {
			dateScrollRef.current.scrollBy({
				left: -200,
				behavior: 'smooth',
			});
			setTimeout(() => {
				checkDateScrollPosition();
			}, 300);
		}
	}, [checkDateScrollPosition]);

	const scrollDateRight = useCallback(() => {
		if (dateScrollRef.current) {
			dateScrollRef.current.scrollBy({
				left: 200,
				behavior: 'smooth',
			});
			setTimeout(() => {
				checkDateScrollPosition();
			}, 300);
		}
	}, [checkDateScrollPosition]);

	// Drag-to-scroll functions for desktop - time scroll
	const handleTimeMouseDown = useCallback((e: React.MouseEvent) => {
		if (!timeScrollRef.current) return;
		setIsDragging(true);
		setHasMoved(false);
		setStartX(e.pageX - timeScrollRef.current.offsetLeft);
		setScrollLeft(timeScrollRef.current.scrollLeft);
		timeScrollRef.current.style.cursor = 'grabbing';
		timeScrollRef.current.style.userSelect = 'none';
	}, []);

	const handleTimeMouseLeave = useCallback(() => {
		setIsDragging(false);
		setHasMoved(false);
		if (timeScrollRef.current) {
			timeScrollRef.current.style.cursor = 'grab';
			timeScrollRef.current.style.userSelect = 'auto';
		}
	}, []);

	const handleTimeMouseUp = useCallback(() => {
		setIsDragging(false);
		if (timeScrollRef.current) {
			timeScrollRef.current.style.cursor = 'grab';
			timeScrollRef.current.style.userSelect = 'auto';
		}
		checkScrollPosition();
		setTimeout(() => setHasMoved(false), 100);
	}, [checkScrollPosition]);

	const handleTimeMouseMove = useCallback(
		(e: React.MouseEvent) => {
			if (!isDragging || !timeScrollRef.current) return;
			e.preventDefault();
			const x = e.pageX - timeScrollRef.current.offsetLeft;
			const walk = (x - startX) * 2;
			timeScrollRef.current.scrollLeft = scrollLeft - walk;

			if (Math.abs(walk) > 5) {
				setHasMoved(true);
			}
		},
		[isDragging, startX, scrollLeft]
	);

	// Drag-to-scroll functions for date scroll
	const handleDateMouseDown = useCallback((e: React.MouseEvent) => {
		if (!dateScrollRef.current) return;
		setIsDateDragging(true);
		setDateStartX(e.pageX - dateScrollRef.current.offsetLeft);
		setDateScrollLeft(dateScrollRef.current.scrollLeft);
		dateScrollRef.current.style.cursor = 'grabbing';
		dateScrollRef.current.style.userSelect = 'none';
	}, []);

	const handleDateMouseLeave = useCallback(() => {
		setIsDateDragging(false);
		if (dateScrollRef.current) {
			dateScrollRef.current.style.cursor = 'grab';
			dateScrollRef.current.style.userSelect = 'auto';
		}
	}, []);

	const handleDateMouseUp = useCallback(() => {
		setIsDateDragging(false);
		if (dateScrollRef.current) {
			dateScrollRef.current.style.cursor = 'grab';
			dateScrollRef.current.style.userSelect = 'auto';
		}
		checkDateScrollPosition();
	}, [checkDateScrollPosition]);

	const handleDateMouseMove = useCallback(
		(e: React.MouseEvent) => {
			if (!isDateDragging || !dateScrollRef.current) return;
			e.preventDefault();
			const x = e.pageX - dateScrollRef.current.offsetLeft;
			const walk = (x - dateStartX) * 2;
			dateScrollRef.current.scrollLeft = dateScrollLeft - walk;

			// Check if we need to load more days
			const { scrollLeft, scrollWidth, clientWidth } = dateScrollRef.current;
			if (scrollLeft + clientWidth > scrollWidth - 200 && !isLoadingMoreDays) {
				loadMoreDays();
			}
		},
		[isDateDragging, dateStartX, dateScrollLeft, isLoadingMoreDays, loadMoreDays]
	);

	// Initialize scroll position when modal opens
	useEffect(() => {
		if (isOpen) {
			setTimeout(() => {
				checkScrollPosition();
				checkDateScrollPosition();
			}, 200);
		}
	}, [isOpen, checkScrollPosition, checkDateScrollPosition]);

	// Update scroll position when loadedDaysCount changes
	useEffect(() => {
		if (dateScrollRef.current) {
			setTimeout(() => {
				if (dateScrollRef.current) {
					checkDateScrollPosition();
				}
			}, 100);
		}
	}, [loadedDaysCount, checkDateScrollPosition]);

	return {
		// Refs
		timeScrollRef,
		dateScrollRef,

		// State
		loadedDaysCount,
		isLoadingMoreDays,
		canScrollLeft,
		canScrollRight,
		canScrollDateLeft,
		canScrollDateRight,
		isDragging,
		hasMoved,
		isDateDragging,

		// Actions
		loadMoreDays,
		scrollTimeLeft,
		scrollTimeRight,
		scrollDateLeft,
		scrollDateRight,
		checkScrollPosition,
		checkDateScrollPosition,
		onDateScrollLeftReport,
		onDateScrollRightReport,

		// Drag handlers - time
		handleTimeMouseDown,
		handleTimeMouseLeave,
		handleTimeMouseUp,
		handleTimeMouseMove,

		// Drag handlers - date
		handleDateMouseDown,
		handleDateMouseLeave,
		handleDateMouseUp,
		handleDateMouseMove,
	};
}

