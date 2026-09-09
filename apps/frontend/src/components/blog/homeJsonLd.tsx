import type { Locale } from '@/i18n/routing';
import { localizedPath, siteBaseUrl } from '@/seo';

type HomeJsonLdProps = {
  locale: Locale;
};

export function HomeJsonLd({ locale }: HomeJsonLdProps) {
  const base = siteBaseUrl().replace(/\/$/, '');
  const homeUrl = `${base}${localizedPath(locale, '')}`;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': `${base}/#organization`,
        name: 'Henzo',
        url: base,
        logo: `${base}/logo.png`,
        email: 'hello@henzo.app',
        sameAs: [
          'https://www.facebook.com/profile.php?id=61581892591997',
          'https://www.instagram.com/henzo.app/',
        ],
      },
      {
        '@type': 'WebSite',
        '@id': `${base}/#website`,
        name: 'Henzo',
        url: base,
        publisher: { '@id': `${base}/#organization` },
        inLanguage: ['en', 'ru', 'vi', 'cs', 'pl', 'es'],
      },
      {
        '@type': 'SoftwareApplication',
        name: 'Henzo Fitness',
        applicationCategory: 'BusinessApplication',
        operatingSystem: 'iOS, Android',
        url: homeUrl,
        offers: {
          '@type': 'Offer',
          price: '0',
          priceCurrency: 'USD',
        },
        publisher: { '@id': `${base}/#organization` },
      },
    ],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}
