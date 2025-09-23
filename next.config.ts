import type { NextConfig } from 'next';
import path from 'path';

const nextConfig: NextConfig = {
	eslint: {
		ignoreDuringBuilds: true,
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
