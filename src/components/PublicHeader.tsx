'use client';

import { useState, useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-unified';
import Image from 'next/image';
import BooksySearch from './BooksySearch';
import CategoriesNavigation from './CategoriesNavigation';
import { User, LogOut, ChevronDown } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

export default function PublicHeader() {
	const [isLanguageDropdownOpen, setIsLanguageDropdownOpen] = useState(false);
	const [showProfileDropdown, setShowProfileDropdown] = useState(false);
	const [selectedLanguage, setSelectedLanguage] = useState('EN');
	const [isScrolled, setIsScrolled] = useState(false);
	const dropdownRef = useRef<HTMLDivElement>(null);
	const profileDropdownRef = useRef<HTMLDivElement>(null);
	const pathname = usePathname();
	const router = useRouter();

	// Используем новую систему аутентификации
	const { user, isLoading, isClient, isOwner, isAdmin, logout } = useAuth();

	// Используем контекст языка
	const { language, setLanguage, t } = useLanguage();

	const languages = [
		{ code: 'en', name: 'English', flag: '🇺🇸' },
		{ code: 'vi', name: 'Tiếng Việt', flag: '🇻🇳' },
	];

	const handleLanguageSelect = (lang: (typeof languages)[0]) => {
		setLanguage(lang.code as 'vi' | 'en');
		setIsLanguageDropdownOpen(false);
	};

	// Синхронизируем selectedLanguage с текущим языком из контекста
	useEffect(() => {
		setSelectedLanguage(language.toUpperCase());
	}, [language]);

	// Check user auth on component mount

	// Check if we should show search (only on category pages, filter results, and salon pages)
	const shouldShowSearch =
		pathname.startsWith('/category/') ||
		pathname.startsWith('/salons') ||
		pathname.startsWith('/salon/');

	// Handle scroll for fixed header
	useEffect(() => {
		const handleScroll = () => {
			setIsScrolled(window.scrollY > 50);
		};

		window.addEventListener('scroll', handleScroll);
		return () => window.removeEventListener('scroll', handleScroll);
	}, []);

	// Close dropdowns when clicking outside
	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (
				dropdownRef.current &&
				!dropdownRef.current.contains(event.target as Node)
			) {
				setIsLanguageDropdownOpen(false);
			}
			if (
				profileDropdownRef.current &&
				!profileDropdownRef.current.contains(event.target as Node)
			) {
				setShowProfileDropdown(false);
			}
		};

		document.addEventListener('mousedown', handleClickOutside);
		return () => {
			document.removeEventListener('mousedown', handleClickOutside);
		};
	}, []);

	const handleLogout = async () => {
		await logout();
		setShowProfileDropdown(false);
		// Small delay to ensure cookies are cleared
		await new Promise((resolve) => setTimeout(resolve, 100));
		router.replace('/');
	};

	return (
		<>
			{/* Top Bar - Always visible, not fixed */}
			<header className="bg-white shadow-sm">
				<div className="mx-auto max-w-7xl px-6 py-4">
					<div className="flex items-center justify-between">
						{/* Logo */}
						<Link href="/" className="flex h-12 items-center gap-3">
							<Image
								src="/logo.png"
								alt="Henzo Logo"
								width={88}
								height={40}
								className="h-full object-contain"
								style={{ width: 'auto', height: 'auto' }}
							/>
						</Link>

						{/* Language Dropdown and User Info/Login Buttons */}
						<div className="flex items-center gap-4">
							{/* Language Dropdown */}
							<div className="relative" ref={dropdownRef}>
								<button
									onClick={() =>
										setIsLanguageDropdownOpen(!isLanguageDropdownOpen)
									}
									className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:text-[#ff5b5b] font-medium transition-colors border border-gray-200 rounded-lg hover:border-[#ff5b5b] hover:bg-[#fff7f6]"
								>
									<span>{selectedLanguage}</span>
									<ChevronDown
										className={`w-4 h-4 transition-transform ${
											isLanguageDropdownOpen ? 'rotate-180' : ''
										}`}
									/>
								</button>

								{isLanguageDropdownOpen && (
									<div className="absolute top-full right-0 mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-50 overflow-hidden">
										{languages.map((language) => (
											<button
												key={language.code}
												onClick={() => handleLanguageSelect(language)}
												className={`w-full px-4 py-3 text-left transition-colors flex items-center gap-3 ${
													selectedLanguage === language.code.toUpperCase()
														? 'bg-[#ff5b5b] text-white hover:bg-[#e04a4a]'
														: 'text-gray-700 hover:text-[#ff5b5b] hover:bg-[#fff7f6]'
												}`}
											>
												<span className="text-lg">{language.flag}</span>
												<span className="font-medium">{language.name}</span>
											</button>
										))}
									</div>
								)}
							</div>

							{/* User Info or Login Buttons */}
							{isLoading ? (
								<div className="w-8 h-8 bg-gray-200 rounded-full animate-pulse"></div>
							) : user ? (
								<div className="relative" ref={profileDropdownRef}>
									<button
										onClick={() => setShowProfileDropdown(!showProfileDropdown)}
										onMouseEnter={() => setShowProfileDropdown(true)}
										className="flex items-center gap-2 text-sm text-gray-700 font-medium hover:text-[#8B4513] transition-colors"
									>
										<div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
											<User className="w-4 h-4 text-gray-600" />
										</div>
										<span>Profile</span>
										<ChevronDown
											className={`w-4 h-4 text-gray-500 transition-transform ${
												showProfileDropdown ? 'rotate-180' : ''
											}`}
										/>
									</button>

									{/* Profile Dropdown */}
									{showProfileDropdown && (
										<div
											className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50 border border-gray-200"
											onMouseEnter={() => setShowProfileDropdown(true)}
											onMouseLeave={() => setShowProfileDropdown(false)}
										>
											<div className="px-4 py-2 text-sm text-gray-700 border-b border-gray-100">
												<div className="font-medium">{user.email}</div>
												<div className="text-xs text-gray-500">
													{isOwner()
														? 'Owner'
														: isAdmin()
															? 'Admin'
															: isClient()
																? 'Client'
																: 'User'}
												</div>
											</div>
											<Link
												href={
													isClient()
														? '/dashboard'
														: isAdmin()
															? '/admin-panel'
															: isOwner()
																? '/owner-dashboard'
																: '/dashboard'
												}
												className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
												onClick={() => setShowProfileDropdown(false)}
											>
												Dashboard
											</Link>
											<button
												onClick={handleLogout}
												className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 transition-colors"
											>
												<LogOut className="w-4 h-4" />
												Logout
											</button>
										</div>
									)}
								</div>
							) : (
								<>
									<Link
										href={'/business'}
										className="text-sm text-gray-700 hover:text-[#8B4513] font-medium transition-colors"
									>
										{t.navigation.business}
									</Link>
									<Link
										href="/login"
										className="bg-[#ff5b5b] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#e04a4a] transition-colors"
									>
										{t.navigation.login}
									</Link>
								</>
							)}
						</div>
					</div>
				</div>
			</header>

			{/* Booksy Search Section - Fixed on scroll */}
			{shouldShowSearch && (
				<div
					className={`bg-white shadow-sm transition-all duration-300 ${
						isScrolled ? 'fixed top-0 left-0 right-0 z-[999]' : ''
					}`}
				>
					<div className="mx-auto max-w-7xl px-6 py-4">
						<BooksySearch />
					</div>
				</div>
			)}
		</>
	);
}
