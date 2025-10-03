import { Metadata } from 'next';
import { getCategoryBySlug } from '@/constants/categories';
import CategoryList from './CategoryList';
import Link from 'next/link';

interface CategoryPageProps {
	params: {
		slug: string;
	};
}

export async function generateMetadata({
	params,
}: CategoryPageProps): Promise<Metadata> {
	const { slug } = await params;
	const category = getCategoryBySlug(slug);

	if (!category) {
		return {
			title: 'Category Not Found | Henzo',
			description: 'The requested category could not be found.',
		};
	}

	const title = `${category.name} Salons & Services | Henzo`;
	const description = `Find the best ${category.name.toLowerCase()} salons near you. ${category.description || `Professional ${category.name.toLowerCase()} services and treatments.`} Book appointments online with trusted reviews and flexible scheduling.`;

	const keywords = [
		category.name.toLowerCase(),
		`${category.name.toLowerCase()} salon`,
		`${category.name.toLowerCase()} services`,
		`${category.name.toLowerCase()} appointments`,
		`${category.name.toLowerCase()} booking`,
		'beauty salon',
		'wellness services',
		'salon near me',
		'beauty treatments',
		'online booking',
		...category.name
			.toLowerCase()
			.split(' & ')
			.map((word) => word.trim()),
	];

	return {
		title,
		description,
		keywords,
		authors: [{ name: 'Henzo' }],
		creator: 'Henzo',
		publisher: 'Henzo',
		alternates: {
			canonical: `/category/${slug}`,
		},
		openGraph: {
			title,
			description,
			url: `/category/${slug}`,
			siteName: 'Henzo',
			images: [
				{
					url: '/og-image.jpg',
					width: 1200,
					height: 630,
					alt: `${category.name} Salons | Henzo`,
				},
			],
			locale: 'en_US',
			type: 'website',
		},
		twitter: {
			card: 'summary_large_image',
			title,
			description,
			images: ['/og-image.jpg'],
			creator: '@henzo',
		},
		robots: {
			index: true,
			follow: true,
			nocache: false,
			googleBot: {
				index: true,
				follow: true,
				noimageindex: false,
				'max-video-preview': -1,
				'max-image-preview': 'large',
				'max-snippet': -1,
			},
		},
	};
}

export default async function CategoryPage({ params }: CategoryPageProps) {
	const { slug } = await params;
	const category = getCategoryBySlug(slug);

	// If category not found, show 404
	if (!category) {
		return (
			<div className="min-h-screen bg-[#F8F5F2]">
				<div className="container mx-auto px-4 py-8">
					<div className="text-center">
						<h1 className="text-4xl font-bold text-gray-900 mb-4">
							Category Not Found
						</h1>
						<p className="text-gray-600 mb-8">
							The category you're looking for doesn't exist.
						</p>
						<Link
							href="/"
							className="inline-flex items-center px-6 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
						>
							Back to Home
						</Link>
					</div>
				</div>
			</div>
		);
	}

	return <CategoryList category={category} />;
}
