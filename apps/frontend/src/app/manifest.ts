import { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Henzo - Đặt lịch làm đẹp Việt Nam',
    short_name: 'Henzo',
    description:
      'Đặt lịch salon tóc, spa, massage online tại Việt Nam. Hà Nội, TP.HCM.',
    start_url: '/',
    display: 'standalone',
    background_color: '#fff7f6',
    theme_color: '#ff5b5b',
    icons: [
      {
        src: '/logo.png',
        sizes: 'any',
        type: 'image/png',
      },
    ],
    categories: ['lifestyle', 'health'],
    lang: 'vi',
  };
}
