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
};
