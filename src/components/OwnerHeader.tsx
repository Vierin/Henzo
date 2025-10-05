'use client';

import Link from 'next/link';
import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/lib/auth-unified';
import { useSalon } from '@/hooks/useSalon';
import { supabase } from '@/lib/supabase';
import Image from 'next/image';
import { User, LogOut, ChevronDown } from 'lucide-react';

export default function OwnerHeader() {
	const { user, logout } = useAuth();
	const { data: salon } = useSalon();
	const [showProfileDropdown, setShowProfileDropdown] = useState(false);
	const [isLanguageDropdownOpen, setIsLanguageDropdownOpen] = useState(false);
	const [selectedLanguage, setSelectedLanguage] = useState('EN');
	const dropdownRef = useRef<HTMLDivElement>(null);
	const languageDropdownRef = useRef<HTMLDivElement>(null);

	// Функция для получения URL логотипа салона
	const getSalonLogoUrl = (logoPath?: string) => {
		if (!logoPath) return null;
		const { data } = supabase.storage
			.from('salon-files')
			.getPublicUrl(logoPath);
		return data.publicUrl;
	};

	// Языки
	const languages = [
		{ code: 'EN', name: 'English', flag: '🇺🇸' },
		{ code: 'VI', name: 'Tiếng Việt', flag: '🇻🇳' },
	];

	const handleLanguageSelect = (language: (typeof languages)[0]) => {
		setSelectedLanguage(language.code);
		setIsLanguageDropdownOpen(false);
	};

	// Close dropdowns when clicking outside
	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (
				dropdownRef.current &&
				!dropdownRef.current.contains(event.target as Node)
			) {
				setShowProfileDropdown(false);
			}
			if (
				languageDropdownRef.current &&
				!languageDropdownRef.current.contains(event.target as Node)
			) {
				setIsLanguageDropdownOpen(false);
			}
		};

		document.addEventListener('mousedown', handleClickOutside);
		return () => {
			document.removeEventListener('mousedown', handleClickOutside);
		};
	}, []);

	const handleLogout = async () => {
		await logout();
	};

	return (
		<header className="sticky top-0 bg-white/80 backdrop-blur border-b border-[#f1d9d7] z-[500]">
			<div className="h-[5rem] mx-auto max-w-7xl px-6 py-4 flex items-center justify-between">
				<Link
					href="/"
					className="flex h-full items-center gap-3 hover:opacity-80 transition-opacity"
				>
					<Image
						src="/logo.png"
						alt="Henzo Logo"
						width={88}
						height={40}
						className="h-full object-contain"
						style={{ width: 'auto', height: 'auto' }}
					/>
				</Link>

				<nav className="hidden md:flex items-center gap-8 text-[15px]">
					<Link
						href="/owner-dashboard"
						className="text-gray-800 hover:text-black font-medium"
					>
						Dashboard
					</Link>
					<Link
						href="/services"
						className="text-gray-800 hover:text-black font-medium"
					>
						Services
					</Link>
					<Link
						href="/staff"
						className="text-gray-800 hover:text-black font-medium"
					>
						Staff
					</Link>
					<Link
						href="/marketing"
						className="text-gray-800 hover:text-black font-medium"
					>
						Marketing
					</Link>
					<Link
						href="/billing"
						className="text-gray-800 hover:text-black font-medium"
					>
						Billing
					</Link>
					<Link
						href="/salon-info"
						className="text-gray-800 hover:text-black font-medium"
					>
						Settings
					</Link>
				</nav>

				<div className="flex items-center gap-4">
					{/* Language Dropdown */}
					<div className="relative" ref={languageDropdownRef}>
						<button
							onClick={() => setIsLanguageDropdownOpen(!isLanguageDropdownOpen)}
							className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:text-[#ff5b5b] font-medium transition-colors border border-gray-200 rounded-lg hover:border-[#ff5b5b]"
						>
							<span>{selectedLanguage}</span>
							<ChevronDown
								className={`w-4 h-4 transition-transform ${
									isLanguageDropdownOpen ? 'rotate-180' : ''
								}`}
							/>
						</button>

						{isLanguageDropdownOpen && (
							<div className="absolute top-full right-0 mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
								{languages.map((language) => (
									<button
										key={language.code}
										onClick={() => handleLanguageSelect(language)}
										className={`w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors flex items-center gap-3 first:rounded-t-lg last:rounded-b-lg ${
											selectedLanguage === language.code
												? 'bg-[#ff5b5b] text-white'
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

					{user && (
						<div className="relative" ref={dropdownRef}>
							<button
								onClick={() => setShowProfileDropdown(!showProfileDropdown)}
								onMouseEnter={() => setShowProfileDropdown(true)}
								className="flex items-center gap-2 text-sm text-gray-700 font-medium hover:text-gray-900 transition-colors"
							>
								<div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
									{salon?.logo ? (
										<Image
											src={getSalonLogoUrl(salon.logo) || ''}
											alt={salon.name || 'Salon logo'}
											width={40}
											height={40}
											className="w-full h-full object-cover"
											style={{ width: 'auto', height: 'auto' }}
										/>
									) : (
										<User className="w-4 h-4 text-gray-600" />
									)}
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
										<div className="text-xs text-gray-500">Owner</div>
									</div>
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
					)}
				</div>
			</div>
		</header>
	);
}
