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
		useCurrentLocation: string;
		gettingLocation: string;
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
		topRatedTitle: string;
		topRatedSubtitle: string;
		popularCategories: string;
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
		onlineBooking: string;
		minutesShort: string;
		toBook: string;
		free: string;
		booking: string;
		seeAllSalons: string;
	};

	// Salon
	salon: {
		rating: string;
		reviews: string;
		reviewsCount: string;
		services: string;
		information: string;
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
		location: string;
		getDirections: string;
		daysShort: {
			mon: string;
			tue: string;
			wed: string;
			thu: string;
			fri: string;
			sat: string;
			sun: string;
		};
		closed: string;
		hoursNotSpecified: string;
		serviceSingular: string; // единственное число (1 услуга)
		servicePlural: string; // множественное число (2-4 услуги)
		serviceGenitive: string; // родительный падеж (5+ услуг) - только для русского
	};

	// Booking
	booking: {
		selectDate: string;
		selectTime: string;
		selectService: string;
		selectStaff: string;
		timeIntervals: {
			any: string;
			morning: string;
			afternoon: string;
			evening: string;
		};
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

	// Categories
	categories: {
		hairBarber: string;
		hairBarberDescription: string;
		massageSpa: string;
		massageSpaDescription: string;
		manicurePedicure: string;
		manicurePedicureDescription: string;
		cosmeticMedicine: string;
		cosmeticMedicineDescription: string;
		otherServices: string;
		otherServicesDescription: string;
	};

	// Header
	header: {
		profile: string;
		dashboard: string;
		logout: string;
		business: string;
		login: string;
	};

	// Footer
	footer: {
		allRightsReserved: string;
		aboutUs: string;
		contact: string;
		termsOfService: string;
		privacyPolicy: string;
	};

	// Cookie Banner
	cookieBanner: {
		message: string;
		acceptAll: string;
		decline: string;
	};

	// Auth
	auth: {
		signInTitle: string;
		signInSubtitle: string;
		signUpTitle: string;
		signUpSubtitle: string;
		emailAddress: string;
		password: string;
		rememberMe: string;
		forgotPassword: string;
		signIn: string;
		signUp: string;
		orContinueWith: string;
		dontHaveAccount: string;
		signUpAsClient: string;
		alreadyHaveAccount: string;
		areYouSalonOwner: string;
		registerBusinessAccount: string;
		fullName: string;
		phoneNumber: string;
		confirmPassword: string;
		createAccount: string;
		welcomeBack: string;
		registrationSuccessful: string;
		checkEmail: string;
		passwordsDoNotMatch: string;
		passwordTooShort: string;
		fillAllFields: string;
		registrationFailed: string;
		signInFailed: string;
		googleSignInFailed: string;
	};

	// Owner Panel
	owner: {
		dashboard: string;
		calendar: string;
		services: string;
		staff: string;
		marketing: string;
		settings: string;
		logOut: string;
		welcomeBack: string;
		businessOverview: string;
		totalRevenue: string;
		totalClients: string;
		bookings: string;
		completionRate: string;
		last7Days: string;
		last30Days: string;
		last1Year: string;
		newAppointment: string;
		upcomingBookings: string;
		noUpcomingBookings: string;
		noUpcomingBookingsNext7Days: string;
		loadingBookings: string;
		topSellingServices: string;
		noCompletedServices: string;
		additionalMetrics: string;
		noShowRate: string;
		missed: string;
		repeatClients: string;
		avgRevenuePerClient: string;
		perClient: string;
		vsLastMonth: string;
		client: string;
		service: string;
		date: string;
		time: string;
		status: string;
		actions: string;
		confirm: string;
		reject: string;
		edit: string;
		cancel: string;
		pending: string;
		confirmed: string;
		completed: string;
		cancelled: string;
		noShow: string;
		unassigned: string;
		unknownService: string;
		areYouSureCancel: string;
		markAsNoShow: string;
		areYouSureNoShow: string;
		bookingCancelled: string;
		bookingConfirmed: string;
		bookingRejected: string;
		bookingMarkedNoShow: string;
		failedToCancel: string;
		failedToConfirm: string;
		failedToReject: string;
		failedToMarkNoShow: string;
		bookingsList: string;
		all: string;
		searchBookings: string;
		noBookingsFound: string;
		noBookingsWithFilters: string;
		of: string;
		results: string;
		manageServices: string;
		addNew: string;
		addNewService: string;
		searchServices: string;
		search: string;
		searchByName: string;
		category: string;
		allCategories: string;
		group: string;
		allGroups: string;
		sortBy: string;
		nameAZ: string;
		nameZA: string;
		priceLowToHigh: string;
		priceHighToLow: string;
		durationShortToLong: string;
		durationLongToShort: string;
		clearFilters: string;
		showing: string;
		ofServices: string;
		matching: string;
		inCategory: string;
		inGroup: string;
		noServicesFound: string;
		tryAdjustingFilters: string;
		noServicesYet: string;
		addFirstService: string;
		filteringServices: string;
		serviceName: string;
		duration: string;
		price: string;
		noCategory: string;
		noGroup: string;
		editService: string;
		deleteService: string;
		areYouSureDelete: string;
		staffLabel: string;
		dateAndTime: string;
		failedToRefresh: string;
		failedToLoadCalendar: string;
		failedToLoadDashboard: string;
		redirectingToSetup: string;
		loadingDashboard: string;
		viewMode: string;
		newAppointmentLabel: string;
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
			useCurrentLocation: 'Sử dụng vị trí hiện tại',
			gettingLocation: 'Đang lấy vị trí của bạn...',
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
			topRatedTitle: 'Salon & Wellness Hàng Đầu',
			topRatedSubtitle:
				'Khám phá các salon và spa được đánh giá cao gần bạn. Đặt lịch làm tóc, massage, chăm sóc da, làm móng và nhiều dịch vụ chuyên nghiệp khác.',
			popularCategories: 'Danh mục phổ biến',
			onlineBooking: 'Đặt lịch Online',
			minutesShort: 'phút',
			toBook: 'để đặt',
			free: 'Miễn phí',
			booking: 'Đặt lịch',
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
			seeAllSalons: 'Xem tất cả salon',
		},

		// Salon
		salon: {
			rating: 'Đánh giá',
			reviews: 'Đánh giá',
			reviewsCount: 'đánh giá',
			services: 'Dịch vụ',
			information: 'Thông tin',
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
			location: 'Địa điểm',
			getDirections: 'Построить маршрут',
			daysShort: {
				mon: 'T2',
				tue: 'T3',
				wed: 'T4',
				thu: 'T5',
				fri: 'T6',
				sat: 'T7',
				sun: 'CN',
			},
			closed: 'Đóng cửa',
			hoursNotSpecified: 'Chưa có giờ làm việc',
			serviceSingular: 'dịch vụ',
			servicePlural: 'dịch vụ',
			serviceGenitive: 'dịch vụ',
		},

		// Booking
		booking: {
			selectDate: 'Chọn ngày',
			selectTime: 'Chọn giờ',
			selectService: 'Chọn dịch vụ',
			selectStaff: 'Chọn nhân viên',
			timeIntervals: {
				any: 'Bất kỳ lúc nào',
				morning: 'Buổi sáng (6:00 - 12:00)',
				afternoon: 'Buổi chiều (12:00 - 18:00)',
				evening: 'Buổi tối (18:00 - 24:00)',
			},
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

		// Auth
		auth: {
			signInTitle: 'Đăng nhập vào tài khoản của bạn',
			signInSubtitle:
				'Truy cập quản lý salon, bảng điều khiển khách hàng hoặc bảng quản trị',
			signUpTitle: 'Tạo tài khoản khách hàng',
			signUpSubtitle:
				'Tham gia với chúng tôi để đặt dịch vụ làm đẹp và chăm sóc sức khỏe',
			emailAddress: 'Địa chỉ email',
			password: 'Mật khẩu',
			rememberMe: 'Ghi nhớ đăng nhập',
			forgotPassword: 'Quên mật khẩu?',
			signIn: 'Đăng nhập',
			signUp: 'Đăng ký',
			orContinueWith: 'Hoặc tiếp tục với',
			dontHaveAccount: 'Chưa có tài khoản?',
			signUpAsClient: 'Đăng ký làm khách hàng',
			alreadyHaveAccount: 'Đã có tài khoản?',
			areYouSalonOwner: 'Bạn là chủ salon?',
			registerBusinessAccount: 'Đăng ký tài khoản doanh nghiệp →',
			fullName: 'Họ tên',
			phoneNumber: 'Số điện thoại',
			confirmPassword: 'Xác nhận mật khẩu',
			createAccount: 'Tạo tài khoản',
			welcomeBack: 'Chào mừng trở lại!',
			registrationSuccessful:
				'Đăng ký thành công! Vui lòng kiểm tra email để xác minh tài khoản của bạn.',
			checkEmail: 'Kiểm tra email',
			passwordsDoNotMatch: 'Mật khẩu không khớp',
			passwordTooShort: 'Mật khẩu phải có ít nhất 6 ký tự',
			fillAllFields: 'Vui lòng điền vào tất cả các trường bắt buộc',
			registrationFailed: 'Đăng ký thất bại',
			signInFailed: 'Đăng nhập thất bại',
			googleSignInFailed: 'Đăng nhập bằng Google thất bại',
		},

		// Language selector
		language: {
			selectLanguage: 'Chọn ngôn ngữ',
			vietnamese: 'Tiếng Việt',
			english: 'English',
		},

		// Categories
		categories: {
			hairBarber: 'Tóc & Cắt tóc',
			hairBarberDescription:
				'Dịch vụ tạo kiểu tóc, cắt tóc, nhuộm tóc và cắt tóc nam chuyên nghiệp',
			massageSpa: 'Massage & Spa',
			massageSpaDescription:
				'Massage thư giãn, liệu pháp spa và dịch vụ chăm sóc sức khỏe',
			manicurePedicure: 'Làm móng tay & chân',
			manicurePedicureDescription:
				'Chăm sóc móng, làm móng tay, làm móng chân và dịch vụ vẽ móng nghệ thuật',
			cosmeticMedicine: 'Thẩm mỹ y khoa',
			cosmeticMedicineDescription:
				'Điều trị thẩm mỹ y khoa, botox, filler và các thủ thuật thẩm mỹ',
			otherServices: 'Dịch vụ khác',
			otherServicesDescription:
				'Các dịch vụ làm đẹp và chăm sóc sức khỏe bổ sung',
		},

		// Header
		header: {
			profile: 'Hồ sơ',
			dashboard: 'Bảng điều khiển',
			logout: 'Đăng xuất',
			business: 'Doanh nghiệp',
			login: 'Đăng nhập',
		},

		// Footer
		footer: {
			allRightsReserved: '© 2024 Henzo. Bảo lưu mọi quyền.',
			aboutUs: 'Về chúng tôi',
			contact: 'Liên hệ',
			termsOfService: 'Điều khoản dịch vụ',
			privacyPolicy: 'Chính sách bảo mật',
		},

		// Cookie Banner
		cookieBanner: {
			message:
				'Chúng tôi sử dụng cookie để cải thiện trải nghiệm duyệt web, phân tích lưu lượng truy cập và cá nhân hóa nội dung. Bằng cách nhấp "Chấp nhận tất cả", bạn đồng ý với việc sử dụng cookie của chúng tôi. Bạn có thể quản lý tùy chọn của mình bất cứ lúc nào.',
			acceptAll: 'Chấp nhận tất cả',
			decline: 'Từ chối',
		},

		// Owner Panel
		owner: {
			dashboard: 'Bảng điều khiển',
			calendar: 'Lịch',
			services: 'Dịch vụ',
			staff: 'Nhân viên',
			marketing: 'Tiếp thị',
			settings: 'Cài đặt',
			logOut: 'Đăng xuất',
			welcomeBack: 'Chào mừng trở lại!',
			businessOverview: 'Đây là tổng quan doanh nghiệp của bạn',
			totalRevenue: 'Tổng doanh thu',
			totalClients: 'Tổng khách hàng',
			bookings: 'Đặt chỗ',
			completionRate: 'Tỷ lệ hoàn thành',
			last7Days: '7 ngày qua',
			last30Days: '30 ngày qua',
			last1Year: '1 năm qua',
			newAppointment: 'Cuộc hẹn mới',
			upcomingBookings: 'Đặt chỗ sắp tới',
			noUpcomingBookings: 'Không có đặt chỗ sắp tới',
			noUpcomingBookingsNext7Days: 'Không có đặt chỗ sắp tới trong 7 ngày tới',
			loadingBookings: 'Đang tải đặt chỗ...',
			topSellingServices: 'Dịch vụ bán chạy nhất',
			noCompletedServices: 'Chưa có dịch vụ hoàn thành',
			additionalMetrics: 'Chỉ số bổ sung',
			noShowRate: 'Tỷ lệ không đến',
			missed: 'đã bỏ lỡ',
			repeatClients: 'Khách hàng quay lại',
			avgRevenuePerClient: 'Doanh thu trung bình/Khách hàng',
			perClient: 'Mỗi khách hàng',
			vsLastMonth: 'so với tháng trước',
			client: 'Khách hàng',
			service: 'Dịch vụ',
			date: 'Ngày',
			time: 'Giờ',
			status: 'Trạng thái',
			actions: 'Hành động',
			confirm: 'Xác nhận',
			reject: 'Từ chối',
			edit: 'Chỉnh sửa',
			cancel: 'Hủy',
			pending: 'Đang chờ',
			confirmed: 'Đã xác nhận',
			completed: 'Hoàn thành',
			cancelled: 'Đã hủy',
			noShow: 'Không đến',
			unassigned: 'Chưa phân công',
			unknownService: 'Dịch vụ không xác định',
			areYouSureCancel: 'Bạn có chắc muốn hủy đặt chỗ này?',
			markAsNoShow: 'Đánh dấu là không đến',
			areYouSureNoShow: 'Bạn có chắc muốn đánh dấu đặt chỗ này là không đến?',
			bookingCancelled: 'Đã hủy đặt chỗ thành công',
			bookingConfirmed: 'Đã xác nhận đặt chỗ thành công',
			bookingRejected: 'Đã từ chối đặt chỗ thành công',
			bookingMarkedNoShow: 'Đã đánh dấu đặt chỗ là không đến',
			failedToCancel: 'Không thể hủy đặt chỗ',
			failedToConfirm: 'Không thể xác nhận đặt chỗ',
			failedToReject: 'Không thể từ chối đặt chỗ',
			failedToMarkNoShow: 'Không thể đánh dấu đặt chỗ là không đến',
			bookingsList: 'Danh sách đặt chỗ',
			all: 'Tất cả',
			searchBookings: 'Tìm kiếm đặt chỗ theo tên hoặc số điện thoại khách hàng',
			noBookingsFound: 'Không tìm thấy đặt chỗ',
			noBookingsWithFilters: 'Không tìm thấy đặt chỗ với bộ lọc hiện tại',
			of: 'của',
			results: 'kết quả',
			manageServices: 'Quản lý dịch vụ và giá cả của salon',
			addNew: 'Thêm mới',
			addNewService: 'Thêm dịch vụ mới',
			searchServices: 'Tìm kiếm dịch vụ',
			search: 'Tìm kiếm',
			searchByName: 'Tìm kiếm theo tên...',
			category: 'Danh mục',
			allCategories: 'Tất cả danh mục',
			group: 'Nhóm',
			allGroups: 'Tất cả nhóm',
			sortBy: 'Sắp xếp theo',
			nameAZ: 'Tên (A-Z)',
			nameZA: 'Tên (Z-A)',
			priceLowToHigh: 'Giá (Thấp đến Cao)',
			priceHighToLow: 'Giá (Cao đến Thấp)',
			durationShortToLong: 'Thời lượng (Ngắn đến Dài)',
			durationLongToShort: 'Thời lượng (Dài đến Ngắn)',
			clearFilters: 'Xóa bộ lọc',
			showing: 'Hiển thị',
			ofServices: 'của',
			matching: 'khớp',
			inCategory: 'trong',
			inGroup: 'trong',
			noServicesFound: 'Không tìm thấy dịch vụ',
			tryAdjustingFilters:
				'Thử điều chỉnh tiêu chí tìm kiếm hoặc bộ lọc của bạn',
			noServicesYet: 'Chưa có dịch vụ',
			addFirstService: 'Thêm dịch vụ đầu tiên của bạn',
			filteringServices: 'Đang lọc dịch vụ...',
			serviceName: 'Tên dịch vụ',
			duration: 'Thời lượng',
			price: 'Giá',
			noCategory: 'Không có danh mục',
			noGroup: 'Không có nhóm',
			editService: 'Chỉnh sửa dịch vụ',
			deleteService: 'Xóa dịch vụ',
			areYouSureDelete: 'Bạn có chắc muốn xóa dịch vụ này?',
			staffLabel: 'Nhân viên:',
			dateAndTime: 'Ngày & giờ:',
			failedToRefresh: 'Không thể làm mới đặt chỗ',
			failedToLoadCalendar: 'Không thể tải dữ liệu lịch.',
			failedToLoadDashboard: 'Không thể tải dữ liệu bảng điều khiển.',
			redirectingToSetup: 'Đang chuyển hướng đến thiết lập salon...',
			loadingDashboard: 'Đang tải bảng điều khiển...',
			viewMode: 'Chế độ xem và cuộc hẹn mới',
			newAppointmentLabel: 'Cuộc hẹn mới',
		},
	},

	en: {
		// Common
		common: {
			loading: 'Loading...',
			error: 'Error',
			save: 'Save',
			cancel: 'Cancel',
			close: 'Close',
			delete: 'Delete',
			edit: 'Edit',
			view: 'View',
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
			useCurrentLocation: 'Use Current Location',
			gettingLocation: 'Getting your location...',
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
			topRatedTitle: 'Top-Rated Beauty & Wellness Salons',
			topRatedSubtitle:
				'Discover highly-rated salons and spas in your area. Book appointments for hair styling, massages, facials, manicures, and more professional services.',
			popularCategories: 'Popular Categories',
			onlineBooking: 'Online Booking',
			minutesShort: 'min',
			toBook: 'to book',
			free: 'Free',
			booking: 'Booking',
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
			seeAllSalons: 'See all salons',
		},

		// Salon
		salon: {
			rating: 'Rating',
			reviews: 'Reviews',
			reviewsCount: 'reviews',
			services: 'Services',
			information: 'Information',
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
			location: 'Location',
			getDirections: 'Get Directions',
			daysShort: {
				mon: 'Mon',
				tue: 'Tue',
				wed: 'Wed',
				thu: 'Thu',
				fri: 'Fri',
				sat: 'Sat',
				sun: 'Sun',
			},
			closed: 'Closed',
			hoursNotSpecified: 'Hours not specified',
			serviceSingular: 'service',
			servicePlural: 'services',
			serviceGenitive: 'services',
		},

		// Booking
		booking: {
			selectDate: 'Select Date',
			selectTime: 'Select Time',
			selectService: 'Select Service',
			selectStaff: 'Select Staff',
			timeIntervals: {
				any: 'Any time',
				morning: 'Morning (6:00 - 12:00)',
				afternoon: 'Afternoon (12:00 - 18:00)',
				evening: 'Evening (18:00 - 24:00)',
			},
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

		// Auth
		auth: {
			signInTitle: 'Sign in to your account',
			signInSubtitle: 'Access your salon management, client dashboard',
			signUpTitle: 'Create your client account',
			signUpSubtitle: 'Join us to book beauty and wellness services',
			emailAddress: 'Email address',
			password: 'Password',
			rememberMe: 'Remember me',
			forgotPassword: 'Forgot your password?',
			signIn: 'Sign in',
			signUp: 'Sign up',
			orContinueWith: 'Or continue with',
			dontHaveAccount: "Don't have an account?",
			signUpAsClient: 'Sign up as client',
			alreadyHaveAccount: 'Already have an account?',
			areYouSalonOwner: 'Are you a salon owner?',
			registerBusinessAccount: 'Register your business account →',
			fullName: 'Full Name',
			phoneNumber: 'Phone Number',
			confirmPassword: 'Confirm Password',
			createAccount: 'Create Account',
			welcomeBack: 'Welcome back!',
			registrationSuccessful:
				'Registration successful! Please check your email to verify your account.',
			checkEmail: 'Check email',
			passwordsDoNotMatch: 'Passwords do not match',
			passwordTooShort: 'Password must be at least 6 characters',
			fillAllFields: 'Please fill in all required fields',
			registrationFailed: 'Registration failed',
			signInFailed: 'Failed to sign in',
			googleSignInFailed: 'Failed to sign in with Google',
		},

		// Language selector
		language: {
			selectLanguage: 'Select Language',
			vietnamese: 'Tiếng Việt',
			english: 'English',
		},

		// Categories
		categories: {
			hairBarber: 'Hair & Barber',
			hairBarberDescription:
				'Professional hair styling, cutting, coloring, and barber services',
			massageSpa: 'Massage & Spa',
			massageSpaDescription:
				'Relaxing massages, spa treatments, and wellness services',
			manicurePedicure: 'Manicure & Pedicure',
			manicurePedicureDescription:
				'Nail care, manicures, pedicures, and nail art services',
			cosmeticMedicine: 'Cosmetic Medicine',
			cosmeticMedicineDescription:
				'Medical aesthetic treatments, botox, fillers, and cosmetic procedures',
			otherServices: 'Other Services',
			otherServicesDescription: 'Additional beauty and wellness services',
		},

		// Header
		header: {
			profile: 'Profile',
			dashboard: 'Dashboard',
			logout: 'Logout',
			business: 'Business',
			login: 'Login',
		},

		// Footer
		footer: {
			allRightsReserved: '© 2024 Henzo. All rights reserved.',
			aboutUs: 'About Us',
			contact: 'Contact',
			termsOfService: 'Terms of Service',
			privacyPolicy: 'Privacy Policy',
		},

		// Cookie Banner
		cookieBanner: {
			message:
				'We use cookies to enhance your browsing experience, analyze site traffic, and personalize content. By clicking "Accept All", you consent to our use of cookies. You can manage your preferences at any time.',
			acceptAll: 'Accept All',
			decline: 'Decline',
		},

		// Owner Panel
		owner: {
			dashboard: 'Dashboard',
			calendar: 'Calendar',
			services: 'Services',
			staff: 'Staff',
			marketing: 'Marketing',
			settings: 'Settings',
			logOut: 'Log Out',
			welcomeBack: 'Welcome back!',
			businessOverview: "Here's your business overview",
			totalRevenue: 'Total Revenue',
			totalClients: 'Total Clients',
			bookings: 'Bookings',
			completionRate: 'Completion Rate',
			last7Days: 'Last 7 days',
			last30Days: 'Last 30 days',
			last1Year: 'Last 1 year',
			newAppointment: 'New Appointment',
			upcomingBookings: 'Upcoming Bookings',
			noUpcomingBookings: 'No upcoming bookings',
			noUpcomingBookingsNext7Days: 'No upcoming bookings in the next 7 days',
			loadingBookings: 'Loading bookings...',
			topSellingServices: 'Top Selling Services',
			noCompletedServices: 'No completed services yet',
			additionalMetrics: 'Additional Metrics',
			noShowRate: 'No-Show Rate',
			missed: 'missed',
			repeatClients: 'Repeat Clients',
			avgRevenuePerClient: 'Avg Revenue/Client',
			perClient: 'Per client',
			vsLastMonth: 'vs last month',
			client: 'Client',
			service: 'Service',
			date: 'Date',
			time: 'Time',
			status: 'Status',
			actions: 'Actions',
			confirm: 'Confirm',
			reject: 'Reject',
			edit: 'Edit',
			cancel: 'Cancel',
			pending: 'Pending',
			confirmed: 'Confirmed',
			completed: 'Completed',
			cancelled: 'Cancelled',
			noShow: 'No-Show',
			unassigned: 'Unassigned',
			unknownService: 'Unknown Service',
			areYouSureCancel: 'Are you sure you want to cancel this booking?',
			markAsNoShow: 'Mark as No-Show',
			areYouSureNoShow:
				'Are you sure you want to mark this booking as No-Show?',
			bookingCancelled: 'Booking cancelled successfully',
			bookingConfirmed: 'Booking confirmed successfully',
			bookingRejected: 'Booking rejected successfully',
			bookingMarkedNoShow: 'Booking marked as No-Show',
			failedToCancel: 'Failed to cancel booking',
			failedToConfirm: 'Failed to confirm booking',
			failedToReject: 'Failed to reject booking',
			failedToMarkNoShow: 'Failed to mark booking as No-Show',
			bookingsList: 'Bookings List',
			all: 'All',
			searchBookings: 'Search bookings by client name or phone',
			noBookingsFound: 'No bookings found',
			noBookingsWithFilters: 'No bookings found with current filters',
			of: 'of',
			results: 'results',
			manageServices: 'Manage your salon services and pricing',
			addNew: 'Add New',
			addNewService: 'Add New Service',
			searchServices: 'Search Services',
			search: 'Search',
			searchByName: 'Search by name...',
			category: 'Category',
			allCategories: 'All Categories',
			group: 'Group',
			allGroups: 'All Groups',
			sortBy: 'Sort By',
			nameAZ: 'Name (A-Z)',
			nameZA: 'Name (Z-A)',
			priceLowToHigh: 'Price (Low to High)',
			priceHighToLow: 'Price (High to Low)',
			durationShortToLong: 'Duration (Short to Long)',
			durationLongToShort: 'Duration (Long to Short)',
			clearFilters: 'Clear Filters',
			showing: 'Showing',
			ofServices: 'of',
			matching: 'matching',
			inCategory: 'in',
			inGroup: 'in',
			noServicesFound: 'No services found',
			tryAdjustingFilters: 'Try adjusting your search or filter criteria',
			noServicesYet: 'No services yet',
			addFirstService: 'Add Your First Service',
			filteringServices: 'Filtering services...',
			serviceName: 'Service Name',
			duration: 'Duration',
			price: 'Price',
			noCategory: 'No category',
			noGroup: 'No group',
			editService: 'Edit service',
			deleteService: 'Delete service',
			areYouSureDelete: 'Are you sure you want to delete this service?',
			staffLabel: 'Staff:',
			dateAndTime: 'Date & time:',
			failedToRefresh: 'Failed to refresh bookings',
			failedToLoadCalendar: 'Failed to load calendar data.',
			failedToLoadDashboard: 'Failed to load dashboard data.',
			redirectingToSetup: 'Redirecting to salon setup...',
			loadingDashboard: 'Loading dashboard...',
			viewMode: 'View mode and new appointment',
			newAppointmentLabel: 'New Appointment',
		},
	},

	ru: {
		// Common
		common: {
			loading: 'Загрузка...',
			error: 'Ошибка',
			save: 'Сохранить',
			cancel: 'Отмена',
			close: 'Закрыть',
			delete: 'Удалить',
			edit: 'Редактировать',
			view: 'Просмотр',
			back: 'Назад',
			next: 'Далее',
			previous: 'Назад',
			search: 'Поиск',
			filter: 'Фильтр',
			sort: 'Сортировать',
			all: 'Все',
			none: 'Нет',
			yes: 'Да',
			no: 'Нет',
			useCurrentLocation: 'Использовать текущее местоположение',
			gettingLocation: 'Определяем ваше местоположение...',
		},

		// Navigation
		navigation: {
			home: 'Главная',
			salons: 'Поиск',
			map: 'Карта',
			categories: 'Категории',
			about: 'О нас',
			contact: 'Контакты',
			business: 'Для бизнеса',
			login: 'Войти',
			register: 'Регистрация',
			logout: 'Выйти',
			profile: 'Профиль',
			dashboard: 'Панель',
			bookings: 'Бронирования',
			services: 'Услуги',
			staff: 'Сотрудники',
			settings: 'Настройки',
			help: 'Помощь',
			support: 'Поддержка',
		},

		// Homepage
		homepage: {
			heroTitle:
				'Найдите <span class="text-[#ff5b5b]">идеальный <br> салон</span> рядом с вами',
			heroSubtitle:
				'Бронируйте визиты в топ‑салонах рядом. Сравнивайте цены, читайте отзывы и наслаждайтесь сервисом.',
			topRatedTitle: 'Топовые салоны красоты и велнес',
			topRatedSubtitle:
				'Откройте для себя салоны и спа с высокими рейтингами рядом. Бронируйте стрижки и укладки, массаж, уход за лицом, маникюр и другие профессиональные услуги.',
			popularCategories: 'Популярные категории',
			onlineBooking: 'Онлайн‑запись',
			minutesShort: 'мин',
			toBook: 'до записи',
			free: 'Бесплатно',
			booking: 'Запись',
			searchPlaceholder: 'Поиск услуг...',
			locationPlaceholder: 'Ваше местоположение',
			datePlaceholder: 'Выберите дату',
			timePlaceholder: 'Выберите время',
			searchButton: 'Найти',
			featuredSalons: 'Рекомендуемые салоны',
			popularServices: 'Популярные услуги',
			howItWorks: 'Как это работает — 3 простых шага',
			howItWorksSubtitle:
				'Найти и забронировать идеальную процедуру красоты ещё никогда не было так просто',
			step1: '01',
			step2: '02',
			step3: '03',
			step1Title: 'Ищите и выбирайте',
			step2Title: 'Выбирайте и бронируйте',
			step3Title: 'Отдыхайте и наслаждайтесь',
			step1Description:
				'Укажите местоположение и найдите салоны рядом с проверенными отзывами и хорошими ценами.',
			step2Description:
				'Выберите услугу, время и мастера. Мгновенное бронирование в пару кликов.',
			step3Description:
				'Приходите на запись и получайте отличный сервис. Оцените визит после.',
			whyChooseHenzo: 'Почему Henzo?',
			whyChooseSubtitle: 'Henzo делает запись к мастерам простой и удобной.',
			easyBooking: 'Лёгкое бронирование',
			easyBookingDescription: 'Запись в пару кликов.',
			flexibleScheduling: 'Гибкий график',
			flexibleSchedulingDescription:
				'Находите подходящее время, даже в последний момент.',
			trustedReviews: 'Надёжные отзывы',
			trustedReviewsDescription:
				'Читайте реальные отзывы клиентов и выбирайте лучшее.',
			salonOwner: 'Вы владелец салона?',
			salonOwnerSubtitle:
				'Присоединяйтесь к Henzo и развивайте бизнес с нашей платформой бронирований',
			learnMore: 'Узнать больше',
			seeAllSalons: 'Все салоны',
		},

		// Salon
		salon: {
			rating: 'Рейтинг',
			reviews: 'Отзывы',
			reviewsCount: 'отзывов',
			services: 'Услуги',
			information: 'Информация',
			workingHours: 'Часы работы',
			contact: 'Контакты',
			bookNow: 'Записаться',
			viewDetails: 'Подробнее',
			address: 'Адрес',
			phone: 'Телефон',
			website: 'Сайт',
			instagram: 'Instagram',
			description: 'Описание',
			photos: 'Фото',
			amenities: 'Удобства',
			parking: 'Парковка',
			wifi: 'Wi‑Fi',
			airConditioning: 'Кондиционер',
			wheelchairAccessible: 'Доступно для инвалидных колясок',
			location: 'Местоположение',
			getDirections: 'Проложить маршрут',
			daysShort: {
				mon: 'Пн',
				tue: 'Вт',
				wed: 'Ср',
				thu: 'Чт',
				fri: 'Пт',
				sat: 'Сб',
				sun: 'Вс',
			},
			closed: 'Закрыто',
			hoursNotSpecified: 'Время работы не указано',
			serviceSingular: 'услуга',
			servicePlural: 'услуги',
			serviceGenitive: 'услуг',
		},

		// Booking
		booking: {
			selectDate: 'Выберите дату',
			selectTime: 'Выберите время',
			selectService: 'Выберите услугу',
			selectStaff: 'Выберите мастера',
			timeIntervals: {
				any: 'Любое время',
				morning: 'Утро (6:00 - 12:00)',
				afternoon: 'День (12:00 - 18:00)',
				evening: 'Вечер (18:00 - 24:00)',
			},
			customerInfo: 'Данные клиента',
			name: 'Имя',
			email: 'Email',
			phone: 'Телефон',
			notes: 'Заметки',
			confirmBooking: 'Подтвердить запись',
			bookingConfirmed: 'Запись подтверждена',
			bookingError: 'Ошибка при бронировании',
			noAvailableSlots: 'Нет доступных слотов',
			salonClosed: 'Салон закрыт',
		},

		// Forms
		forms: {
			required: 'Обязательное поле',
			invalidEmail: 'Некорректный email',
			invalidPhone: 'Некорректный телефон',
			passwordTooShort: 'Пароль слишком короткий',
			passwordsDoNotMatch: 'Пароли не совпадают',
			termsAndConditions: 'Условия использования',
			privacyPolicy: 'Политика конфиденциальности',
			agreeToTerms: 'Я согласен с условиями',
		},

		// Business
		business: {
			salonName: 'Название салона',
			salonType: 'Тип салона',
			businessHours: 'Часы работы',
			monday: 'Понедельник',
			tuesday: 'Вторник',
			wednesday: 'Среда',
			thursday: 'Четверг',
			friday: 'Пятница',
			saturday: 'Суббота',
			sunday: 'Воскресенье',
			closed: 'Закрыто',
			open: 'Открыто',
			closedDay: 'Выходной',
			completeSetup: 'Завершить настройку',
			salonInfo: 'Информация о салоне',
			branding: 'Брендинг',
			services: 'Услуги',
			staff: 'Персонал',
		},

		// Auth
		auth: {
			signInTitle: 'Войдите в свой аккаунт',
			signInSubtitle: 'Доступ к управлению салоном, панели клиента',
			signUpTitle: 'Создайте аккаунт клиента',
			signUpSubtitle:
				'Присоединяйтесь к нам, чтобы бронировать услуги красоты и здоровья',
			emailAddress: 'Адрес электронной почты',
			password: 'Пароль',
			rememberMe: 'Запомнить меня',
			forgotPassword: 'Забыли пароль?',
			signIn: 'Войти',
			signUp: 'Зарегистрироваться',
			orContinueWith: 'Или продолжить с',
			dontHaveAccount: 'Нет аккаунта?',
			signUpAsClient: 'Зарегистрироваться как клиент',
			alreadyHaveAccount: 'Уже есть аккаунт?',
			areYouSalonOwner: 'Вы владелец салона?',
			registerBusinessAccount: 'Зарегистрировать бизнес-аккаунт →',
			fullName: 'Полное имя',
			phoneNumber: 'Номер телефона',
			confirmPassword: 'Подтвердите пароль',
			createAccount: 'Создать аккаунт',
			welcomeBack: 'С возвращением!',
			registrationSuccessful:
				'Регистрация успешна! Пожалуйста, проверьте свою электронную почту для подтверждения аккаунта.',
			checkEmail: 'Проверьте почту',
			passwordsDoNotMatch: 'Пароли не совпадают',
			passwordTooShort: 'Пароль должен содержать не менее 6 символов',
			fillAllFields: 'Пожалуйста, заполните все обязательные поля',
			registrationFailed: 'Регистрация не удалась',
			signInFailed: 'Не удалось войти',
			googleSignInFailed: 'Не удалось войти через Google',
		},

		// Language selector
		language: {
			selectLanguage: 'Выберите язык',
			vietnamese: 'Tiếng Việt',
			english: 'English',
		},

		// Categories
		categories: {
			hairBarber: 'Парикмахерские услуги',
			hairBarberDescription:
				'Профессиональная укладка, стрижка, окрашивание и барбершоп услуги',
			massageSpa: 'Массаж & Спа',
			massageSpaDescription:
				'Расслабляющий массаж, спа-процедуры и оздоровительные услуги',
			manicurePedicure: 'Маникюр & Педикюр',
			manicurePedicureDescription:
				'Уход за ногтями, маникюр, педикюр и услуги по дизайну ногтей',
			cosmeticMedicine: 'Косметология',
			cosmeticMedicineDescription:
				'Медицинские эстетические процедуры, ботокс, филлеры и косметические процедуры',
			otherServices: 'Другие услуги',
			otherServicesDescription: 'Дополнительные услуги красоты и здоровья',
		},

		// Header
		header: {
			profile: 'Профиль',
			dashboard: 'Панель',
			logout: 'Выйти',
			business: 'Для бизнеса',
			login: 'Войти',
		},

		// Footer
		footer: {
			allRightsReserved: '© 2024 Henzo. Все права защищены.',
			aboutUs: 'О нас',
			contact: 'Контакты',
			termsOfService: 'Условия использования',
			privacyPolicy: 'Политика конфиденциальности',
		},

		// Cookie Banner
		cookieBanner: {
			message:
				'Мы используем файлы cookie для улучшения вашего опыта просмотра, анализа трафика сайта и персонализации контента. Нажимая "Принять все", вы соглашаетесь с использованием нами файлов cookie. Вы можете управлять своими настройками в любое время.',
			acceptAll: 'Принять все',
			decline: 'Отклонить',
		},

		// Owner Panel
		owner: {
			dashboard: 'Панель управления',
			calendar: 'Календарь',
			services: 'Услуги',
			staff: 'Персонал',
			marketing: 'Маркетинг',
			settings: 'Настройки',
			logOut: 'Выйти',
			welcomeBack: 'С возвращением!',
			businessOverview: 'Вот обзор вашего бизнеса',
			totalRevenue: 'Общий доход',
			totalClients: 'Всего клиентов',
			bookings: 'Бронирования',
			completionRate: 'Процент выполнения',
			last7Days: 'Последние 7 дней',
			last30Days: 'Последние 30 дней',
			last1Year: 'Последний год',
			newAppointment: 'Новая запись',
			upcomingBookings: 'Предстоящие записи',
			noUpcomingBookings: 'Нет предстоящих записей',
			noUpcomingBookingsNext7Days: 'Нет предстоящих записей в ближайшие 7 дней',
			loadingBookings: 'Загрузка записей...',
			topSellingServices: 'Популярные услуги',
			noCompletedServices: 'Пока нет завершенных услуг',
			additionalMetrics: 'Дополнительные показатели',
			noShowRate: 'Процент неявок',
			missed: 'пропущено',
			repeatClients: 'Постоянные клиенты',
			avgRevenuePerClient: 'Средний доход/Клиент',
			perClient: 'На клиента',
			vsLastMonth: 'по сравнению с прошлым месяцем',
			client: 'Клиент',
			service: 'Услуга',
			date: 'Дата',
			time: 'Время',
			status: 'Статус',
			actions: 'Действия',
			confirm: 'Подтвердить',
			reject: 'Отклонить',
			edit: 'Редактировать',
			cancel: 'Отменить',
			pending: 'Ожидает',
			confirmed: 'Подтверждено',
			completed: 'Завершено',
			cancelled: 'Отменено',
			noShow: 'Неявка',
			unassigned: 'Не назначено',
			unknownService: 'Неизвестная услуга',
			areYouSureCancel: 'Вы уверены, что хотите отменить эту запись?',
			markAsNoShow: 'Отметить как неявку',
			areYouSureNoShow:
				'Вы уверены, что хотите отметить эту запись как неявку?',
			bookingCancelled: 'Запись успешно отменена',
			bookingConfirmed: 'Запись успешно подтверждена',
			bookingRejected: 'Запись успешно отклонена',
			bookingMarkedNoShow: 'Запись отмечена как неявка',
			failedToCancel: 'Не удалось отменить запись',
			failedToConfirm: 'Не удалось подтвердить запись',
			failedToReject: 'Не удалось отклонить запись',
			failedToMarkNoShow: 'Не удалось отметить запись как неявку',
			bookingsList: 'Список записей',
			all: 'Все',
			searchBookings: 'Поиск записей по имени клиента или телефону',
			noBookingsFound: 'Записи не найдены',
			noBookingsWithFilters: 'Записи не найдены с текущими фильтрами',
			of: 'из',
			results: 'результатов',
			manageServices: 'Управляйте услугами и ценами вашего салона',
			addNew: 'Добавить',
			addNewService: 'Добавить новую услугу',
			searchServices: 'Поиск услуг',
			search: 'Поиск',
			searchByName: 'Поиск по имени...',
			category: 'Категория',
			allCategories: 'Все категории',
			group: 'Группа',
			allGroups: 'Все группы',
			sortBy: 'Сортировать по',
			nameAZ: 'Имя (А-Я)',
			nameZA: 'Имя (Я-А)',
			priceLowToHigh: 'Цена (От низкой к высокой)',
			priceHighToLow: 'Цена (От высокой к низкой)',
			durationShortToLong: 'Длительность (От короткой к длинной)',
			durationLongToShort: 'Длительность (От длинной к короткой)',
			clearFilters: 'Очистить фильтры',
			showing: 'Показано',
			ofServices: 'из',
			matching: 'соответствует',
			inCategory: 'в',
			inGroup: 'в',
			noServicesFound: 'Услуги не найдены',
			tryAdjustingFilters: 'Попробуйте изменить критерии поиска или фильтры',
			noServicesYet: 'Пока нет услуг',
			addFirstService: 'Добавьте свою первую услугу',
			filteringServices: 'Фильтрация услуг...',
			serviceName: 'Название услуги',
			duration: 'Длительность',
			price: 'Цена',
			noCategory: 'Нет категории',
			noGroup: 'Нет группы',
			editService: 'Редактировать услугу',
			deleteService: 'Удалить услугу',
			areYouSureDelete: 'Вы уверены, что хотите удалить эту услугу?',
			staffLabel: 'Персонал:',
			dateAndTime: 'Дата и время:',
			failedToRefresh: 'Не удалось обновить записи',
			failedToLoadCalendar: 'Не удалось загрузить данные календаря.',
			failedToLoadDashboard: 'Не удалось загрузить данные панели управления.',
			redirectingToSetup: 'Перенаправление на настройку салона...',
			loadingDashboard: 'Загрузка панели управления...',
			viewMode: 'Режим просмотра и новая запись',
			newAppointmentLabel: 'Новая запись',
		},
	},
};
