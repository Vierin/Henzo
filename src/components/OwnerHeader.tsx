'use client';

import Link from 'next/link';
import { useAuthStore } from '@/stores/authStore';
import { useSalon } from '@/hooks/useSalon';
import { supabase } from '@/lib/supabase';
import Image from 'next/image';

export default function OwnerHeader() {
	const { user, logout } = useAuthStore();
	const { data: salon } = useSalon();

	const handleLogout = async () => {
		await logout();
	};

	// Функция для получения URL логотипа салона
	const getSalonLogoUrl = (logoPath?: string) => {
		if (!logoPath) return null;
		const { data } = supabase.storage
			.from('salon-files')
			.getPublicUrl(logoPath);
		return data.publicUrl;
	};

	return (
		<header className="sticky top-0 z-10 bg-white/80 backdrop-blur border-b border-[#f1d9d7]">
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
				</nav>

				<div className="flex items-center gap-4">
					<button
						aria-label="notifications"
						className="h-9 w-9 rounded-full border border-[#ead2d0] grid place-items-center text-gray-700"
					>
						🔔
					</button>
					{/* Логотип салона в кружочке профиля */}
					<div className="h-9 w-9 rounded-full border border-[#ffd6d2] overflow-hidden flex items-center justify-center">
						{salon?.logo ? (
							<Image
								src={getSalonLogoUrl(salon.logo) || ''}
								alt={salon.name || 'Salon logo'}
								width={40}
								height={40}
								className="w-full h-full object-cover"
								onError={(e) => {
									// Если изображение не загрузилось, показываем инициалы
									const target = e.target as HTMLImageElement;
									target.style.display = 'none';
									const nextSibling = target.nextElementSibling as HTMLElement;
									if (nextSibling) {
										nextSibling.style.display = 'flex';
									}
								}}
							/>
						) : null}
						<div
							className="w-full h-full bg-[#ffd6d2] flex items-center justify-center text-[#ff5b5b] font-semibold text-sm"
							style={{ display: salon?.logo ? 'none' : 'flex' }}
						>
							{salon?.name ? salon.name.charAt(0).toUpperCase() : 'S'}
						</div>
					</div>
					<button
						onClick={handleLogout}
						className="text-sm text-gray-800 hover:text-black font-medium"
					>
						Logout
					</button>
				</div>
			</div>
		</header>
	);
}
