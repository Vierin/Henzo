import type { NextConfig } from 'next';
import path from 'path';

// P1: Bundle analyzer (optional, enable with ANALYZE=true)
const withBundleAnalyzer = require('@next/bundle-analyzer')({
	enabled: process.env.ANALYZE === 'true',
});

const nextConfig: NextConfig = {
	eslint: {
		// Enable ESLint during builds to catch errors
		ignoreDuringBuilds: false,
	},
	typescript: {
		// Enable TypeScript errors during builds
		ignoreBuildErrors: false,
	},
	compiler: {
		// Remove console.log in production (keep error and warn)
		removeConsole:
			process.env.NODE_ENV === 'production'
				? { exclude: ['error', 'warn'] }
				: false,
	},
	images: {
		remotePatterns: [
			{
				protocol: 'https',
				hostname: '*.supabase.co',
				port: '',
				pathname: '/storage/v1/object/public/**',
			},
			{
				protocol: 'https',
				hostname: 'cdnjs.cloudflare.com',
				port: '',
				pathname: '/ajax/libs/leaflet/**',
			},
			{
				protocol: 'https',
				hostname: 'images.unsplash.com',
				port: '',
				pathname: '/**',
			},
		],
	},
	webpack: (config, { isServer }) => {
		config.resolve.alias = {
			...config.resolve.alias,
			'@db': path.resolve(__dirname, '../../packages/db'),
		};

		// P1: Tree shaking для неиспользуемого кода
		// usedExports удалено - конфликтует с cacheUnaffected в Next.js 15
		// Next.js уже включает usedExports по умолчанию
		config.optimization = {
			...config.optimization,
			sideEffects: false,
		};

		// P1: Lazy load puppeteer только на сервере
		if (isServer) {
			config.externals = config.externals || [];
			config.externals.push('puppeteer');
		}

		return config;
	},
	// P1: Compression (Next.js автоматически использует gzip/brotli)
	compress: true,
	// P1: Production source maps отключены для меньшего bundle
	productionBrowserSourceMaps: false,
};

export default withBundleAnalyzer(nextConfig);
