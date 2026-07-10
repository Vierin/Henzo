import type { Locale } from '@/i18n/routing';

/** Static public routes with locale-prefixed URLs (`/en/...`, `/ru/...`, `/vi/...`). */
export type PublicPageId =
  | 'home'
  | 'business'
  | 'about'
  | 'contact'
  | 'terms'
  | 'privacy'
  | 'blog';

export type PageSeoCopy = {
  title: string;
  description: string;
  keywords?: string[];
};

/** Path after locale (e.g. `/contact`). Home uses `''`. */
export const PAGE_PATHS: Record<PublicPageId, string> = {
  home: '',
  business: '/business',
  about: '/about',
  contact: '/contact',
  terms: '/terms-of-service',
  privacy: '/privacy-policy',
  blog: '/blog',
};

export const PAGE_OG_IMAGES: Record<PublicPageId, string> = {
  home: '/og-image.jpg',
  business: '/og-image.jpg',
  about: '/og-about.jpg',
  contact: '/og-contact.jpg',
  terms: '/og-terms.jpg',
  privacy: '/og-privacy.jpg',
  blog: '/og-image.jpg',
};

export const PUBLIC_PAGE_COPY: Record<
  PublicPageId,
  Record<Locale, PageSeoCopy>
> = {
  home: {
    en: {
      title: 'Henzo — Book fitness & wellness classes near you',
      description:
        'Discover and book yoga, pilates, gym, boxing and more. Find classes, studios and trainers in one place.',
      keywords: ['fitness classes', 'book yoga', 'wellness booking', 'Henzo'],
    },
    ru: {
      title: 'Henzo — Запись на фитнес и wellness рядом с вами',
      description:
        'Находите и бронируйте йогу, пилатес, зал, бокс и другие занятия. Классы, студии и тренеры в одном месте.',
      keywords: [
        'фитнес занятия',
        'запись на йогу',
        'бронирование wellness',
        'Henzo',
      ],
    },
    vi: {
      title: 'Henzo — Đặt lớp fitness & wellness gần bạn',
      description:
        'Khám phá và đặt yoga, pilates, gym, boxing và nhiều hơn. Lớp học, studio và huấn luyện viên ở một nơi.',
      keywords: ['lớp fitness', 'đặt yoga', 'đặt lịch wellness', 'Henzo'],
    },
  },
  business: {
    en: {
      title: 'Henzo Fitness — Studio operations in one mobile app',
      description:
        'Run your fitness studio from mobile with scheduling, coach workflows, and booking operations in one place.',
      keywords: ['fitness studio app', 'studio management', 'Henzo Fitness'],
    },
    ru: {
      title: 'Henzo Fitness — управление студией в одном приложении',
      description:
        'Управляйте фитнес-студией с телефона: расписание, тренеры и записи клиентов в едином процессе.',
      keywords: [
        'приложение для фитнес студии',
        'управление студией',
        'Henzo Fitness',
      ],
    },
    vi: {
      title: 'Henzo Fitness — Vận hành studio trên mobile',
      description:
        'Quản lý lịch, huấn luyện viên và đặt chỗ khách hàng trong một ứng dụng duy nhất.',
      keywords: ['ứng dụng fitness studio', 'quản lý studio', 'Henzo Fitness'],
    },
  },
  about: {
    en: {
      title: 'About Henzo Fitness',
      description:
        'Learn how Henzo helps fitness studios streamline bookings and daily operations.',
    },
    ru: {
      title: 'О Henzo Fitness',
      description:
        'Как Henzo помогает фитнес-студиям упростить записи и ежедневные операции.',
    },
    vi: {
      title: 'Ve Henzo Fitness',
      description:
        'Tim hieu cach Henzo giup studio fitness toi uu dat lich va van hanh hang ngay.',
    },
  },
  contact: {
    en: {
      title: 'Contact Henzo Fitness',
      description:
        'Talk to our team about onboarding your fitness studio to Henzo.',
    },
    ru: {
      title: 'Контакты Henzo Fitness',
      description:
        'Свяжитесь с нами по вопросам подключения вашей фитнес-студии.',
    },
    vi: {
      title: 'Lien he Henzo Fitness',
      description:
        'Lien he doi ngu Henzo de bat dau van hanh studio fitness cua ban.',
    },
  },
  terms: {
    en: {
      title: 'Terms of service',
      description: 'Terms and conditions for using Henzo Fitness products.',
    },
    ru: {
      title: 'Условия использования',
      description: 'Условия и правила использования продуктов Henzo Fitness.',
    },
    vi: {
      title: 'Dieu khoan dich vu',
      description: 'Dieu khoan va dieu kien su dung san pham Henzo Fitness.',
    },
  },
  privacy: {
    en: {
      title: 'Privacy policy',
      description:
        'How Henzo Fitness collects, uses, and protects personal data.',
    },
    ru: {
      title: 'Политика конфиденциальности',
      description:
        'Как Henzo Fitness собирает, использует и защищает персональные данные.',
    },
    vi: {
      title: 'Chinh sach bao mat',
      description:
        'Cach Henzo Fitness thu thap, su dung va bao ve du lieu ca nhan.',
    },
  },
  blog: {
    en: {
      title: 'Henzo Blog - Tips for fitness studio owners',
      description:
        'Practical guides on scheduling, retention, and growing your fitness studio with Henzo.',
      keywords: ['fitness studio tips', 'studio management blog', 'Henzo blog'],
    },
    ru: {
      title: 'Блог Henzo - советы для владельцев фитнес-студий',
      description:
        'Практические материалы о расписании, удержании клиентов и росте фитнес-студии с Henzo.',
      keywords: [
        'советы фитнес студия',
        'блог управление студией',
        'Henzo блог',
      ],
    },
    vi: {
      title: 'Blog Henzo - Meo cho chu studio fitness',
      description:
        'Huong dan thuc te ve lich hoc, giu chan khach va phat trien studio fitness voi Henzo.',
      keywords: ['meo studio fitness', 'blog quan ly studio', 'Henzo blog'],
    },
  },
};
