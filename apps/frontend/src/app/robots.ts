import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_FRONTEND_URL || 'https://henzo.app';

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/admin/',
          '/owner/',
          '/owner-dashboard/',
          '/dashboard/',
          '/category/',
          '/map/',
          '/business/',
          '/bookings/',
          '/booking-confirmed/',
          '/api/',
          '/_next/',
          '/private/',
        ],
      },
      {
        userAgent: 'Googlebot',
        allow: '/',
        disallow: [
          '/admin/',
          '/owner/',
          '/owner-dashboard/',
          '/dashboard/',
          '/salons/',
          '/category/',
          '/map/',
          '/business/',
          '/bookings/',
          '/booking-confirmed/',
          '/api/',
          '/_next/',
          '/private/',
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  };
}
