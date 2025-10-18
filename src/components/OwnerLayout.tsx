'use client';

import { ReactNode, useState } from 'react';
import OwnerHeader from './OwnerHeader';
import OwnerSidebar from './OwnerSidebar';
import { Menu, X } from 'lucide-react';

interface OwnerLayoutProps {
	children: ReactNode;
}

export default function OwnerLayout({ children }: OwnerLayoutProps) {
	const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

	const toggleMobileMenu = () => {
		setIsMobileMenuOpen(!isMobileMenuOpen);
	};

	return (
		<div className="min-h-screen bg-[#fff7f6] w-[100vw] overflow-x-hidden">
			<OwnerHeader />

			{/* Mobile Menu Button */}
			<button
				onClick={toggleMobileMenu}
				className="md:hidden fixed top-4 right-2 z-[999] bg-white shadow-lg rounded-lg p-2 border border-gray-200"
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

			<div className="flex">
				{/* Desktop Sidebar */}
				<div className="hidden md:block">
					<OwnerSidebar />
				</div>

				{/* Mobile Sidebar */}
				<div
					className={`md:hidden fixed inset-y-0 left-0 z-50 transform transition-transform duration-300 ease-in-out ${
						isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
					}`}
				>
					<OwnerSidebar
						isMobileMenuOpen={isMobileMenuOpen}
						setIsMobileMenuOpen={setIsMobileMenuOpen}
					/>
				</div>

				{/* Main Content */}
				<main className="flex-1 p-4 md:p-8 w-full overflow-x-hidden">
					{children}
				</main>
			</div>
		</div>
	);
}
