'use client';

import { ReactNode, useState } from 'react';
import OwnerHeader from './OwnerHeader';
import OwnerSidebar from './OwnerSidebar';
import FeedbackButton from './FeedbackButton';
import OnboardingChecklist from './OnboardingChecklist';
import { Menu, X } from 'lucide-react';
import { useTranslation } from '@/contexts/LanguageContext';
import { useOwnerLayout } from '@/contexts/OwnerLayoutContext';

interface OwnerLayoutProps {
	children: ReactNode;
}

export default function OwnerLayout({ children }: OwnerLayoutProps) {
	const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
	const t = useTranslation();
	const { salonId, salonData } = useOwnerLayout();

	const toggleMobileMenu = () => {
		setIsMobileMenuOpen(!isMobileMenuOpen);
	};

	return (
		<div className="min-h-screen bg-[#fff7f6] w-full overflow-x-hidden">
			<div className="flex">
				{/* Desktop Sidebar - Fixed */}
				<div className="hidden md:block fixed left-0 top-0 h-full z-90">
					<OwnerSidebar />
				</div>

				{/* Mobile Sidebar */}
				<div
					className={`md:hidden fixed inset-y-0 left-0 z-[300] transform transition-transform duration-300 ease-in-out ${
						isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
					}`}
				>
					<OwnerSidebar
						isMobileMenuOpen={isMobileMenuOpen}
						setIsMobileMenuOpen={setIsMobileMenuOpen}
					/>
				</div>

				{/* Right side content area */}
				<div className="flex-1 w-full">
					{/* Header positioned for desktop */}
					<div className="md:sticky md:top-0 md:z-40">
						<OwnerHeader />
					</div>

					{/* Mobile Menu Button */}
					<button
						onClick={toggleMobileMenu}
						className="md:hidden fixed top-2 right-2 z-[999] bg-white shadow-lg rounded-lg p-2 border border-gray-200"
						aria-label="Toggle menu"
					>
						{isMobileMenuOpen ? (
							<X className="w-5 h-5 text-gray-700" />
						) : (
							<Menu className="w-5 h-5 text-gray-700" />
						)}
					</button>

					{/* Mobile Overlay */}
					{isMobileMenuOpen && (
						<div
							className="md:hidden fixed inset-0 bg-black/60 bg-opacity-50 z-40"
							onClick={() => setIsMobileMenuOpen(false)}
						/>
					)}

					{/* Main Content */}
					<main className="py-2 md:py-8 pb-0 w-full overflow-x-hidden md:pl-64 flex flex-col min-h-screen bg-[#F2F5F7]">
						<div className="flex-1 mb-5 sm:mb-0">{children}</div>
						<div className="pt-4 md:pt-8 mt-auto">
							<p className="text-gray-400 text-center text-sm mb-0">{t('footer.allRightsReserved')}</p>
						</div>
					</main>
				</div>
			</div>

			{/* Onboarding Checklist - Fixed in top right corner */}
			{salonId && (
				<OnboardingChecklist
					salonId={salonId}
					salonSlug={salonData?.slug || undefined}
				/>
			)}

			{/* Feedback Button */}
			<FeedbackButton />
		</div>
	);
}
