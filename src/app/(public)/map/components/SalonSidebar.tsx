'use client';

import { useState, useEffect } from 'react';
import { ChevronDown, Star, MapPin, Phone } from 'lucide-react';
import { Salon } from '@/types';
import { useFeaturedSalons } from '@/hooks/useSalonPreview';
import Image from 'next/image';

interface SalonSidebarProps {
	onSalonSelect: (salon: Salon) => void;
	selectedSalon: Salon | null;
}

export default function SalonSidebar({
	onSalonSelect,
	selectedSalon,
}: SalonSidebarProps) {
	const [sortBy, setSortBy] = useState('recommended');
	const { data, isLoading } = useFeaturedSalons(20);
	const salons = (data as unknown as Salon[]) || [];

	// Mock data for demonstration - in production this would come from API
	const mockSalons: Salon[] = [
		{
			id: '1',
			name: 'Glamour & Glow Salon',
			address: '123 Beauty Lane, Luxeville',
			phone: '+1 (555) 123-4567',
			rating: 4.2,
			reviewCount: 124,
			latitude: 10.7769,
			longitude: 106.7009,
			logo: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=100&h=100&fit=crop',
			photos: [
				'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=300&h=200&fit=crop',
			],
			ownerId: 'mock-owner-1',
			createdAt: new Date().toISOString(),
		},
		{
			id: '2',
			name: 'The Modern Mane',
			address: '456 Style Street, Trendytown',
			phone: '+1 (555) 987-6543',
			rating: 4.7,
			reviewCount: 88,
			latitude: 10.7869,
			longitude: 106.7109,
			logo: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=100&h=100&fit=crop',
			photos: [
				'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=300&h=200&fit=crop',
			],
			ownerId: 'mock-owner-2',
			createdAt: new Date().toISOString(),
		},
		{
			id: '3',
			name: 'Serenity Spa & Styles',
			address: '789 Relax Row, Calm City',
			phone: '+1 (555) 456-7890',
			rating: 4.9,
			reviewCount: 210,
			latitude: 10.7669,
			longitude: 106.6909,
			logo: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=100&h=100&fit=crop',
			photos: [
				'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=300&h=200&fit=crop',
			],
			ownerId: 'mock-owner-3',
			createdAt: new Date().toISOString(),
		},
	];

	const displaySalons = salons.length > 0 ? salons : mockSalons;

	const renderStars = (rating: number) => {
		return Array.from({ length: 5 }, (_, i) => {
			const starIndex = i + 1;
			let className = 'text-gray-300';
			let style = {};

			if (starIndex <= Math.floor(rating)) {
				className = 'text-orange-500 fill-orange-500';
			} else if (starIndex - 0.5 <= rating && rating < starIndex) {
				className = 'text-gray-300';
				style = {
					background: 'linear-gradient(90deg, #f97316 50%, transparent 50%)',
					WebkitBackgroundClip: 'text',
					WebkitTextFillColor: 'transparent',
					backgroundClip: 'text',
				};
			}

			return <Star key={i} size={14} className={className} style={style} />;
		});
	};

	if (isLoading) {
		return (
			<div className="p-6">
				<div className="animate-pulse">
					<div className="h-8 bg-gray-200 rounded mb-4"></div>
					<div className="space-y-4">
						{[1, 2, 3].map((i) => (
							<div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
						))}
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className="h-full flex flex-col">
			{/* Sort Header */}
			<div className="p-6 border-b border-gray-200">
				<div className="relative">
					<select
						value={sortBy}
						onChange={(e) => setSortBy(e.target.value)}
						className="appearance-none bg-white border border-gray-300 rounded-lg px-4 py-2 pr-8 w-full focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
					>
						<option value="recommended">Sort by: Recommended</option>
						<option value="rating">Highest Rated</option>
						<option value="distance">Nearest</option>
						<option value="reviews">Most Reviews</option>
					</select>
					<ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
				</div>
			</div>

			{/* Salon List */}
			<div className="flex-1 overflow-y-auto">
				<div className="p-6 space-y-4">
					{displaySalons.map((salon: any) => (
						<div
							key={salon.id}
							onClick={() => onSalonSelect(salon)}
							className={`bg-white border border-gray-200 rounded-lg p-4 cursor-pointer transition-all duration-200 hover:shadow-md hover:border-orange-300 ${
								selectedSalon?.id === salon.id
									? 'border-orange-500 shadow-md'
									: ''
							}`}
						>
							<div className="flex items-start space-x-4">
								{/* Salon Image */}
								<div className="w-20 h-20 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
									{salon.photos &&
									salon.photos.length > 0 &&
									salon.photos[0] ? (
										(() => {
											try {
												new URL(salon.photos[0]);
												return (
													<Image
														src={salon.photos[0]}
														alt={salon.name}
														width={80}
														height={80}
														className="w-full h-full object-cover"
													/>
												);
											} catch {
												return (
													<div className="w-full h-full bg-gradient-to-br from-orange-100 to-orange-200 flex items-center justify-center">
														<span className="text-orange-400 text-2xl">💇‍♀️</span>
													</div>
												);
											}
										})()
									) : (
										<div className="w-full h-full bg-gradient-to-br from-orange-100 to-orange-200 flex items-center justify-center">
											<span className="text-orange-400 text-2xl">💇‍♀️</span>
										</div>
									)}
								</div>

								{/* Salon Info */}
								<div className="flex-1 min-w-0">
									<h3 className="text-lg font-bold text-gray-900 mb-1 truncate">
										{salon.name}
									</h3>

									<div className="flex items-center space-x-1 text-gray-600 mb-2">
										<MapPin size={12} />
										<span className="text-sm truncate">{salon.address}</span>
									</div>

									{/* Rating */}
									<div className="flex items-center space-x-2 mb-3">
										<div className="flex items-center space-x-1">
											{renderStars(salon.rating || 0)}
										</div>
										<span className="text-sm font-medium text-gray-900">
											{salon.rating?.toFixed(1) || '0.0'}
										</span>
										<span className="text-sm text-gray-500">
											({salon.reviewCount || salon._count?.reviews || 0}{' '}
											reviews)
										</span>
									</div>

									{/* Action Button */}
									<button className="w-full bg-orange-100 text-orange-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-orange-200 transition-colors">
										View Salon
									</button>
								</div>
							</div>
						</div>
					))}
				</div>
			</div>
		</div>
	);
}
