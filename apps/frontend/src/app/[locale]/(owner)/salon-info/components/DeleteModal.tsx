'use client';

import { useTranslation } from '@/contexts/LanguageContext';

interface DeleteModalProps {
	isOpen: boolean;
	onClose: () => void;
	onConfirm: () => void;
	isDeleting: boolean;
}

export default function DeleteModal({
	isOpen,
	onClose,
	onConfirm,
	isDeleting,
}: DeleteModalProps) {
	const t = useTranslation();

	if (!isOpen) return null;

	return (
		<div className="fixed inset-0 bg-black/40 overflow-y-auto h-full w-full z-50">
			<div className="relative top-10 md:top-20 mx-auto p-5 border w-[90vw] md:w-96 max-w-md shadow-lg rounded-md bg-white">
				<div className="mt-3 text-center">
					<div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
						<svg
							className="h-6 w-6 text-red-600"
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
					<h3 className="text-lg font-medium text-gray-900 mt-4">
						{t('owner.salonInfo.areYouAbsolutelySure')}
					</h3>
					<div className="mt-2 px-2 md:px-7 py-3">
						<p className="text-sm text-gray-500">
							{t('owner.salonInfo.deleteAccountConfirmation')}
						</p>
					</div>
					<div className="flex flex-col sm:flex-row justify-center gap-3 sm:gap-4 mt-6">
						<button
							type="button"
							onClick={onClose}
							className="bg-gray-300 text-gray-700 px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
						>
							{t('common.cancel')}
						</button>
						<button
							type="button"
							onClick={onConfirm}
							disabled={isDeleting}
							className="bg-red-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
						>
							{isDeleting
								? t('owner.salonInfo.deleting')
								: t('owner.salonInfo.yesDeleteAccount')}
						</button>
					</div>
				</div>
			</div>
		</div>
	);
}

