'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/stores/authStore';

export default function PublicHeader() {
	const [isLanguageDropdownOpen, setIsLanguageDropdownOpen] = useState(false);
	const [selectedLanguage, setSelectedLanguage] = useState('EN');
	const dropdownRef = useRef<HTMLDivElement>(null);
	const router = useRouter();

	// Используем Zustand store для аутентификации
	const { user, isLoading, isClient, isOwner, isAdmin, logout } =
		useAuthStore();

	const languages = [
		{ code: 'EN', name: 'English', flag: '🇺🇸' },
		{ code: 'VI', name: 'Tiếng Việt', flag: '🇻🇳' },
		{ code: 'RU', name: 'Русский', flag: '🇷🇺' },
	];

	const handleLanguageSelect = (language: (typeof languages)[0]) => {
		setSelectedLanguage(language.code);
		setIsLanguageDropdownOpen(false);
	};

	const handleBusinessClick = (e: React.MouseEvent) => {
		e.preventDefault();

		// Проверяем, авторизован ли пользователь как владелец
		if (user && (isOwner || isAdmin)) {
			// Пользователь уже авторизован как владелец, переходим в панель
			router.push('/owner-dashboard');
		} else {
			// Пользователь не авторизован или не владелец, переходим на страницу логина для бизнеса
			router.push('/login');
		}
	};

	// Check user auth on component mount

	// Close dropdown when clicking outside
	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (
				dropdownRef.current &&
				!dropdownRef.current.contains(event.target as Node)
			) {
				setIsLanguageDropdownOpen(false);
			}
		};

		document.addEventListener('mousedown', handleClickOutside);
		return () => {
			document.removeEventListener('mousedown', handleClickOutside);
		};
	}, []);

	return (
		<header className="bg-white">
			<div className="mx-auto max-w-7xl px-6 py-4 flex items-center justify-between">
				{/* Logo */}
				<Link href="/" className="flex items-center gap-3">
					<img
						src="/logo.png"
						alt="Henzo Logo"
						className="h-8 w-[22%] object-contain"
					/>
					<span className="text-xl font-semibold text-[#8B4513]">Henzo</span>
				</Link>

				{/* Navigation */}
				<nav className="hidden md:flex items-center gap-8 text-[15px]">
					<Link className="text-gray-700 hover:text-[#8B4513]" href="/services">
						Services
					</Link>
					<Link className="text-gray-700 hover:text-[#8B4513]" href="/salons">
						Salons
					</Link>
					<Link className="text-gray-700 hover:text-[#8B4513]" href="/about">
						About us
					</Link>
				</nav>

				{/* Language Dropdown and User Info/Login Buttons */}
				<div className="flex items-center gap-4">
					{/* Language Dropdown */}
					<div className="relative" ref={dropdownRef}>
						<button
							onClick={() => setIsLanguageDropdownOpen(!isLanguageDropdownOpen)}
							className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:text-[#8B4513] font-medium transition-colors border border-gray-200 rounded-lg hover:border-[#8B4513]"
						>
							<span>{selectedLanguage}</span>
							<svg
								className={`w-4 h-4 transition-transform ${
									isLanguageDropdownOpen ? 'rotate-180' : ''
								}`}
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
									d="M19 9l-7 7-7-7"
								/>
							</svg>
						</button>

						{isLanguageDropdownOpen && (
							<div className="absolute top-full right-0 mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
								{languages.map((language) => (
									<button
										key={language.code}
										onClick={() => handleLanguageSelect(language)}
										className={`w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors flex items-center gap-3 first:rounded-t-lg last:rounded-b-lg ${
											selectedLanguage === language.code
												? 'bg-[#8B4513] text-white'
												: 'text-gray-700'
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
						<div className="flex items-center gap-3">
							<button
								onClick={() => {
									if (isClient) {
										router.push('/client');
									} else if (isOwner || isAdmin) {
										router.push('/owner-dashboard');
									}
								}}
								className="flex items-center gap-2 text-sm text-gray-700 font-medium hover:text-[#8B4513] transition-colors"
							>
								<svg
									className="w-5 h-5"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={2}
										d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
									/>
								</svg>
								<span>{user.name || user.email}</span>
							</button>
							<button
								onClick={logout}
								className="text-sm text-gray-500 hover:text-red-600 transition-colors"
								title="Logout"
							>
								<svg
									className="w-5 h-5"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={2}
										d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
									/>
								</svg>
							</button>
						</div>
					) : (
						<>
							<button
								onClick={handleBusinessClick}
								className="text-sm text-gray-700 hover:text-[#8B4513] font-medium transition-colors"
							>
								For Business
							</button>
							<Link
								href="/client/login"
								className="bg-[#ff5b5b] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#e04a4a] transition-colors"
							>
								For Clients
							</Link>
						</>
					)}
				</div>
			</div>
		</header>
	);
}
