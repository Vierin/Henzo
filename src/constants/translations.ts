export interface Translations {
	// Common
	common: {
		loading: string;
		error: string;
		save: string;
		cancel: string;
		delete: string;
		edit: string;
		view: string;
		close: string;
		back: string;
		next: string;
		previous: string;
		search: string;
		filter: string;
		sort: string;
		all: string;
		none: string;
		yes: string;
		no: string;
	};

	// Navigation
	navigation: {
		home: string;
		salons: string;
		map: string;
		categories: string;
		about: string;
		contact: string;
		business: string;
		login: string;
		register: string;
		logout: string;
		profile: string;
		dashboard: string;
		bookings: string;
		services: string;
		staff: string;
		settings: string;
		help: string;
		support: string;
	};

	// Homepage
	homepage: {
		heroTitle: string;
		heroSubtitle: string;
		searchPlaceholder: string;
		locationPlaceholder: string;
		datePlaceholder: string;
		timePlaceholder: string;
		searchButton: string;
		featuredSalons: string;
		popularServices: string;
		howItWorks: string;
		howItWorksSubtitle: string;
		step1: string;
		step2: string;
		step3: string;
		step1Title: string;
		step2Title: string;
		step3Title: string;
		step1Description: string;
		step2Description: string;
		step3Description: string;
		whyChooseHenzo: string;
		whyChooseSubtitle: string;
		easyBooking: string;
		easyBookingDescription: string;
		flexibleScheduling: string;
		flexibleSchedulingDescription: string;
		trustedReviews: string;
		trustedReviewsDescription: string;
		salonOwner: string;
		salonOwnerSubtitle: string;
		learnMore: string;
	};

	// Salon
	salon: {
		rating: string;
		reviews: string;
		reviewsCount: string;
		services: string;
		workingHours: string;
		contact: string;
		bookNow: string;
		viewDetails: string;
		address: string;
		phone: string;
		website: string;
		instagram: string;
		description: string;
		photos: string;
		amenities: string;
		parking: string;
		wifi: string;
		airConditioning: string;
		wheelchairAccessible: string;
	};

	// Booking
	booking: {
		selectDate: string;
		selectTime: string;
		selectService: string;
		selectStaff: string;
		customerInfo: string;
		name: string;
		email: string;
		phone: string;
		notes: string;
		confirmBooking: string;
		bookingConfirmed: string;
		bookingError: string;
		noAvailableSlots: string;
		salonClosed: string;
	};

	// Forms
	forms: {
		required: string;
		invalidEmail: string;
		invalidPhone: string;
		passwordTooShort: string;
		passwordsDoNotMatch: string;
		termsAndConditions: string;
		privacyPolicy: string;
		agreeToTerms: string;
	};

	// Business
	business: {
		salonName: string;
		salonType: string;
		businessHours: string;
		monday: string;
		tuesday: string;
		wednesday: string;
		thursday: string;
		friday: string;
		saturday: string;
		sunday: string;
		closed: string;
		open: string;
		closedDay: string;
		completeSetup: string;
		salonInfo: string;
		branding: string;
		services: string;
		staff: string;
	};

	// Language selector
	language: {
		selectLanguage: string;
		vietnamese: string;
		english: string;
	};
}

export const translations: Record<string, Translations> = {
	vi: {
		// Common
		common: {
			loading: 'Đang tải...',
			error: 'Lỗi',
			save: 'Lưu',
			cancel: 'Hủy',
			delete: 'Xóa',
			edit: 'Chỉnh sửa',
			view: 'Xem',
			close: 'Đóng',
			back: 'Quay lại',
			next: 'Tiếp theo',
			previous: 'Trước',
			search: 'Tìm kiếm',
			filter: 'Lọc',
			sort: 'Sắp xếp',
			all: 'Tất cả',
			none: 'Không có',
			yes: 'Có',
			no: 'Không',
		},

		// Navigation
		navigation: {
			home: 'Trang chủ',
			salons: 'Salon',
			map: 'Bản đồ',
			categories: 'Danh mục',
			about: 'Giới thiệu',
			contact: 'Liên hệ',
			business: 'Doanh nghiệp',
			login: 'Đăng nhập',
			register: 'Đăng ký',
			logout: 'Đăng xuất',
			profile: 'Hồ sơ',
			dashboard: 'Bảng điều khiển',
			bookings: 'Đặt lịch',
			services: 'Dịch vụ',
			staff: 'Nhân viên',
			settings: 'Cài đặt',
			help: 'Trợ giúp',
			support: 'Hỗ trợ',
		},

		// Homepage
		homepage: {
			heroTitle:
				'Đặt lịch <span class="text-[#ff5b5b]">làm <br> đẹp</span> dễ dàng',
			heroSubtitle:
				'Tìm và đặt lịch tại các salon, spa, massage hàng đầu với chỉ vài cú click',
			searchPlaceholder: 'Tìm kiếm dịch vụ...',
			locationPlaceholder: 'Vị trí của bạn',
			datePlaceholder: 'Chọn ngày',
			timePlaceholder: 'Chọn giờ',
			searchButton: 'Tìm kiếm',
			featuredSalons: 'Salon nổi bật',
			popularServices: 'Dịch vụ phổ biến',
			howItWorks: 'Đặt lịch trong 3 bước đơn giản',
			howItWorksSubtitle:
				'Tìm và đặt lịch bệnh viện thẩm mỹ hoàn hảo chưa bao giờ dễ dàng đến thế',
			step1: '01',
			step2: '02',
			step3: '03',
			step1Title: 'Tìm kiếm & Khám phá',
			step2Title: 'Chọn & Đặt lịch',
			step3Title: 'Thư giãn & Tận hưởng',
			step1Description:
				'Nhập vị trí của bạn để tìm các salon gần đó với đánh giá đã xác minh và giá cả cạnh tranh.',
			step2Description:
				'Chọn dịch vụ, khung giờ và stylist yêu thích. Đặt lịch ngay lập tức chỉ với vài cú nhấp chuột.',
			step3Description:
				'Đến cuộc hẹn và tận hưởng trải nghiệm làm đẹp cao cấp. Đánh giá chuyến thăm của bạn sau đó.',
			whyChooseHenzo: 'Tại sao chọn Henzo?',
			whyChooseSubtitle:
				'Henzo giúp việc đặt lịch hẹn làm đẹp tiếp theo của bạn trở nên đơn giản và tiện lợi.',
			easyBooking: 'Đặt lịch dễ dàng',
			easyBookingDescription: 'Đặt lịch hẹn chỉ với vài cú nhấp chuột.',
			flexibleScheduling: 'Lịch trình linh hoạt',
			flexibleSchedulingDescription:
				'Tìm thời gian phù hợp với bạn, ngay cả phút cuối.',
			trustedReviews: 'Đánh giá đáng tin cậy',
			trustedReviewsDescription:
				'Đọc đánh giá từ các khách hàng khác để tìm salon tốt nhất.',
			salonOwner: 'Bạn là chủ salon?',
			salonOwnerSubtitle:
				'Tham gia Henzo và phát triển doanh nghiệp với nền tảng đặt lịch của chúng tôi',
			learnMore: 'Tìm hiểu thêm',
		},

		// Salon
		salon: {
			rating: 'Đánh giá',
			reviews: 'Đánh giá',
			reviewsCount: 'đánh giá',
			services: 'Dịch vụ',
			workingHours: 'Giờ làm việc',
			contact: 'Liên hệ',
			bookNow: 'Đặt lịch ngay',
			viewDetails: 'Xem chi tiết',
			address: 'Địa chỉ',
			phone: 'Điện thoại',
			website: 'Website',
			instagram: 'Instagram',
			description: 'Mô tả',
			photos: 'Hình ảnh',
			amenities: 'Tiện nghi',
			parking: 'Bãi đỗ xe',
			wifi: 'WiFi',
			airConditioning: 'Điều hòa',
			wheelchairAccessible: 'Xe lăn có thể tiếp cận',
		},

		// Booking
		booking: {
			selectDate: 'Chọn ngày',
			selectTime: 'Chọn giờ',
			selectService: 'Chọn dịch vụ',
			selectStaff: 'Chọn nhân viên',
			customerInfo: 'Thông tin khách hàng',
			name: 'Họ tên',
			email: 'Email',
			phone: 'Số điện thoại',
			notes: 'Ghi chú',
			confirmBooking: 'Xác nhận đặt lịch',
			bookingConfirmed: 'Đặt lịch thành công',
			bookingError: 'Lỗi khi đặt lịch',
			noAvailableSlots: 'Không có khung giờ trống',
			salonClosed: 'Salon đã đóng cửa',
		},

		// Forms
		forms: {
			required: 'Trường này là bắt buộc',
			invalidEmail: 'Email không hợp lệ',
			invalidPhone: 'Số điện thoại không hợp lệ',
			passwordTooShort: 'Mật khẩu quá ngắn',
			passwordsDoNotMatch: 'Mật khẩu không khớp',
			termsAndConditions: 'Điều khoản sử dụng',
			privacyPolicy: 'Chính sách bảo mật',
			agreeToTerms: 'Tôi đồng ý với điều khoản',
		},

		// Business
		business: {
			salonName: 'Tên salon',
			salonType: 'Loại salon',
			businessHours: 'Giờ làm việc',
			monday: 'Thứ 2',
			tuesday: 'Thứ 3',
			wednesday: 'Thứ 4',
			thursday: 'Thứ 5',
			friday: 'Thứ 6',
			saturday: 'Thứ 7',
			sunday: 'Chủ nhật',
			closed: 'Đóng cửa',
			open: 'Mở cửa',
			closedDay: 'Ngày nghỉ',
			completeSetup: 'Hoàn thành thiết lập',
			salonInfo: 'Thông tin salon',
			branding: 'Thương hiệu',
			services: 'Dịch vụ',
			staff: 'Nhân viên',
		},

		// Language selector
		language: {
			selectLanguage: 'Chọn ngôn ngữ',
			vietnamese: 'Tiếng Việt',
			english: 'English',
		},
	},

	en: {
		// Common
		common: {
			loading: 'Loading...',
			error: 'Error',
			save: 'Save',
			cancel: 'Cancel',
			delete: 'Delete',
			edit: 'Edit',
			view: 'View',
			close: 'Close',
			back: 'Back',
			next: 'Next',
			previous: 'Previous',
			search: 'Search',
			filter: 'Filter',
			sort: 'Sort',
			all: 'All',
			none: 'None',
			yes: 'Yes',
			no: 'No',
		},

		// Navigation
		navigation: {
			home: 'Home',
			salons: 'Salons',
			map: 'Map',
			categories: 'Categories',
			about: 'About',
			contact: 'Contact',
			business: 'Business',
			login: 'Login',
			register: 'Register',
			logout: 'Logout',
			profile: 'Profile',
			dashboard: 'Dashboard',
			bookings: 'Bookings',
			services: 'Services',
			staff: 'Staff',
			settings: 'Settings',
			help: 'Help',
			support: 'Support',
		},

		// Homepage
		homepage: {
			heroTitle:
				'Find Your <span class="text-[#ff5b5b]">Perfect <br> Beauty</span> Salon Nearby',
			heroSubtitle:
				'Book appointments at top-rated salons in your area. Compare prices, read reviews, and get pampered today.',
			searchPlaceholder: 'Search services...',
			locationPlaceholder: 'Your location',
			datePlaceholder: 'Select date',
			timePlaceholder: 'Select time',
			searchButton: 'Search',
			featuredSalons: 'Featured Salons',
			popularServices: 'Popular Services',
			howItWorks: 'Book in 3 Simple Steps',
			howItWorksSubtitle:
				'Finding and booking your perfect beauty appointment has never been easier',
			step1: '01',
			step2: '02',
			step3: '03',
			step1Title: 'Search & Discover',
			step2Title: 'Choose & Book',
			step3Title: 'Relax & Enjoy',
			step1Description:
				'Enter your location to find nearby salons with verified reviews and competitive pricing.',
			step2Description:
				'Select your preferred service, time slot, and stylist. Book instantly with just a few clicks.',
			step3Description:
				'Show up at your appointment and enjoy a premium beauty experience. Rate your visit after.',
			whyChooseHenzo: 'Why Choose Henzo?',
			whyChooseSubtitle:
				'Henzo makes booking your next beauty appointment simple and convenient.',
			easyBooking: 'Easy Booking',
			easyBookingDescription: 'Book appointments in just a few taps.',
			flexibleScheduling: 'Flexible Scheduling',
			flexibleSchedulingDescription:
				'Find a time that works for you, even last minute.',
			trustedReviews: 'Trusted Reviews',
			trustedReviewsDescription:
				'Read reviews from other clients to find the best salon.',
			salonOwner: 'Are you a salon owner?',
			salonOwnerSubtitle:
				'Join Henzo and grow your business with our booking platform',
			learnMore: 'Learn More',
		},

		// Salon
		salon: {
			rating: 'Rating',
			reviews: 'Reviews',
			reviewsCount: 'reviews',
			services: 'Services',
			workingHours: 'Working Hours',
			contact: 'Contact',
			bookNow: 'Book Now',
			viewDetails: 'View Details',
			address: 'Address',
			phone: 'Phone',
			website: 'Website',
			instagram: 'Instagram',
			description: 'Description',
			photos: 'Photos',
			amenities: 'Amenities',
			parking: 'Parking',
			wifi: 'WiFi',
			airConditioning: 'Air Conditioning',
			wheelchairAccessible: 'Wheelchair Accessible',
		},

		// Booking
		booking: {
			selectDate: 'Select Date',
			selectTime: 'Select Time',
			selectService: 'Select Service',
			selectStaff: 'Select Staff',
			customerInfo: 'Customer Information',
			name: 'Name',
			email: 'Email',
			phone: 'Phone',
			notes: 'Notes',
			confirmBooking: 'Confirm Booking',
			bookingConfirmed: 'Booking Confirmed',
			bookingError: 'Booking Error',
			noAvailableSlots: 'No Available Slots',
			salonClosed: 'Salon Closed',
		},

		// Forms
		forms: {
			required: 'This field is required',
			invalidEmail: 'Invalid email address',
			invalidPhone: 'Invalid phone number',
			passwordTooShort: 'Password too short',
			passwordsDoNotMatch: 'Passwords do not match',
			termsAndConditions: 'Terms and Conditions',
			privacyPolicy: 'Privacy Policy',
			agreeToTerms: 'I agree to the terms',
		},

		// Business
		business: {
			salonName: 'Salon Name',
			salonType: 'Salon Type',
			businessHours: 'Business Hours',
			monday: 'Monday',
			tuesday: 'Tuesday',
			wednesday: 'Wednesday',
			thursday: 'Thursday',
			friday: 'Friday',
			saturday: 'Saturday',
			sunday: 'Sunday',
			closed: 'Closed',
			open: 'Open',
			closedDay: 'Closed Day',
			completeSetup: 'Complete Setup',
			salonInfo: 'Salon Info',
			branding: 'Branding',
			services: 'Services',
			staff: 'Staff',
		},

		// Language selector
		language: {
			selectLanguage: 'Select Language',
			vietnamese: 'Tiếng Việt',
			english: 'English',
		},
	},
};
