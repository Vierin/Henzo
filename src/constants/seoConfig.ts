import { Metadata } from 'next';

const baseUrl = process.env.NEXT_PUBLIC_FRONTEND_URL || 'https://henzo.app';

export const seoConfig = {
	home: {
		title:
			'Henzo - Book Beauty & Wellness Appointments Online | Hair, Spa, Massage',
		description:
			'Book your next beauty appointment with Henzo. Find and book hair salons, spas, massage therapists, nail salons, and wellness services near you. Easy online booking, trusted reviews, flexible scheduling.',
		metadataBase: new URL(baseUrl),
		alternates: {
			canonical: '/',
		},
		openGraph: {
			title: 'Henzo - Book Beauty & Wellness Appointments Online',
			description:
				'Find and book the best beauty and wellness services near you. Hair salons, spas, massage, nails and more. Easy online booking with trusted reviews.',
			url: '/',
			siteName: 'Henzo',
			images: [
				{
					url: '/og-image.jpg',
					width: 1200,
					height: 630,
					alt: 'Henzo - Beauty & Wellness Booking Platform',
				},
			],
			locale: 'en_US',
			type: 'website',
		},
		twitter: {
			card: 'summary_large_image',
			title: 'Henzo - Book Beauty & Wellness Appointments Online',
			description:
				'Find and book the best beauty and wellness services near you. Easy online booking with trusted reviews.',
			images: ['/og-image.jpg'],
			creator: '@henzo',
		},
	} as Metadata,
	business: {
		title:
			'Henzo for Business - Beauty Salon Management Software | Appointment Booking',
		description:
			'Grow your beauty business with Henzo. Complete salon management software with appointment booking, client management, payment processing, and marketing tools. Start your free trial today.',
		metadataBase: new URL(baseUrl),
		alternates: {
			canonical: '/business',
		},
		openGraph: {
			title: 'Henzo for Business - Complete Beauty Salon Management',
			description:
				'The all-in-one platform for your beauty business. Manage appointments, clients, and payments all in one place. Start your free trial today.',
			url: '/business',
			siteName: 'Henzo',
			images: [
				{
					url: '/og-business.jpg',
					width: 1200,
					height: 630,
					alt: 'Henzo for Business - Beauty Salon Management Software',
				},
			],
			locale: 'en_US',
			type: 'website',
		},
		twitter: {
			card: 'summary_large_image',
			title: 'Henzo for Business - Beauty Salon Management Software',
			description:
				'Grow your beauty business with complete salon management tools. Appointment booking, client management, and more.',
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
};