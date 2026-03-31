import type { Locale } from '@/i18n/routing';

/** Static public routes with locale-prefixed URLs (`/en/...`, `/ru/...`, `/vi/...`). */
export type PublicPageId =
	| 'home'
	| 'salons'
	| 'business'
	| 'about'
	| 'contact'
	| 'terms'
	| 'privacy'
	| 'map';

export type PageSeoCopy = {
	title: string;
	description: string;
	keywords?: string[];
};

/** Path after locale segment (e.g. `/salons`). Home uses `''`. */
export const PAGE_PATHS: Record<PublicPageId, string> = {
	home: '',
	salons: '/salons',
	business: '/business',
	about: '/about',
	contact: '/contact',
	terms: '/terms-of-service',
	privacy: '/privacy-policy',
	map: '/map',
};

export const PAGE_OG_IMAGES: Record<PublicPageId, string> = {
	home: '/og-image.jpg',
	salons: '/og-salons.jpg',
	business: '/og-business.jpg',
	about: '/og-about.jpg',
	contact: '/og-contact.jpg',
	terms: '/og-terms.jpg',
	privacy: '/og-privacy.jpg',
	map: '/og-map.jpg',
};

export const PUBLIC_PAGE_COPY: Record<
	PublicPageId,
	Record<Locale, PageSeoCopy>
> = {
	home: {
		en: {
			title: 'Henzo — Book hair, spa & beauty salons online',
			description:
				'Find and book trusted salons and spas near you. Easy online booking, transparent pricing, and real reviews on Henzo.',
			keywords: [
				'beauty booking',
				'salon booking',
				'spa appointment',
				'book salon online',
				'Henzo',
			],
		},
		ru: {
			title: 'Henzo — онлайн-запись в салоны красоты, спа и барбершопы',
			description:
				'Находите салоны и спа рядом с вами, бронируйте онлайн на Henzo: удобная запись, отзывы и прозрачные цены.',
			keywords: [
				'запись в салон',
				'онлайн запись спа',
				'бронирование салона',
				'Henzo',
			],
		},
		vi: {
			title:
				'Henzo - Đặt Lịch Salon Tóc, Spa, Massage Online | Hà Nội, TP.HCM',
			description:
				'Đặt lịch hẹn làm đẹp online với Henzo tại Việt Nam. Tìm và đặt salon tóc, spa, massage, nail tại Hà Nội, TP.HCM. Đặt lịch dễ dàng, đánh giá tin cậy, giá cả minh bạch.',
			keywords: [
				'đặt lịch salon',
				'đặt lịch spa',
				'salon tóc Hà Nội',
				'spa TP.HCM',
				'đặt lịch làm đẹp',
				'beauty booking Vietnam',
			],
		},
	},
	salons: {
		en: {
			title: 'Find beauty salons & services',
			description:
				'Discover salons, spas, and wellness near you. Book hair, nails, massage, and more online with trusted reviews.',
		},
		ru: {
			title: 'Салоны красоты и услуги рядом с вами',
			description:
				'Выбирайте салоны, спа и wellness поблизости. Онлайн-запись: волосы, ногти, массаж и другие услуги.',
		},
		vi: {
			title: 'Tìm salon & dịch vụ làm đẹp',
			description:
				'Khám phá salon, spa và dịch vụ chăm sóc gần bạn. Đặt lịch tóc, nail, massage trực tuyến với đánh giá thật.',
		},
	},
	business: {
		en: {
			title: 'Henzo for salons — scheduling & client management',
			description:
				'Grow your salon with Henzo: online booking, client management, reminders. Try free during the launch period.',
			keywords: [
				'salon software',
				'salon booking system',
				'spa management',
				'Henzo',
			],
		},
		ru: {
			title: 'Henzo для салонов — запись и клиентская база',
			description:
				'Развивайте салон с Henzo: онлайн-запись, клиенты, напоминания. Пробный период на старте.',
			keywords: [
				'программа для салона',
				'онлайн запись салон',
				'crm салона',
				'Henzo',
			],
		},
		vi: {
			title:
				'Henzo cho Salon - Phần mềm quản lý Salon miễn phí | Đặt lịch Online',
			description:
				'Phát triển salon của bạn với Henzo. Phần mềm quản lý salon hoàn chỉnh: đặt lịch online, quản lý khách hàng, nhắc hẹn tự động. Dùng thử ngay!',
			keywords: [
				'phần mềm quản lý salon',
				'đặt lịch online cho salon',
				'quản lý spa',
				'phần mềm salon Việt Nam',
			],
		},
	},
	about: {
		en: {
			title: 'About Henzo',
			description:
				'Learn how Henzo helps clients book beauty and wellness services and how we partner with salons.',
		},
		ru: {
			title: 'О Henzo',
			description:
				'Узнайте, как Henzo помогает клиентам бронировать beauty-услуги и как мы работаем с салонами.',
		},
		vi: {
			title: 'Về Henzo',
			description:
				'Tìm hiểu sứ mệnh Henzo: kết nối khách hàng với salon và dịch vụ làm đẹp đáng tin cậy.',
		},
	},
	contact: {
		en: {
			title: 'Contact & support',
			description:
				'Get help with booking, your account, billing, or general questions — contact the Henzo team.',
		},
		ru: {
			title: 'Контакты и поддержка',
			description:
				'Помощь с бронированием, аккаунтом, оплатой и другими вопросами — свяжитесь с поддержкой Henzo.',
		},
		vi: {
			title: 'Liên hệ & hỗ trợ',
			description:
				'Nhận trợ giúp về đặt lịch, tài khoản, thanh toán hoặc câu hỏi chung — liên hệ đội ngũ Henzo.',
		},
	},
	terms: {
		en: {
			title: 'Terms of service',
			description:
				'Read the terms and conditions for using the Henzo beauty booking platform.',
		},
		ru: {
			title: 'Условия использования',
			description:
				'Условия использования платформы онлайн-записи Henzo.',
		},
		vi: {
			title: 'Điều khoản dịch vụ',
			description:
				'Điều khoản và điều kiện sử dụng nền tảng đặt lịch Henzo.',
		},
	},
	privacy: {
		en: {
			title: 'Privacy policy',
			description:
				'How Henzo collects, uses, and protects your personal data.',
		},
		ru: {
			title: 'Политика конфиденциальности',
			description:
				'Как Henzo обрабатывает и защищает ваши персональные данные.',
		},
		vi: {
			title: 'Chính sách bảo mật',
			description:
				'Cách Henzo thu thập, sử dụng và bảo vệ dữ liệu cá nhân của bạn.',
		},
	},
	map: {
		en: {
			title: 'Salon map',
			description:
				'Explore beauty salons and spas on the map. Compare locations and book in a few taps.',
		},
		ru: {
			title: 'Карта салонов',
			description:
				'Салоны и спа на карте: выберите удобное место и забронируйте онлайн.',
		},
		vi: {
			title: 'Bản đồ salon',
			description:
				'Xem salon và spa trên bản đồ, so sánh vị trí và đặt lịch nhanh chóng.',
		},
	},
};
