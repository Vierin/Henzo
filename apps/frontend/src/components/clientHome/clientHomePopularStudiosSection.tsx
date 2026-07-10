import { fetchPopularStudios } from '@/lib/client/fetch-popular-studios';
import { ClientHomePopularStudiosCarousel } from '@/components/clientHome/clientHomePopularStudiosCarousel';
import { getDictionary } from '@/i18n/dictionaries';
import type { Locale } from '@/i18n/routing';

type Props = {
  locale: Locale;
};

export async function ClientHomePopularStudiosSection({ locale }: Props) {
  const [studios, dict] = await Promise.all([
    fetchPopularStudios(8),
    getDictionary(locale, ['public/homepage']),
  ]);

  const popular = dict?.homepage?.client?.popularStudios ?? {};
  const title = String(popular.title ?? 'Popular studios near you');
  const seeAllLabel = String(popular.seeAll ?? 'See all studios');

  return (
    <ClientHomePopularStudiosCarousel
      initialStudios={studios}
      locale={locale}
      title={title}
      seeAllLabel={seeAllLabel}
    />
  );
}
