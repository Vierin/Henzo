'use client';

import Link from 'next/link';

export default function PublicHeader() {
	return (
		<header className="bg-white">
			<div className="mx-auto max-w-7xl px-6 py-4 flex items-center justify-between">
				{/* Logo */}
				<Link href="/" className="flex items-center gap-3">
					<div className="h-8 w-8 rounded-full bg-[#ff5b5b]" />
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

				{/* Login Buttons */}
				<div className="flex items-center gap-4">
					<Link
						href="/login"
						className="text-sm text-gray-700 hover:text-[#8B4513] font-medium transition-colors"
					>
						For Business
					</Link>
					<Link
						href="/client/login"
						className="bg-[#ff5b5b] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#e04a4a] transition-colors"
					>
						For Clients
					</Link>
				</div>
			</div>
		</header>
	);
}
