'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';

export default function SelectRolePage() {
	const [selectedRole, setSelectedRole] = useState<'CLIENT' | 'OWNER'>(
		'CLIENT'
	);
	const [loading, setLoading] = useState(false);
	const router = useRouter();

	const handleRoleSelection = async () => {
		setLoading(true);
		try {
			// Get current user
			const {
				data: { user },
				error: userError,
			} = await supabase.auth.getUser();

			if (userError || !user) {
				toast.error('User not found. Please try logging in again.');
				router.push('/login');
				return;
			}

			// Update user metadata with selected role
			const { error: updateError } = await supabase.auth.updateUser({
				data: {
					role: selectedRole,
					name: user.user_metadata?.name || user.user_metadata?.full_name,
					phone: user.user_metadata?.phone,
				},
			});

			if (updateError) {
				throw updateError;
			}

			// Create user in backend database
			const API_BASE_URL =
				process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
			const response = await fetch(`${API_BASE_URL}/auth/user`, {
				headers: {
					Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
					'Content-Type': 'application/json',
				},
			});

			if (!response.ok) {
				throw new Error('Failed to create user in database');
			}

			const userData = await response.json();

			// Redirect based on selected role
			switch (selectedRole) {
				case 'OWNER':
					router.push('/owner-dashboard');
					toast.success('Welcome! Your salon owner account has been created.');
					break;
				case 'CLIENT':
					router.push('/dashboard');
					toast.success('Welcome! Your client account has been created.');
					break;
			}
		} catch (error: any) {
			console.error('Role selection error:', error);
			toast.error(error.message || 'Failed to complete registration');
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="min-h-screen bg-[#fff7f6] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
			<div className="max-w-md w-full space-y-8">
				<div>
					<div className="mx-auto h-12 w-12 flex items-center justify-center rounded-full bg-[#ff5b5b]">
						<span className="text-white text-xl font-bold">H</span>
					</div>
					<h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
						Choose Your Account Type
					</h2>
					<p className="mt-2 text-center text-sm text-gray-600">
						Select how you'd like to use Henzo
					</p>
				</div>

				<div className="space-y-4">
					{/* Client Option */}
					<div
						className={`relative border-2 rounded-lg p-4 cursor-pointer transition-all ${
							selectedRole === 'CLIENT'
								? 'border-[#ff5b5b] bg-orange-50'
								: 'border-gray-200 hover:border-gray-300'
						}`}
						onClick={() => setSelectedRole('CLIENT')}
					>
						<div className="flex items-center">
							<div className="flex-shrink-0">
								<div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
									<span className="text-2xl">👤</span>
								</div>
							</div>
							<div className="ml-4">
								<h3 className="text-lg font-medium text-gray-900">Client</h3>
								<p className="text-sm text-gray-500">
									Book appointments and manage your beauty services
								</p>
							</div>
							<div className="ml-auto">
								<input
									type="radio"
									name="role"
									value="CLIENT"
									checked={selectedRole === 'CLIENT'}
									onChange={() => setSelectedRole('CLIENT')}
									className="h-4 w-4 text-[#ff5b5b] focus:ring-[#ff5b5b] border-gray-300"
								/>
							</div>
						</div>
					</div>

					{/* Owner Option */}
					<div
						className={`relative border-2 rounded-lg p-4 cursor-pointer transition-all ${
							selectedRole === 'OWNER'
								? 'border-[#ff5b5b] bg-orange-50'
								: 'border-gray-200 hover:border-gray-300'
						}`}
						onClick={() => setSelectedRole('OWNER')}
					>
						<div className="flex items-center">
							<div className="flex-shrink-0">
								<div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
									<span className="text-2xl">🏢</span>
								</div>
							</div>
							<div className="ml-4">
								<h3 className="text-lg font-medium text-gray-900">
									Salon Owner
								</h3>
								<p className="text-sm text-gray-500">
									Manage your salon, staff, and client bookings
								</p>
							</div>
							<div className="ml-auto">
								<input
									type="radio"
									name="role"
									value="OWNER"
									checked={selectedRole === 'OWNER'}
									onChange={() => setSelectedRole('OWNER')}
									className="h-4 w-4 text-[#ff5b5b] focus:ring-[#ff5b5b] border-gray-300"
								/>
							</div>
						</div>
					</div>
				</div>

				<div>
					<button
						onClick={handleRoleSelection}
						disabled={loading}
						className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-[#ff5b5b] hover:bg-[#e04a4a] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#ff5b5b] disabled:opacity-50 disabled:cursor-not-allowed"
					>
						{loading ? (
							<div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
						) : (
							'Continue'
						)}
					</button>
				</div>

				<div className="text-center">
					<p className="text-sm text-gray-600">
						You can change this later in your account settings
					</p>
				</div>
			</div>
		</div>
	);
}
