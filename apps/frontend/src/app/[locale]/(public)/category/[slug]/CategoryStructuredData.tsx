interface CategoryStructuredDataProps {
	category: {
		id: number;
		name: string;
		description?: string;
		slug: string;
	};
	translatedName: string;
}

export default function CategoryStructuredData({
	category,
	translatedName,
}: CategoryStructuredDataProps) {
	// Basic structured data without salon list (will be added by client component)
	return (
		<script
			type="application/ld+json"
			dangerouslySetInnerHTML={{
				__html: JSON.stringify({
					'@context': 'https://schema.org',
					'@type': 'CollectionPage',
					name: `${translatedName} Salons`,
					description: `Find the best ${translatedName.toLowerCase()} salons and services. Professional ${translatedName.toLowerCase()} treatments and appointments.`,
					url: `/category/${category.slug}`,
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
								name: 'Salons',
								item: '/salons',
							},
							{
								'@type': 'ListItem',
								position: 3,
								name: category.name,
								item: `/category/${category.slug}`,
							},
						],
					},
				}),
			}}
		/>
	);
}

