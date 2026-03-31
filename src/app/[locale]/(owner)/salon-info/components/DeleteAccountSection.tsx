'use client';

import { useTranslation } from '@/contexts/LanguageContext';

interface DeleteAccountSectionProps {
	onDeleteClick: () => void;
}

export default function DeleteAccountSection({
	onDeleteClick,
}: DeleteAccountSectionProps) {
	const t = useTranslation();

	return (
		<div className="mt-8 md:mt-12 bg-red-50 border border-red-200 rounded-lg p-3 md:p-6">
			<div className="flex items-start">
				<div className="flex-shrink-0">
					<svg
						className="h-6 w-6 text-red-400"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
					>
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth={2}
							d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
						/>
					</svg>
				</div>
				<div className="ml-3 flex-1">
					<h3 className="text-lg font-medium text-red-800">
						{t('owner.salonInfo.deleteAccount')}
					</h3>
					<div className="mt-2 text-sm text-red-700">
						<p className="mb-3">
							{t('owner.salonInfo.deleteAccountWarning')}
						</p>
						<ul className="list-disc list-inside space-y-1 mb-4">
							<li>{t('owner.salonInfo.deleteAccountWarning1')}</li>
							<li>{t('owner.salonInfo.deleteAccountWarning2')}</li>
							<li>{t('owner.salonInfo.deleteAccountWarning3')}</li>
							<li>{t('owner.salonInfo.deleteAccountWarning4')}</li>
							<li>{t('owner.salonInfo.deleteAccountWarning5')}</li>
						</ul>
						<p className="font-medium">
							{t('owner.salonInfo.deleteAccountIrreversible')}
						</p>
					</div>
					<div className="mt-4">
						<button
							type="button"
							onClick={onDeleteClick}
							className="bg-red-600 !text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
						>
							{t('owner.salonInfo.deleteMyAccount')}
						</button>
					</div>
				</div>
			</div>
		</div>
	);
}

