'use client';

import {
  AppleStoreIcon,
  GooglePlayIcon,
} from '@/components/landing/storeIcons';
import { appStoreUrl, playStoreUrl } from '@/constants/appStores';
import {
  LanguageDropdown,
  type LanguageOption,
} from '@/components/landing/languageDropdown';

type PublicHeaderActionsProps = {
  dropdownRef: React.RefObject<HTMLDivElement | null>;
  isLanguageDropdownOpen: boolean;
  setIsLanguageDropdownOpen: (open: boolean) => void;
  selectedLanguage: string;
  languages: readonly LanguageOption[];
  onLanguageSelect: (lang: LanguageOption) => void;
  hideLanguageSwitcher?: boolean;
  hideGetApp?: boolean;
  getAppHref?: string;
  getAppLabel?: string;
  buttonClassName?: string;
  storeButtonClassName?: string;
  getAppClassName?: string;
};

export function PublicHeaderActions({
  dropdownRef,
  isLanguageDropdownOpen,
  setIsLanguageDropdownOpen,
  selectedLanguage,
  languages,
  onLanguageSelect,
  hideLanguageSwitcher = false,
  hideGetApp = false,
  getAppHref,
  getAppLabel,
  buttonClassName = 'flex items-center gap-1 rounded-full border border-gray-200 bg-white px-2.5 py-2 text-xs font-medium text-[#3F3F3F] transition hover:border-gray-300 sm:gap-2 sm:px-3 sm:py-2.5 sm:text-sm',
  storeButtonClassName = 'hidden sm:inline-flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 bg-white text-[#3F3F3F] transition hover:border-gray-300 sm:h-10 sm:w-10',
  getAppClassName = 'inline-flex items-center rounded-full bg-[#E86D4F] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#d85e42] sm:px-4 sm:py-2.5 sm:text-sm',
}: PublicHeaderActionsProps) {
  return (
    <div className="flex shrink-0 items-center gap-2 sm:gap-3">
      {!hideLanguageSwitcher && (
        <LanguageDropdown
          dropdownRef={dropdownRef}
          isOpen={isLanguageDropdownOpen}
          selectedLanguage={selectedLanguage}
          languages={languages}
          onToggle={() => setIsLanguageDropdownOpen(!isLanguageDropdownOpen)}
          onSelect={onLanguageSelect}
          buttonClassName={buttonClassName}
        />
      )}
      <a
        href={appStoreUrl}
        target="_blank"
        rel="noreferrer"
        aria-label="App Store"
        className={storeButtonClassName}
      >
        <AppleStoreIcon className="h-4 w-4 sm:h-4.5 sm:w-4.5" />
      </a>
      <a
        href={playStoreUrl}
        target="_blank"
        rel="noreferrer"
        aria-label="Google Play"
        className={storeButtonClassName}
      >
        <GooglePlayIcon className="h-4 w-4 sm:h-4.5 sm:w-4.5" />
      </a>
      {!hideGetApp && getAppHref && getAppLabel && (
        <a href={getAppHref} className={getAppClassName}>
          {getAppLabel}
        </a>
      )}
    </div>
  );
}
