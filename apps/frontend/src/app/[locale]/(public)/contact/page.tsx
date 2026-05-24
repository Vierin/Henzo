import React, { Suspense } from 'react';
import type { Metadata } from 'next';
import { buildStaticPageMetadata, resolveLocale } from '@/seo';
import ContactPageClient from './ContactPageClient';
import LoadingFallback from '@/components/LoadingFallback';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale: raw } = await params;
  return buildStaticPageMetadata('contact', resolveLocale(raw));
}

export default function ContactPage() {
  return (
    <>
      <Suspense fallback={<LoadingFallback />}>
        <ContactPageClient />
      </Suspense>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'ContactPage',
            name: 'Contact Henzo',
            description:
              'Get in touch with Henzo support team. Find help with booking, account issues, billing questions, or general inquiries.',
            url: '/contact',
            mainEntity: {
              '@type': 'Organization',
              name: 'Henzo',
              email: 'hello@henzo.app',
              url: 'https://henzo.app',
              contactPoint: {
                '@type': 'ContactPoint',
                email: 'hello@henzo.app',
                contactType: 'customer service',
                areaServed: 'Worldwide',
                availableLanguage: ['English'],
              },
            },
          }),
        }}
      />
    </>
  );
}
