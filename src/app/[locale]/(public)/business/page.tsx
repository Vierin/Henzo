import { seoConfig } from '@/constants/seoConfig';
import { Metadata } from 'next';
import { Suspense } from 'react';
import { Header } from './components/Header';
import { Hero } from './components/Hero';
import { Features } from './components/Features';
import { Benefits } from './components/Benefits';
import BetaRequestForm from './BetaRequestForm';
import { CTA } from './components/CTA';
import './styles.css';

export const metadata: Metadata = {
	...seoConfig.business,
	other: {
		'google-site-verification': 'your-verification-code',
	},
};

export default function BusinessLandingPage() {
	// Structured data for Business page - Vietnamese market
	const businessStructuredData = {
		'@context': 'https://schema.org',
		'@type': 'SoftwareApplication',
		name: 'Henzo cho Salon',
		alternateName: 'Henzo for Business',
		description:
			'Phần mềm quản lý salon hoàn chỉnh cho Việt Nam. Đặt lịch online, quản lý khách hàng, miễn phí beta testing.',
		url: '/business',
		applicationCategory: 'BusinessApplication',
		operatingSystem: 'Web, iOS, Android',
		offers: {
			'@type': 'Offer',
			price: '0',
			priceCurrency: 'VND',
			description: 'Miễn phí trong период beta testing - Free beta testing',
		},
		featureList: [
			'Đặt lịch online tự động',
			'Quản lý khách hàng',
			'Nhắc hẹn tự động qua email',
			'Lịch làm việc linh hoạt',
			'Báo cáo và thống kê',
			'Hỗ trợ đa ngôn ngữ',
		],
		inLanguage: ['vi', 'en'],
		availableOnDevice: 'Desktop, Mobile, Tablet',
		screenshot: '/og-business.jpg',
	};

	const breadcrumbData = {
		'@context': 'https://schema.org',
		'@type': 'BreadcrumbList',
		itemListElement: [
			{
				'@type': 'ListItem',
				position: 1,
				name: 'Trang chủ',
				item: process.env.NEXT_PUBLIC_FRONTEND_URL || 'https://henzo.app',
			},
			{
				'@type': 'ListItem',
				position: 2,
				name: 'Dành cho Salon',
				item: `${process.env.NEXT_PUBLIC_FRONTEND_URL || 'https://henzo.app'}/business`,
			},
		],
	};

	return (
		<div className="min-h-screen bg-background">
			{/* Structured Data */}
			<script
				type="application/ld+json"
				dangerouslySetInnerHTML={{
					__html: JSON.stringify(businessStructuredData),
				}}
			/>
			<script
				type="application/ld+json"
				dangerouslySetInnerHTML={{
					__html: JSON.stringify(breadcrumbData),
				}}
			/>

			<Suspense fallback={<div className="h-20 bg-white" />}>
				<Header />
			</Suspense>
			<main role="main">
				<Hero />
				<Features />
				<Benefits />
				<CTA />
				<div id="beta-form">
					<BetaRequestForm />
				</div>
			</main>

			<script
				type="application/ld+json"
				dangerouslySetInnerHTML={{
					__html: JSON.stringify({
						'@context': 'https://schema.org',
						'@type': 'SoftwareApplication',
						name: 'Henzo for Business',
						description:
							'The all-in-one platform for your beauty business. Manage appointments, clients, and payments all in one place.',
						url: '/business',
						applicationCategory: 'BusinessApplication',
						operatingSystem: 'Web',
						offers: {
							'@type': 'Offer',
							price: '0',
							priceCurrency: 'USD',
							description: 'Free beta testing period',
						},
						featureList: [
							'Flexible scheduling',
							'Client management',
							'Seamless payments',
							'Online booking',
							'Analytics dashboard',
							'Mobile app',
							'Tablet app',
							'Web app',
						],
						author: {
							'@type': 'Organization',
							name: 'Henzo',
							url: 'https://henzo.app',
						},
						publisher: {
							'@type': 'Organization',
							name: 'Henzo',
							url: 'https://henzo.app',
						},
						breadcrumb: {
							'@type': 'BreadcrumbList',
							itemListElement: [
								{
									'@type': 'ListItem',
									position: 1,
									name: 'Home',
									item: '/',
								},
								{
									'@type': 'ListItem',
									position: 2,
									name: 'Business',
									item: '/business',
								},
							],
						},
					}),
				}}
			/>
		</div>
	);
}
