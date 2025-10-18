import { Suspense } from 'react';
import FavoritesClient from './FavoritesClient';
import LoadingSpinner from '@/components/LoadingSpinner';

export const metadata = {
	title: 'Favorite Salons | Henzo',
	description: 'Your favorite beauty salons',
};

export default function FavoritesPage() {
	return (
		<Suspense
			fallback={
				<div className="flex items-center justify-center py-12">
					<LoadingSpinner size="lg" />
				</div>
			}
		>
			<FavoritesClient />
		</Suspense>
	);
}


import FavoritesClient from './FavoritesClient';
import LoadingSpinner from '@/components/LoadingSpinner';

export const metadata = {
	title: 'Favorite Salons | Henzo',
	description: 'Your favorite beauty salons',
};

export default function FavoritesPage() {
	return (
		<Suspense
			fallback={
				<div className="flex items-center justify-center py-12">
					<LoadingSpinner size="lg" />
				</div>
			}
		>
			<FavoritesClient />
		</Suspense>
	);
}


import FavoritesClient from './FavoritesClient';
import LoadingSpinner from '@/components/LoadingSpinner';

export const metadata = {
	title: 'Favorite Salons | Henzo',
	description: 'Your favorite beauty salons',
};

export default function FavoritesPage() {
	return (
		<Suspense
			fallback={
				<div className="flex items-center justify-center py-12">
					<LoadingSpinner size="lg" />
				</div>
			}
		>
			<FavoritesClient />
		</Suspense>
	);
}


