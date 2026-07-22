import type { Locale } from '@/i18n/routing';

/** Static public routes with locale-prefixed URLs (`/en/...`, `/ru/...`, `/vi/...`, `/cs/...`, `/pl/...`). */
export type PublicPageId =
  | 'home'
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
  about: '/about',
  contact: '/contact',
  terms: '/terms-of-service',
  privacy: '/privacy-policy',
  blog: '/blog',
};

export const PAGE_OG_IMAGES: Record<PublicPageId, string> = {
  home: '/og-image.jpg',
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
      title: 'Henzo Fitness - Studio operations in one mobile app',
      description:
        'Run your fitness studio from mobile with scheduling, coach workflows, and booking operations in one place.',
      keywords: ['fitness studio app', 'studio management', 'Henzo Fitness'],
    },
    ru: {
      title: 'Henzo Fitness - управление студией в одном приложении',
      description:
        'Управляйте фитнес-студией с телефона: расписание, тренеры и записи клиентов в едином процессе.',
      keywords: [
        'приложение для фитнес студии',
        'управление студией',
        'Henzo Fitness',
      ],
    },
    vi: {
      title: 'Henzo Fitness - Van hanh studio tren mobile',
      description:
        'Quan ly lich, huan luyen vien va dat cho khach hang trong mot ung dung duy nhat.',
      keywords: ['ung dung fitness studio', 'quan ly studio', 'Henzo Fitness'],
    },
    cs: {
      title: 'Henzo Fitness - provoz studia v jedné mobilní aplikaci',
      description:
        'Spravujte fitness studio z mobilu: rozvrh, workflow trenérů a rezervace na jednom místě.',
      keywords: [
        'aplikace pro fitness studio',
        'správa studia',
        'Henzo Fitness',
      ],
    },
    pl: {
      title: 'Henzo Fitness - operacje studia w jednej aplikacji mobilnej',
      description:
        'Prowadź studio fitness z telefonu: grafik, workflow trenerów i rezerwacje w jednym miejscu.',
      keywords: [
        'aplikacja do studia fitness',
        'zarządzanie studiem',
        'Henzo Fitness',
      ],
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
    cs: {
      title: 'O Henzo Fitness',
      description:
        'Jak Henzo pomáhá fitness studiím zjednodušit rezervace a denní provoz.',
    },
    pl: {
      title: 'O Henzo Fitness',
      description:
        'Jak Henzo pomaga studiom fitness uprościć rezerwacje i codzienną operacyjkę.',
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
    cs: {
      title: 'Kontakt Henzo Fitness',
      description:
        'Ozvěte se nám ohledně připojení vašeho fitness studia k Henzo.',
    },
    pl: {
      title: 'Kontakt Henzo Fitness',
      description:
        'Skontaktuj się z nami w sprawie podłączenia Twojego studia fitness do Henzo.',
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
    cs: {
      title: 'Obchodní podmínky',
      description: 'Podmínky používání produktů Henzo Fitness.',
    },
    pl: {
      title: 'Regulamin',
      description: 'Warunki korzystania z produktów Henzo Fitness.',
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
    cs: {
      title: 'Zásady ochrany osobních údajů',
      description:
        'Jak Henzo Fitness shromažďuje, používá a chrání osobní údaje.',
    },
    pl: {
      title: 'Polityka prywatności',
      description:
        'Jak Henzo Fitness zbiera, wykorzystuje i chroni dane osobowe.',
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
    cs: {
      title: 'Blog Henzo - tipy pro majitele fitness studií',
      description:
        'Praktické návody k rozvrhu, retenci a růstu fitness studia s Henzo.',
      keywords: ['tipy pro fitness studio', 'blog správa studia', 'Henzo blog'],
    },
    pl: {
      title: 'Blog Henzo - wskazówki dla właścicieli studiów fitness',
      description:
        'Praktyczne poradniki o grafiku, retencji i rozwoju studia fitness z Henzo.',
      keywords: [
        'wskazówki studio fitness',
        'blog zarządzanie studiem',
        'Henzo blog',
      ],
    },
  },
};
