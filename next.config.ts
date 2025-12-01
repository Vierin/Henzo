import type { NextConfig } from 'next';
import path from 'path';

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
	webpack: (config) => {
		config.resolve.alias = {
			...config.resolve.alias,
			'@db': path.resolve(__dirname, '../../packages/db'),
		};
		return config;
	},
};

export default nextConfig;
