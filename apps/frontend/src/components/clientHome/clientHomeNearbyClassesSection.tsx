import { fetchNearbyClassGroups } from '@/lib/client/fetch-nearby-classes';
import { ClientHomeNearbyClassesCarousel } from '@/components/clientHome/clientHomeNearbyClassesCarousel';
import { getDictionary } from '@/i18n/dictionaries';
import type { Locale } from '@/i18n/routing';

type Props = {
  locale: Locale;
};

export async function ClientHomeNearbyClassesSection({ locale }: Props) {
  const dict = await getDictionary(locale, ['public/homepage']);
  const nearby = dict?.homepage?.client?.nearbyClasses ?? {};

  const copy = {
    titleLead: String(nearby.titleLead ?? 'Classes happening'),
    titleHighlight: String(nearby.titleHighlight ?? 'near you'),
    subtitle: String(
      nearby.subtitle ??
        'Explore upcoming classes at top studios around Da Nang. Book your spot in seconds.',
    ),
    seeAll: String(nearby.seeAll ?? 'See all'),
    today: String(nearby.today ?? 'Today'),
    tomorrow: String(nearby.tomorrow ?? 'Tomorrow'),
  };

  const initialGroups = await fetchNearbyClassGroups(locale, {
    today: copy.today,
    tomorrow: copy.tomorrow,
  });

  return (
    <ClientHomeNearbyClassesCarousel
      initialGroups={initialGroups}
      locale={locale}
      copy={copy}
    />
  );
}
