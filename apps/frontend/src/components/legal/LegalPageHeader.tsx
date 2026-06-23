import PublicHeader from '@/components/PublicHeader';
import type { Locale } from '@/i18n/routing';

type LegalPageHeaderProps = {
  locale: Locale;
  hideLanguageSwitcher?: boolean;
};

export function LegalPageHeader({
  hideLanguageSwitcher = false,
}: LegalPageHeaderProps) {
  return <PublicHeader hideLanguageSwitcher={hideLanguageSwitcher} />;
}
