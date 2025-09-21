'use client';

import Link from 'next/link';
import { useAuthStore } from '@/stores/authStore';

export default function OwnerHeader() {
	const { user, logout } = useAuthStore();

	const handleLogout = async () => {
		await logout();
	};

	return (
		<header className="sticky top-0 z-10 bg-white/80 backdrop-blur border-b border-[#f1d9d7]">
			<div className="mx-auto max-w-7xl px-6 py-4 flex items-center justify-between">
				<div className="flex items-center gap-3">
					<div className="h-8 w-8 rounded-full bg-[#ff5b5b]" />
					<span className="text-xl font-semibold">Henzo</span>
				</div>

				<nav className="hidden md:flex items-center gap-8 text-[15px]">
					<Link
						href="/owner-dashboard"
						className="text-gray-800 hover:text-black font-medium"
					>
						Dashboard
					</Link>
					<Link className="text-gray-800 hover:text-black font-medium" href="#">
						Calendar
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
						href="/salon-info"
						className="text-gray-800 hover:text-black font-medium"
					>
						Salon Info
					</Link>
				</nav>

				<div className="flex items-center gap-4">
					<button
						aria-label="notifications"
						className="h-9 w-9 rounded-full border border-[#ead2d0] grid place-items-center text-gray-700"
					>
						🔔
					</button>
					<div className="h-9 w-9 rounded-full bg-[#ffd6d2]" />
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
