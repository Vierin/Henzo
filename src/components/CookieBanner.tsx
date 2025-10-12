'use client';

import { Cookie } from 'lucide-react';
import { useState, useEffect } from 'react';

interface CookieBannerProps {
	onAccept?: () => void;
	onDecline?: () => void;
}

export default function CookieBanner({
	onAccept,
	onDecline,
}: CookieBannerProps) {
	const [isVisible, setIsVisible] = useState(false);

	useEffect(() => {
		// Check if user has already made a choice
		const cookieConsent = localStorage.getItem('cookieConsent');
		if (!cookieConsent) {
			setIsVisible(true);
		}
	}, []);

	const handleAccept = () => {
		localStorage.setItem('cookieConsent', 'accepted');
		setIsVisible(false);

		// Enable Google Analytics
		if (typeof window !== 'undefined' && window.gtag) {
			window.gtag('consent', 'update', {
				analytics_storage: 'granted',
				ad_storage: 'granted',
			});
		}

		onAccept?.();
	};

	const handleDecline = () => {
		localStorage.setItem('cookieConsent', 'declined');
		setIsVisible(false);

		// Disable Google Analytics
		if (typeof window !== 'undefined' && window.gtag) {
			window.gtag('consent', 'update', {
				analytics_storage: 'denied',
				ad_storage: 'denied',
			});
		}

		onDecline?.();
	};

	if (!isVisible) return null;

	return (
		<div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 shadow-lg">
			<div className="max-w-7xl mx-auto px-4 py-6">
				<div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
					<div className="flex-1">
						<p className="text-sm text-gray-600 leading-relaxed">
							We use cookies to enhance your browsing experience, analyze site
							traffic, and personalize content. By clicking "Accept All", you
							consent to our use of cookies. You can manage your preferences at
							any time.
						</p>
					</div>

					<div className="flex flex-col sm:flex-row gap-3 min-w-fit">
						<button
							onClick={handleDecline}
							className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-200 transition-colors"
						>
							Decline
						</button>
						<button
							onClick={handleAccept}
							className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary/90 transition-colors"
						>
							Accept All
						</button>
					</div>
				</div>
			</div>
		</div>
	);
}
