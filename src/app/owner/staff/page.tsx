'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface Staff {
	id: string;
	name: string;
	accessLevel: 'ADMIN' | 'EMPLOYEE';
	email: string;
	phone: string;
	createdAt: string;
}

export default function StaffPage() {
	const [staff, setStaff] = useState<Staff[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState('');
	const router = useRouter();

	useEffect(() => {
		fetchStaff();
	}, []);

	const fetchStaff = async () => {
		try {
			const response = await fetch('/api/staff');
			if (!response.ok) throw new Error('Failed to fetch staff');
			const data = await response.json();
			setStaff(data.staff || []);
		} catch (err: any) {
			setError(err.message);
		} finally {
			setLoading(false);
		}
	};

	const getAccessLevelBadge = (accessLevel: string) => {
		if (accessLevel === 'ADMIN') {
			return (
				<span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
					Admin
				</span>
			);
		}
		return (
			<span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
				Employee
			</span>
		);
	};

	if (loading) {
		return (
			<div className="min-h-screen bg-[#fff7f6] flex items-center justify-center">
				<div className="text-center">
					<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#ff5b5b] mx-auto mb-4"></div>
					<p className="text-gray-600">Loading staff...</p>
				</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-[#fff7f6]">
			{/* Header */}
			<header className="sticky top-0 z-10 bg-white/80 backdrop-blur border-b border-[#f1d9d7]">
				<div className="mx-auto max-w-7xl px-6 py-4 flex items-center justify-between">
					<div className="flex items-center gap-3">
						<div className="h-8 w-8 rounded-full bg-[#ff5b5b]" />
						<span className="text-xl font-semibold">Henzo</span>
					</div>
					<nav className="hidden md:flex items-center gap-8 text-[15px]">
						<a
							className="text-gray-800 hover:text-black font-medium"
							href="/owner"
						>
							Dashboard
						</a>
						<a className="text-gray-800 hover:text-black font-medium" href="#">
							Calendar
						</a>
						<a
							className="text-gray-800 hover:text-black font-medium"
							href="/owner/services"
						>
							Services
						</a>
						<a className="text-[#ff5b5b] font-medium" href="/owner/staff">
							Staff
						</a>
						<a className="text-gray-800 hover:text-black font-medium" href="#">
							Marketing
						</a>
					</nav>
					<div className="flex items-center gap-4">
						<button
							aria-label="notifications"
							className="h-9 w-9 rounded-full border border-[#ead2d0] grid place-items-center text-gray-700"
						>
							🔔
						</button>
						<div className="h-9 w-9 rounded-full bg-[#ffd6d2]" />
					</div>
				</div>
			</header>

			<main className="mx-auto max-w-7xl px-6 py-8">
				<div className="mb-8">
					<div className="flex items-center justify-between">
						<div>
							<h1 className="text-3xl font-bold text-black mb-2">Staff</h1>
							<p className="text-gray-800">
								Manage your salon team and access levels
							</p>
						</div>
						<a
							href="/owner/staff/new"
							className="inline-flex items-center gap-2 rounded-full bg-[#ff5b5b] text-white px-4 py-2 text-sm shadow-sm hover:opacity-95"
						>
							<span className="text-lg leading-none">＋</span>
							Add New Staff
						</a>
					</div>
				</div>

				{error && (
					<div className="mb-6 text-red-600 text-center bg-red-50 border border-red-200 rounded-md p-3">
						{error}
					</div>
				)}

				{staff.length === 0 ? (
					<div className="bg-white rounded-xl border border-[#f1d9d7] p-12 text-center">
						<div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
							<svg
								className="w-8 h-8 text-gray-400"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
									d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"
								/>
							</svg>
						</div>
						<h3 className="text-lg font-semibold text-gray-900 mb-2">
							No staff members yet
						</h3>
						<p className="text-gray-600 mb-6">
							Start by adding your first team member to your salon
						</p>
						<a
							href="/owner/staff/new"
							className="inline-flex items-center gap-2 bg-[#ff5b5b] text-white px-6 py-3 rounded-lg font-medium hover:bg-[#e04a4a] transition-colors"
						>
							<span className="text-lg">＋</span>
							Add Your First Staff Member
						</a>
					</div>
				) : (
					<div className="bg-white rounded-xl border border-[#f1d9d7] overflow-hidden">
						<div className="grid grid-cols-5 px-6 py-3 text-[13px] text-gray-700 bg-[#fff2f1] font-semibold">
							<div>Name</div>
							<div>Access Level</div>
							<div>Email</div>
							<div>Phone</div>
							<div>Actions</div>
						</div>
						<div className="divide-y divide-[#f1d9d7]">
							{staff.map((member) => (
								<div
									key={member.id}
									className="grid grid-cols-5 px-6 py-4 text-[15px] text-gray-800"
								>
									<div className="font-semibold">{member.name}</div>
									<div>{getAccessLevelBadge(member.accessLevel)}</div>
									<div className="text-gray-600">
										{member.email || 'No email'}
									</div>
									<div className="text-gray-600">
										{member.phone || 'No phone'}
									</div>
									<div className="flex gap-2">
										<button className="text-[#ff5b5b] hover:text-[#e04a4a] text-sm font-medium">
											Edit
										</button>
										<button className="text-red-600 hover:text-red-700 text-sm font-medium">
											Remove
										</button>
									</div>
								</div>
							))}
						</div>
					</div>
				)}
			</main>
		</div>
	);
}
