import { Metadata } from 'next';

const baseUrl = process.env.NEXT_PUBLIC_FRONTEND_URL || 'https://henzo.app';

export const seoConfig = {
	home: {
		title: 'Henzo - Đặt Lịch Salon Tóc, Spa, Massage Online | Hà Nội, TP.HCM',
		description:
			'Đặt lịch hẹn làm đẹp online với Henzo tại Việt Nam. Tìm và đặt salon tóc, spa, massage, nail, làm móng tại Hà Nội, TP.HCM. Đặt lịch dễ dàng, đánh giá tin cậy, giá cả minh bạch.',
		metadataBase: new URL(baseUrl),
		alternates: {
			canonical: '/',
			languages: {
				'vi-VN': '/',
				'en-US': '/en',
			},
		},
		keywords: [
			'đặt lịch salon',
			'đặt lịch spa',
			'salon tóc Hà Nội',
			'spa TP.HCM',
			'massage Việt Nam',
			'làm nail online',
			'đặt lịch làm đẹp',
			'beauty booking Vietnam',
			'salon Hanoi',
			'spa Ho Chi Minh',
		],
		openGraph: {
			title: 'Henzo - Đặt Lịch Salon, Spa, Massage Online Việt Nam',
			description:
				'Tìm và đặt lịch các dịch vụ làm đẹp tốt nhất gần bạn tại Việt Nam. Salon tóc, spa, massage, nail. Đặt lịch online dễ dàng với đánh giá tin cậy.',
			url: '/',
			siteName: 'Henzo',
			images: [
				{
					url: '/og-image.jpg',
					width: 1200,
					height: 630,
					alt: 'Henzo - Nền tảng đặt lịch làm đẹp Việt Nam',
				},
			],
			locale: 'vi_VN',
			type: 'website',
		},
		twitter: {
			card: 'summary_large_image',
			title: 'Henzo - Đặt Lịch Salon, Spa Online Việt Nam',
			description:
				'Tìm và đặt lịch dịch vụ làm đẹp tốt nhất gần bạn. Đặt lịch online dễ dàng với đánh giá tin cậy.',
			images: ['/og-image.jpg'],
			creator: '@henzo',
		},
	} as Metadata,
	business: {
		title:
			'Henzo cho Salon - Phần mềm quản lý Salon miễn phí | Đặt lịch Online',
		description:
			'Phát triển salon của bạn với Henzo. Phần mềm quản lý salon hoàn chỉnh: đặt lịch online, quản lý khách hàng, nhắc hẹn tự động. MIỄN PHÍ đến tháng 6/2026. Dùng thử ngay!',
		metadataBase: new URL(baseUrl),
		alternates: {
			canonical: '/business',
			languages: {
				'vi-VN': '/business',
				'en-US': '/en/business',
			},
		},
		keywords: [
			'phần mềm quản lý salon',
			'quản lý salon miễn phí',
			'đặt lịch online cho salon',
			'phần mềm salon Việt Nam',
			'quản lý spa',
			'salon management Vietnam',
			'booking system salon',
			'phần mềm đặt lịch',
			'quản lý khách hàng salon',
		],
		openGraph: {
			title: 'Henzo cho Salon - Quản lý Salon chuyên nghiệp, Miễn phí',
			description:
				'Nền tảng tất cả trong một cho salon của bạn. Quản lý lịch hẹn, khách hàng tự động. MIỄN PHÍ đến 6/2026. Dùng thử ngay!',
			url: '/business',
			siteName: 'Henzo',
			images: [
				{
					url: '/og-business.jpg',
					width: 1200,
					height: 630,
					alt: 'Henzo cho Salon - Phần mềm quản lý Salon Việt Nam',
				},
			],
			locale: 'vi_VN',
			type: 'website',
		},
		twitter: {
			card: 'summary_large_image',
			title: 'Henzo cho Salon - Phần mềm quản lý Salon miễn phí',
			description:
				'Phát triển salon với công cụ quản lý hoàn chỉnh. Đặt lịch, quản lý khách hàng, miễn phí.',
			images: ['/og-business.jpg'],
			creator: '@henzo',
		},
	} as Metadata,
	about: {
		title: 'About Henzo - Beauty & Wellness Booking Platform | Our Story',
		description:
			"Learn about Henzo's mission to revolutionize beauty and wellness booking. Discover our story, values, and commitment to connecting clients with the best salons and spas.",
		metadataBase: new URL(baseUrl),
		alternates: {
			canonical: '/about',
		},
		openGraph: {
			title: 'About Henzo - Beauty & Wellness Booking Platform',
			description:
				"Discover Henzo's mission to revolutionize beauty and wellness booking. Learn about our story and commitment to connecting clients with the best salons.",
			url: '/about',
			siteName: 'Henzo',
			images: [
				{
					url: '/og-about.jpg',
					width: 1200,
					height: 630,
					alt: 'About Henzo - Beauty & Wellness Booking Platform',
				},
			],
			locale: 'en_US',
			type: 'website',
		},
		twitter: {
			card: 'summary_large_image',
			title: 'About Henzo - Beauty & Wellness Booking Platform',
			description:
				"Learn about Henzo's mission to revolutionize beauty and wellness booking. Discover our story and values.",
			images: ['/og-about.jpg'],
			creator: '@henzo',
		},
	} as Metadata,
	contact: {
		title: 'Contact Henzo - Get Help & Support | Beauty Booking Platform',
		description:
			"Get in touch with Henzo support team. Find help with booking, account issues, billing questions, or general inquiries. We're here to help with your beauty booking needs.",
		metadataBase: new URL(baseUrl),
		alternates: {
			canonical: '/contact',
		},
		openGraph: {
			title: 'Contact Henzo - Get Help & Support',
			description:
				'Get in touch with Henzo support team. Find help with booking, account issues, billing questions, or general inquiries.',
			url: '/contact',
			siteName: 'Henzo',
			images: [
				{
					url: '/og-contact.jpg',
					width: 1200,
					height: 630,
					alt: 'Contact Henzo - Beauty Booking Support',
				},
			],
			locale: 'en_US',
			type: 'website',
		},
		twitter: {
			card: 'summary_large_image',
			title: 'Contact Henzo - Get Help & Support',
			description:
				'Get in touch with Henzo support team. Find help with booking, account issues, and general inquiries.',
			images: ['/og-contact.jpg'],
			creator: '@henzo',
		},
	} as Metadata,
	terms: {
		title: 'Terms of Service - Henzo | Legal Terms & Conditions',
		description:
			"Read Henzo's Terms of Service to understand the terms and conditions for using our beauty salon booking platform. Learn about user responsibilities, intellectual property, and liability limitations.",
		metadataBase: new URL(baseUrl),
		alternates: {
			canonical: '/terms-of-service',
		},
		openGraph: {
			title: 'Terms of Service - Henzo',
			description:
				"Read Henzo's Terms of Service to understand the terms and conditions for using our beauty salon booking platform.",
			url: '/terms-of-service',
			siteName: 'Henzo',
			images: [
				{
					url: '/og-terms.jpg',
					width: 1200,
					height: 630,
					alt: 'Henzo Terms of Service - Legal Terms & Conditions',
				},
			],
			locale: 'en_US',
			type: 'website',
		},
		twitter: {
			card: 'summary_large_image',
			title: 'Terms of Service - Henzo',
			description:
				"Read Henzo's Terms of Service to understand the terms and conditions for using our beauty salon booking platform.",
			images: ['/og-terms.jpg'],
			creator: '@henzo',
		},
	} as Metadata,
	privacy: {
		title: 'Privacy Policy - Henzo | Data Protection & Privacy',
		description:
			'Learn how Henzo collects, uses, and protects your personal information. Read our comprehensive Privacy Policy covering data collection, usage, sharing, and your privacy rights.',
		metadataBase: new URL(baseUrl),
		alternates: {
			canonical: '/privacy-policy',
		},
		openGraph: {
			title: 'Privacy Policy - Henzo',
			description:
				'Learn how Henzo collects, uses, and protects your personal information. Read our comprehensive Privacy Policy.',
			url: '/privacy-policy',
			siteName: 'Henzo',
			images: [
				{
					url: '/og-privacy.jpg',
					width: 1200,
					height: 630,
					alt: 'Henzo Privacy Policy - Data Protection & Privacy',
				},
			],
			locale: 'en_US',
			type: 'website',
		},
		twitter: {
			card: 'summary_large_image',
			title: 'Privacy Policy - Henzo',
			description:
				'Learn how Henzo collects, uses, and protects your personal information. Read our comprehensive Privacy Policy.',
			images: ['/og-privacy.jpg'],
			creator: '@henzo',
		},
	} as Metadata,
	clientDashboard: {
		title: 'Client Dashboard - Henzo | Your Appointments & Bookings',
		description:
			'Manage your beauty appointments and bookings with Henzo. View upcoming appointments, booking history, and easily book new services.',
		metadataBase: new URL(baseUrl),
		alternates: {
			canonical: '/dashboard',
		},
		openGraph: {
			title: 'Client Dashboard - Henzo',
			description:
				'Manage your beauty appointments and bookings. View upcoming appointments and booking history.',
			url: '/dashboard',
			siteName: 'Henzo',
			images: [
				{
					url: '/og-dashboard.jpg',
					width: 1200,
					height: 630,
					alt: 'Henzo Client Dashboard',
				},
			],
			locale: 'en_US',
			type: 'website',
		},
		twitter: {
			card: 'summary_large_image',
			title: 'Client Dashboard - Henzo',
			description: 'Manage your beauty appointments and bookings with ease.',
			images: ['/og-dashboard.jpg'],
			creator: '@henzo',
		},
	} as Metadata,
	clientReviews: {
		title: 'Your Reviews - Henzo | Beauty Service Reviews & Feedback',
		description:
			'View and manage your beauty service reviews on Henzo. Leave feedback for completed appointments and help others make informed decisions.',
		metadataBase: new URL(baseUrl),
		alternates: {
			canonical: '/reviews',
		},
		openGraph: {
			title: 'Your Reviews - Henzo',
			description:
				'View and manage your beauty service reviews. Leave feedback for completed appointments.',
			url: '/reviews',
			siteName: 'Henzo',
			images: [
				{
					url: '/og-reviews.jpg',
					width: 1200,
					height: 630,
					alt: 'Henzo Reviews',
				},
			],
			locale: 'en_US',
			type: 'website',
		},
		twitter: {
			card: 'summary_large_image',
			title: 'Your Reviews - Henzo',
			description: 'View and manage your beauty service reviews and feedback.',
			images: ['/og-reviews.jpg'],
			creator: '@henzo',
		},
	} as Metadata,
	clientSettings: {
		title: 'Account Settings - Henzo | Manage Your Profile & Preferences',
		description:
			'Manage your Henzo account settings, update personal information, change password, and control your privacy preferences.',
		metadataBase: new URL(baseUrl),
		alternates: {
			canonical: '/settings',
		},
		openGraph: {
			title: 'Account Settings - Henzo',
			description:
				'Manage your account settings, update personal information, and control your preferences.',
			url: '/settings',
			siteName: 'Henzo',
			images: [
				{
					url: '/og-settings.jpg',
					width: 1200,
					height: 630,
					alt: 'Henzo Account Settings',
				},
			],
			locale: 'en_US',
			type: 'website',
		},
		twitter: {
			card: 'summary_large_image',
			title: 'Account Settings - Henzo',
			description: 'Manage your account settings and personal information.',
			images: ['/og-settings.jpg'],
			creator: '@henzo',
		},
	} as Metadata,

	map: {
		title: 'Find Salons on Map - Henzo | Interactive Salon Locator',
		description:
			'Discover beauty salons, spas, and wellness centers on our interactive map. Find the best-rated salons near you with detailed reviews and easy booking options.',
		metadataBase: new URL(baseUrl),
		alternates: {
			canonical: '/map',
		},
		openGraph: {
			title: 'Find Salons on Map - Henzo',
			description:
				'Discover beauty salons and wellness centers on our interactive map. Find the best-rated salons near you.',
			url: '/map',
			siteName: 'Henzo',
			images: [
				{
					url: '/og-map.jpg',
					width: 1200,
					height: 630,
					alt: 'Henzo - Salon Map Search',
				},
			],
			locale: 'en_US',
			type: 'website',
		},
		twitter: {
			card: 'summary_large_image',
			title: 'Find Salons on Map - Henzo',
			description:
				'Discover beauty salons and wellness centers on our interactive map.',
			images: ['/og-map.jpg'],
			creator: '@henzo',
		},
	} as Metadata,
};
