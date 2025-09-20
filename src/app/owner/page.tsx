'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function OwnerDashboardPage() {
	const [user, setUser] = useState(null);
	const [loading, setLoading] = useState(true);
	const router = useRouter();

	useEffect(() => {
		const getSession = async () => {
			const {
				data: { session },
			} = await supabase.auth.getSession();
			if (!session) {
				router.push('/login');
				return;
			}
			setUser(session.user);
			setLoading(false);
		};

		getSession();

		const {
			data: { subscription },
		} = supabase.auth.onAuthStateChange(async (event, session) => {
			if (event === 'SIGNED_OUT' || !session) {
				router.push('/login');
			} else if (session) {
				setUser(session.user);
			}
			setLoading(false);
		});

		return () => subscription.unsubscribe();
	}, [router]);

	if (loading) {
		return (
			<div className="min-h-screen bg-[#fff7f6] flex items-center justify-center">
				<div className="text-center">
					<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#ff5b5b] mx-auto mb-4"></div>
					<p className="text-gray-600">Loading...</p>
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
						<a className="text-[#6b6b6b] hover:text-black" href="/owner">
							Dashboard
						</a>
						<a className="text-[#6b6b6b] hover:text-black" href="#">
							Calendar
						</a>
						<a className="text-[#6b6b6b] hover:text-black" href="#">
							Customers
						</a>
						<a className="text-[#6b6b6b] hover:text-black" href="#">
							Reports
						</a>
						<a className="text-[#6b6b6b] hover:text-black" href="#">
							Marketing
						</a>
					</nav>
					<div className="flex items-center gap-4">
						<button
							aria-label="notifications"
							className="h-9 w-9 rounded-full border border-[#ead2d0] grid place-items-center text-[#6b6b6b]"
						>
							🔔
						</button>
						<div className="h-9 w-9 rounded-full bg-[#ffd6d2]" />
						<button
							onClick={async () => {
								await supabase.auth.signOut();
								router.push('/login');
							}}
							className="text-sm text-[#6b6b6b] hover:text-black"
						>
							Logout
						</button>
					</div>
				</div>
			</header>

			<main className="mx-auto max-w-7xl px-6 py-8">
				<div className="mb-8">
					<h1 className="text-3xl font-bold text-gray-900 mb-2">
						Appointments
					</h1>
					<p className="text-gray-600">
						Manage your salon appointments and bookings
					</p>
				</div>

				<div className="flex items-center justify-between mb-6">
					<div className="flex gap-1">
						<button className="relative text-black pb-3">
							Upcoming
							<span className="absolute -bottom-px left-0 right-0 h-[3px] rounded-full bg-[#ea4b4b]" />
						</button>
						<button className="text-[#8a8a8a] pb-3">Past</button>
						<button className="text-[#8a8a8a] pb-3">Cancelled</button>
					</div>
					<a
						href="/owner/appointments/new"
						className="inline-flex items-center gap-2 rounded-full bg-[#ea4b4b] text-white px-4 py-2 text-sm shadow-sm hover:opacity-95"
					>
						<span className="text-lg leading-none">＋</span>
						New Appointment
					</a>
				</div>

				<div className="mt-6 grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6">
					<section className="rounded-xl overflow-hidden border border-[#f1d9d7] bg-white">
						<div className="grid grid-cols-6 px-6 py-3 text-[13px] text-[#7a7a7a] bg-[#fff2f1]">
							<div>Client</div>
							<div>Service</div>
							<div>Staff</div>
							<div>Date</div>
							<div>Time</div>
							<div>Status</div>
						</div>
						<div className="divide-y divide-[#f1d9d7]">
							{/* Sample booking rows */}
							<div className="grid grid-cols-6 px-6 py-4 text-[15px]">
								<div className="font-medium">Sarah Johnson</div>
								<div>Haircut</div>
								<div>Emily Carter</div>
								<div>Dec 15, 2024</div>
								<div>10:00 AM</div>
								<div>
									<span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
										Confirmed
									</span>
								</div>
							</div>
							<div className="grid grid-cols-6 px-6 py-4 text-[15px]">
								<div className="font-medium">Mike Wilson</div>
								<div>Manicure</div>
								<div>Ava Thompson</div>
								<div>Dec 15, 2024</div>
								<div>2:00 PM</div>
								<div>
									<span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
										Pending
									</span>
								</div>
							</div>
							<div className="grid grid-cols-6 px-6 py-4 text-[15px]">
								<div className="font-medium">Lisa Brown</div>
								<div>Facial</div>
								<div>Chloe Davis</div>
								<div>Dec 16, 2024</div>
								<div>11:00 AM</div>
								<div>
									<span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
										Confirmed
									</span>
								</div>
							</div>
						</div>
					</section>

					<aside className="rounded-xl border border-[#f1d9d7] bg-white p-6">
						<h3 className="text-[18px] font-semibold">Quick Actions</h3>
						<ul className="mt-4 space-y-3 text-[15px]">
							<li>
								<a
									href="/owner/services/new"
									className="flex items-center justify-between rounded-lg border border-[#f6e7e6] px-4 py-3 hover:bg-[#fff7f6] transition-colors"
								>
									<span>Add New Services</span>
									<span className="text-xl">＋</span>
								</a>
							</li>
							<li>
								<a
									href="/owner/staff/new"
									className="flex items-center justify-between rounded-lg border border-[#f6e7e6] px-4 py-3 hover:bg-[#fff7f6] transition-colors"
								>
									<span>Add New Staff</span>
									<span className="text-xl">＋</span>
								</a>
							</li>
							<li>
								<a
									href="/owner/salon-info"
									className="flex items-center justify-between rounded-lg border border-[#f6e7e6] px-4 py-3 hover:bg-[#fff7f6] transition-colors"
								>
									<span>Salon Information</span>
									<span>⚙️</span>
								</a>
							</li>
						</ul>
					</aside>
				</div>
			</main>
		</div>
	);
}
