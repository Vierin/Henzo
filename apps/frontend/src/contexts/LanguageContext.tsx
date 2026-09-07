'use client';

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
  ReactNode,
} from 'react';
import { usePathname } from 'next/navigation';
import {
  extractLocaleFromPath,
  isLocale,
  stripLocaleFromPath,
  type Locale,
} from '@/i18n/routing';
import {
  useTranslations as useBaseTranslations,
  useModuleTranslations,
} from '@/i18n/useTranslations';
import type { TranslationModule } from '@/i18n/modules';
import LoadingFallback from '@/components/LoadingFallback';

type Language = Locale;

// Helper function to get nested translation by path
function getNestedTranslation(obj: any, path: string): string {
  const result = path.split('.').reduce((current: any, key: string) => {
    return current?.[key];
  }, obj);
  // If result is undefined, null, or empty string, return the path as fallback
  if (result === undefined || result === null || result === '') {
    return path;
  }
  return result;
}

type Dictionary = {
  [key: string]: any;
};

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: Dictionary & ((path: string) => string);
}

const LanguageContext = createContext<LanguageContextType | undefined>(
  undefined,
);

interface LanguageProviderProps {
  children: ReactNode;
  initialDictionary?: any; // Base dictionary loaded on server
}

export function LanguageProvider({
  children,
  initialDictionary,
}: LanguageProviderProps) {
  const [language, setLanguageState] = useState<Language>('en');
  const pathname = usePathname();

  // Get initial dictionary from window object (set by server via script tag)
  // Use useState to read it once on mount, before React hydration
  const [serverDictionary] = useState(() => {
    if (typeof window !== 'undefined') {
      // Объединяем базовый словарь и словарь для главной страницы
      const baseDict = (window as any).__INITIAL_DICTIONARY__ || {};
      const homepageDict = (window as any).__HOMEPAGE_DICTIONARY__ || {};
      // Объединяем их, приоритет у homepageDict
      return {
        ...baseDict,
        ...homepageDict,
      };
    }
    return undefined;
  });

  // Use initialDictionary prop if provided, otherwise try window object, otherwise undefined
  const effectiveInitialDictionary = initialDictionary || serverDictionary;

  // Determine which modules to load based on current path
  const pathNoLocale = stripLocaleFromPath(pathname);
  const isOwnerPage =
    pathNoLocale.startsWith('/owner-dashboard') ||
    pathNoLocale.startsWith('/salon-info') ||
    pathNoLocale.startsWith('/services') ||
    pathNoLocale.startsWith('/trainings') ||
    pathNoLocale.startsWith('/staff') ||
    pathNoLocale.startsWith('/calendar') ||
    pathNoLocale.startsWith('/marketing') ||
    pathNoLocale.startsWith('/profile-settings') ||
    pathNoLocale.startsWith('/subscription') ||
    pathNoLocale.startsWith('/clients') ||
    pathNoLocale.startsWith('/owner-help') ||
    pathNoLocale.startsWith('/business/complete-setup');

  const isClientPage =
    pathNoLocale.startsWith('/activity') ||
    pathNoLocale.startsWith('/favorites') ||
    pathNoLocale.startsWith('/profile') ||
    pathNoLocale.startsWith('/dashboard') ||
    pathNoLocale.startsWith('/reviews') ||
    pathNoLocale.startsWith('/settings');

  // Determine public module based on path (declare early as it may be used in owner module logic)
  const publicModules: TranslationModule[] = [];

  // Determine specific owner module based on path
  let ownerModule: TranslationModule | undefined;
  if (pathNoLocale.startsWith('/owner-dashboard')) {
    ownerModule = 'owner/dashboard';
    // Booking module needed for BookingModal component
    publicModules.push('public/booking');
    // Auth module needed for BookingAuthForm in BookingModal
    publicModules.push('shared/auth');
    // Homepage module needed for minutesShort translation
    publicModules.push('public/homepage');
  } else if (pathNoLocale.startsWith('/salon-info')) {
    ownerModule = 'owner/salonInfo';
  } else if (pathNoLocale.startsWith('/profile-settings')) {
    ownerModule = 'owner/profileSettings';
  } else if (
    pathNoLocale.startsWith('/services') ||
    pathNoLocale.startsWith('/trainings')
  ) {
    if (pathNoLocale.includes('/new')) {
      ownerModule = 'owner/servicesNew';
      // Load categories module for category selector
      publicModules.push('public/categories');
    } else {
      ownerModule = 'owner/services';
    }
  } else if (pathNoLocale.startsWith('/business/complete-setup')) {
    ownerModule = 'owner/onboarding';
  } else if (pathNoLocale.startsWith('/staff')) {
    if (pathNoLocale.includes('/new')) {
      ownerModule = 'owner/staffNew';
    } else {
      ownerModule = 'owner/staff';
    }
  } else if (pathNoLocale.startsWith('/calendar')) {
    ownerModule = 'owner/calendar';
    // Booking module needed for BookingModal component
    publicModules.push('public/booking');
    // Auth module needed for BookingAuthForm in BookingModal
    publicModules.push('shared/auth');
    // Homepage module needed for minutesShort translation
    publicModules.push('public/homepage');
    // Core weekdays module needed for calendar weekday translations
    publicModules.push('core/weekdays');
  } else if (pathNoLocale.startsWith('/subscription')) {
    ownerModule = 'owner/subscription';
  } else if (pathNoLocale.startsWith('/clients')) {
    ownerModule = 'owner/clients';
  } else if (pathNoLocale.startsWith('/owner-help')) {
    ownerModule = 'owner/help';
  }

  // Check for homepage (root path)
  if (pathNoLocale === '/' || pathNoLocale === '' || !pathNoLocale) {
    // Categories are also used on homepage
    publicModules.push('public/homepage', 'public/categories');
    // Salon module needed for salon detail page
    publicModules.push('public/salon');
    // Booking module needed for DateTimePicker component (selectTime, timeIntervals)
    publicModules.push('public/booking');
  } else if (pathNoLocale.startsWith('/salon/')) {
    publicModules.push('public/salon');
    publicModules.push('public/booking');
    publicModules.push('shared/auth');
    publicModules.push('public/homepage');
    publicModules.push('public/categories');
  } else if (pathNoLocale.startsWith('/studio/')) {
    publicModules.push('public/appOpen', 'public/homepage');
  } else if (pathNoLocale.startsWith('/class')) {
    // Class share landing (AppOpenLanding)
    publicModules.push('public/appOpen');
  } else if (pathNoLocale.startsWith('/trainer-invite')) {
    // Trainer invite landing (AppOpenLanding)
    publicModules.push('public/appOpen');
  } else if (pathNoLocale.startsWith('/studio-claim')) {
    // Studio claim landing (AppOpenLanding)
    publicModules.push('public/appOpen');
  } else if (pathNoLocale.startsWith('/bookings/')) {
    publicModules.push('public/booking');
  } else if (pathNoLocale.startsWith('/booking')) {
    publicModules.push('public/booking');
    // Auth module needed for booking-confirmed page
    publicModules.push('shared/auth');
  } else if (pathNoLocale.startsWith('/category/')) {
    publicModules.push('public/categories');
    publicModules.push('public/homepage');
    publicModules.push('public/salon');
  } else if (
    pathNoLocale.startsWith('/studios') ||
    pathNoLocale.startsWith('/salons')
  ) {
    publicModules.push('public/homepage', 'public/categories');
    publicModules.push('public/salon');
  } else if (pathNoLocale.startsWith('/map')) {
    publicModules.push('public/map');
    // Categories module needed for category filter buttons
    publicModules.push('public/categories');
  } else if (
    pathNoLocale.startsWith('/business/login') ||
    pathNoLocale.startsWith('/business/register')
  ) {
    publicModules.push('shared/auth', 'public/homepage');
  } else if (pathNoLocale.startsWith('/business/complete-setup')) {
    // Keep salonInfo + onboarding keys available for setup flow
    ownerModule = 'owner/onboarding';
    publicModules.push('public/business');
    publicModules.push('core/weekdays');
  } else if (pathNoLocale.startsWith('/business')) {
    publicModules.push('public/business', 'public/homepage');
  } else if (pathNoLocale.startsWith('/contact')) {
    publicModules.push('public/contact');
  } else if (pathNoLocale.startsWith('/about')) {
    publicModules.push('public/about');
  } else if (pathNoLocale.startsWith('/blog')) {
    publicModules.push('public/blog', 'public/homepage');
  } else if (
    pathNoLocale.startsWith('/login') ||
    pathNoLocale.startsWith('/register') ||
    pathNoLocale.startsWith('/forgot-password') ||
    pathNoLocale.startsWith('/check-email')
  ) {
    publicModules.push('shared/auth');
  }

  // Load notFound module for 404 pages (when path doesn't match any known route)
  // This will be loaded if no other modules match
  if (
    publicModules.length === 0 &&
    !ownerModule &&
    !isClientPage &&
    !isOwnerPage
  ) {
    publicModules.push('public/notFound');
  }

  // Use initial dictionary from server if provided, otherwise load base modules
  // Only call useBaseTranslations if we don't have initialDictionary to avoid unnecessary loading
  const baseTFromHook = useBaseTranslations();
  const baseT = useMemo(() => {
    // If we have initial dictionary from server (via prop or window), use it immediately
    // This prevents the flash of translation keys
    if (
      effectiveInitialDictionary &&
      Object.keys(effectiveInitialDictionary).length > 0
    ) {
      return effectiveInitialDictionary;
    }
    // Fallback to hook result (for cases where initialDictionary is not provided)
    return baseTFromHook;
  }, [effectiveInitialDictionary, baseTFromHook]);

  // Load additional modules based on page type
  const modulesToLoad: TranslationModule[] = [];
  if (ownerModule) {
    modulesToLoad.push(ownerModule);
  }
  if (isOwnerPage) {
    // Always load dashboard module for navigation (sidebar uses it)
    modulesToLoad.push('owner/dashboard');
    // Load services and staff modules for navigation (sidebar uses them)
    modulesToLoad.push('owner/services', 'owner/staff');
    modulesToLoad.push('owner/feedback');
    // Load onboarding module for OnboardingChecklist component on dashboard
    modulesToLoad.push('owner/onboarding');
    // Load header module for OwnerHeader component
    modulesToLoad.push('ui/header');
    // Load footer module for footer links in header dropdown
    modulesToLoad.push('ui/footer');
    // Load servicesNew module for EditServiceModal translations on /services page
    if (
      pathNoLocale.startsWith('/services') &&
      !pathNoLocale.includes('/new')
    ) {
      modulesToLoad.push('owner/servicesNew');
    }
  }
  // Add all public modules (can be multiple for homepage)
  modulesToLoad.push(...publicModules);
  if (isClientPage) {
    // Load all client modules since ClientSidebar uses translations from all of them
    modulesToLoad.push(
      'client/dashboard',
      'client/favorites',
      'client/reviews',
      'client/settings',
    );
    // Booking module needed for BookingModal component on client pages
    publicModules.push('public/booking');
    publicModules.push('shared/auth');
  }
  // Load shared/auth for login, register, and check-email pages
  if (
    pathNoLocale.startsWith('/login') ||
    pathNoLocale.startsWith('/register') ||
    pathNoLocale.startsWith('/check-email')
  ) {
    modulesToLoad.push('shared/auth');
  }
  // Load public/salon for admin salons-data page
  if (pathNoLocale.startsWith('/admin-panel/salons-data')) {
    modulesToLoad.push('public/salon');
  }

  const { dictionary: additionalDict, isLoading: isAdditionalLoading } =
    useModuleTranslations(modulesToLoad, language);

  // Deep merge function for nested objects
  const deepMerge = (target: any, source: any) => {
    for (const key in source) {
      if (source.hasOwnProperty(key)) {
        if (
          typeof source[key] === 'object' &&
          source[key] !== null &&
          !Array.isArray(source[key]) &&
          typeof target[key] === 'object' &&
          target[key] !== null &&
          !Array.isArray(target[key])
        ) {
          target[key] = deepMerge(target[key], source[key]);
        } else {
          target[key] = source[key];
        }
      }
    }
    return target;
  };

  // Merge base and additional translations
  const t = useMemo(() => {
    // baseT может быть Proxy из useBaseTranslations, поэтому используем effectiveInitialDictionary если он есть
    // Иначе пытаемся извлечь данные из baseT
    let baseToMerge: any = {};

    if (
      effectiveInitialDictionary &&
      Object.keys(effectiveInitialDictionary).length > 0
    ) {
      // Используем словарь с сервера (приоритет)
      baseToMerge = effectiveInitialDictionary;
    } else if (baseT) {
      // Если baseT это Proxy, пытаемся извлечь известные ключи
      // Для главной страницы проверяем наличие homepage
      if (baseT.homepage) {
        baseToMerge.homepage = baseT.homepage;
      }
      // Копируем другие известные ключи из baseT
      const knownKeys = [
        'common',
        'meta',
        'navigation',
        'header',
        'footer',
        'cookieBanner',
        'forms',
        'auth',
      ];
      for (const key of knownKeys) {
        if (baseT[key]) {
          baseToMerge[key] = baseT[key];
        }
      }
    }

    const merged = { ...baseToMerge };
    if (additionalDict && Object.keys(additionalDict).length > 0) {
      // Deep merge to preserve nested objects
      deepMerge(merged, additionalDict);
    }

    return merged;
  }, [baseT, additionalDict, pathNoLocale, effectiveInitialDictionary]);

  // Load language from storage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedLanguage = window.localStorage.getItem('henzo-language');
      if (savedLanguage && isLocale(savedLanguage)) {
        setLanguageState(savedLanguage);
      }
    }
  }, []);

  // Derive language from URL on first load and when path changes
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const locale = extractLocaleFromPath(pathname) ?? 'en';
    setLanguageState(locale);
    window.localStorage.setItem('henzo-language', locale);
    document.documentElement.lang = locale;
    document.documentElement.dir = 'ltr';
  }, [pathname]);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);

    if (typeof window !== 'undefined') {
      window.localStorage.setItem('henzo-language', lang);

      // Update document language attribute
      document.documentElement.lang = lang;

      // Update document direction if needed (Vietnamese uses LTR)
      document.documentElement.dir = 'ltr';
    }
  };

  // Create a function wrapper that supports both object access and string path access
  // Use Proxy to automatically handle both t('path.to.key') and t.path.to.key
  const tWrapper = useMemo(() => {
    const baseFunction = ((path: string) =>
      getNestedTranslation(t, path)) as any;

    const createProxy = (prefix = ''): any => {
      return new Proxy(baseFunction, {
        get: (_target, prop: string) => {
          // If accessing as function, return the function
          if (
            prop === 'apply' ||
            prop === 'call' ||
            prop === 'bind' ||
            prop === 'toString'
          ) {
            return baseFunction[prop];
          }
          // Build the full path
          const fullPath = prefix ? `${prefix}.${prop}` : prop;
          // Try to get from translations object
          const value = prefix ? getNestedTranslation(t, fullPath) : t[prop];

          // If it's an object, return a proxy for nested access
          if (
            value !== undefined &&
            typeof value === 'object' &&
            value !== null &&
            !Array.isArray(value)
          ) {
            return createProxy(fullPath);
          }

          // If value exists, return it
          if (value !== undefined) {
            return value;
          }

          // Return a proxy for nested access that will resolve on next property access
          return createProxy(fullPath);
        },
      });
    };

    return createProxy() as Dictionary & ((path: string) => string);
  }, [t]);

  const value: LanguageContextType = useMemo(
    () => ({
      language,
      setLanguage,
      t: tWrapper as Dictionary & ((path: string) => string),
    }),
    [language, setLanguage, tWrapper],
  );

  const isPublicPage = !isOwnerPage && !isClientPage;
  const shouldShowTranslationLoader =
    isPublicPage && modulesToLoad.length > 0 && isAdditionalLoading;

  return (
    <LanguageContext.Provider value={value}>
      {shouldShowTranslationLoader ? (
        <LoadingFallback message="" fullScreen={true} />
      ) : (
        children
      )}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}

// Helper hook for easy translation access
export function useTranslation() {
  const { t } = useLanguage();
  return t;
}
