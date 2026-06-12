import PublicHeader from '@/components/PublicHeader';
import { withLocale, type Locale } from '@/i18n/routing';

type LegalPageHeaderProps = {
  locale: Locale;
  hideLanguageSwitcher?: boolean;
};

export function LegalPageHeader({
  locale,
  hideLanguageSwitcher = false,
}: LegalPageHeaderProps) {
  const homePath = withLocale('/', locale);

  return (
    <div className="bg-[#3F3287] px-4 pt-0 pb-8">
      <header className="mx-auto w-full max-w-6xl rounded-b-[1.35rem] bg-[#FDF5F0] sm:rounded-b-[1.75rem]">
        <PublicHeader
          embedded
          sectionNavHref={homePath}
          hideLanguageSwitcher={hideLanguageSwitcher}
        />
      </header>
    </div>
  );
}
