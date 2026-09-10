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
          '/owner-dashboard/',
          '/dashboard/',
          '/activity/',
          '/favorites/',
          '/profile/',
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
          '/owner-dashboard/',
          '/dashboard/',
          '/activity/',
          '/favorites/',
          '/profile/',
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
