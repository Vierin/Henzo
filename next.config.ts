import type { NextConfig } from 'next';
import path from 'path';

const nextConfig: NextConfig = {
	webpack: (config) => {
		config.resolve.alias = {
			...config.resolve.alias,
			'@db': path.resolve(__dirname, '../../packages/db'),
		};
		return config;
	},
};

export default nextConfig;
