'use client';

import { useState } from 'react';

export default function BillingPage() {
	const [isUpdatingPayment, setIsUpdatingPayment] = useState(false);
	const [isUpdatingAddress, setIsUpdatingAddress] = useState(false);

	const handleUpgradePlan = () => {
		// Handle upgrade plan logic
		console.log('Upgrade plan clicked');
	};

	const handleUpdatePayment = () => {
		setIsUpdatingPayment(true);
		// Handle update payment logic
		setTimeout(() => setIsUpdatingPayment(false), 1000);
	};

	const handleEditAddress = () => {
		setIsUpdatingAddress(true);
		// Handle edit address logic
		setTimeout(() => setIsUpdatingAddress(false), 1000);
	};

	const handleViewInvoices = () => {
		// Handle view invoices logic
		console.log('View invoices clicked');
	};

	return (
		<div className="max-w-4xl mx-auto">
			{/* Page Header */}
			<div className="mb-8">
				<h1 className="text-3xl font-bold text-gray-900 mb-2">
					Subscription & Billing
				</h1>
				<p className="text-gray-600">
					Manage your plan and billing details for Henzo salon.
				</p>
			</div>

			{/* Subscription Details Section */}
			<div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
				<div className="flex items-start justify-between">
					<div className="flex-1">
						<div className="flex items-center justify-between mb-4">
							<div>
								<p className="text-sm text-gray-500 mb-1">Current Plan</p>
								<h3 className="text-xl font-semibold text-gray-900">
									Pro Plan
								</h3>
							</div>
							<div className="text-right">
								<p className="text-sm text-gray-500 mb-1">Renews On</p>
								<p className="text-xl font-semibold text-gray-900">
									July 1, 2025
								</p>
							</div>
						</div>

						<p className="text-gray-700 mb-3">
							Your plan includes premium features and priority support.
						</p>

						<p className="text-sm text-gray-500 mb-4">
							You have 23 days left in your current cycle.
						</p>
					</div>

					<div className="ml-6">
						<span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-[#ec5413] text-white">
							ACTIVE
						</span>
					</div>
				</div>

				<div className="flex justify-end">
					<button
						onClick={handleUpgradePlan}
						className="inline-flex items-center px-4 py-2 bg-[#ec5413] text-white text-sm font-medium rounded-lg hover:bg-[#d4470f] transition-colors focus:outline-none focus:ring-2 focus:ring-[#ec5413] focus:ring-offset-2"
					>
						Upgrade Plan
					</button>
				</div>
			</div>

			{/* Billing Information Section */}
			<div className="space-y-6">
				{/* Payment Method */}
				<div className="bg-white rounded-lg border border-gray-200 p-6">
					<div className="flex items-center justify-between">
						<div className="flex-1">
							<h3 className="text-lg font-semibold text-gray-900 mb-1">
								Payment Method
							</h3>
							<p className="text-gray-600">Visa ending in •••• 4242</p>
						</div>
						<button
							onClick={handleUpdatePayment}
							disabled={isUpdatingPayment}
							className="inline-flex items-center px-4 py-2 bg-[#ec5413] text-white text-sm font-medium rounded-lg hover:bg-[#d4470f] transition-colors focus:outline-none focus:ring-2 focus:ring-[#ec5413] focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
						>
							{isUpdatingPayment ? 'Updating...' : 'Update'}
						</button>
					</div>
				</div>

				{/* Billing Address */}
				<div className="bg-white rounded-lg border border-gray-200 p-6">
					<div className="flex items-center justify-between">
						<div className="flex-1">
							<h3 className="text-lg font-semibold text-gray-900 mb-1">
								Billing Address
							</h3>
							<p className="text-gray-600">
								123 Glamour Ave, Suite 100
								<br />
								Beverly Hills, CA 90210
							</p>
						</div>
						<button
							onClick={handleEditAddress}
							disabled={isUpdatingAddress}
							className="inline-flex items-center px-4 py-2 bg-[#ec5413] text-white text-sm font-medium rounded-lg hover:bg-[#d4470f] transition-colors focus:outline-none focus:ring-2 focus:ring-[#ec5413] focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
						>
							{isUpdatingAddress ? 'Updating...' : 'Edit'}
						</button>
					</div>
				</div>

				{/* Billing History */}
				<div className="bg-white rounded-lg border border-gray-200 p-6">
					<div className="flex items-center justify-between">
						<div className="flex-1">
							<h3 className="text-lg font-semibold text-gray-900 mb-1">
								Billing History
							</h3>
							<p className="text-gray-600">
								Access all your past invoices and receipts.
							</p>
						</div>
						<button
							onClick={handleViewInvoices}
							className="inline-flex items-center px-4 py-2 bg-[#ec5413] text-white text-sm font-medium rounded-lg hover:bg-[#d4470f] transition-colors focus:outline-none focus:ring-2 focus:ring-[#ec5413] focus:ring-offset-2"
						>
							View Invoices
						</button>
					</div>
				</div>
			</div>
		</div>
	);
}
