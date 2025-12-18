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
	// P1: Ускорение dev компиляции
	experimental: {
		// Ускоряет компиляцию в dev режиме
		optimizePackageImports: [
			'lucide-react',
			'@radix-ui/react-popover',
			'@radix-ui/react-select',
			'@tanstack/react-query',
			'react-hot-toast',
		],
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
		// P1: Оптимизация изображений для production
		formats: ['image/avif', 'image/webp'], // Современные форматы
		minimumCacheTTL: 60, // Кэш изображений
		deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
		imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
	},
	webpack: (config, { isServer, dev }) => {
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

		// P1: Ускорение dev компиляции
		if (dev) {
			// Next.js 15 автоматически управляет кэшем, не нужно настраивать вручную
			// Ручная настройка может вызывать конфликты с PackFileCacheStrategy
			
			// Ускоряем компиляцию за счет уменьшения проверок
			config.watchOptions = {
				poll: false,
				aggregateTimeout: 300,
				ignored: ['**/node_modules', '**/.git', '**/.next'],
			};
		}

		return config;
	},
	// P1: Compression (Next.js автоматически использует gzip/brotli)
	compress: true,
	// P1: Production source maps отключены для меньшего bundle
	productionBrowserSourceMaps: false,
	// P1: Оптимизация для production
	swcMinify: true, // Использовать SWC для минификации (быстрее чем Terser)
	poweredByHeader: false, // Убрать X-Powered-By header
};

export default withBundleAnalyzer(nextConfig);
