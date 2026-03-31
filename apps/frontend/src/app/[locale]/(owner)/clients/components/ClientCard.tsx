'use client';

import { useState, useMemo, memo } from 'react';
import { useTranslation } from '@/contexts/LanguageContext';
import { formatVND } from '@/utils/currency';
import { Client } from '@/hooks/useClients';
import ClientDetailsModal from './ClientDetailsModal';
import { format } from 'date-fns';

interface ClientCardProps {
	client: Client;
}

// Memoized formatDate function outside component
const formatClientDate = (date: Date | null, neverText: string) => {
	if (!date) return neverText;
	return format(new Date(date), 'MMM d, yyyy');
};

const ClientCard = memo(function ClientCard({ client }: ClientCardProps) {
	const t = useTranslation();
	const [isModalOpen, setIsModalOpen] = useState(false);

	const isAnonymousClient = useMemo(
		() => client.email?.includes('@anonymous.local') || false,
		[client.email]
	);

	const formattedDate = useMemo(
		() => formatClientDate(client.lastVisit, t('owner.clients.never')),
		[client.lastVisit, t]
	);

	const displayName = useMemo(
		() =>
			isAnonymousClient
				? client.name || t('owner.clients.anonymousClient') || 'Anonymous Client'
				: client.name || client.email,
		[isAnonymousClient, client.name, client.email, t]
	);

	return (
		<>
			<div
				onClick={() => setIsModalOpen(true)}
				className="bg-white flex flex-col justify-between rounded-xl border border-[#f1d9d7] p-6 cursor-pointer hover:shadow-md transition-shadow"
			>
				<div className="flex items-start justify-between mb-4">
					<div className="flex-1 min-w-0">
						<h3 className="text-lg font-semibold text-gray-900 truncate">
							{displayName}
						</h3>
						{!isAnonymousClient && client.name && (
							<p className="text-sm text-gray-500 truncate mt-1">
								{client.email}
							</p>
						)}
					</div>
				</div>

				<div className="space-y-3">
					<div className="flex items-center justify-between text-sm">
						<span className="text-gray-600">{t('owner.clients.totalSpent')}</span>
						<span className="font-semibold text-gray-900">
							{formatVND(client.totalSpent)}
						</span>
					</div>

					<div className="flex items-center justify-between text-sm">
						<span className="text-gray-600">{t('owner.clients.visits')}</span>
						<span className="font-semibold text-gray-900">
							{client.visitCount}
						</span>
					</div>

					<div className="flex items-center justify-between text-sm">
						<span className="text-gray-600">{t('owner.clients.lastVisit')}</span>
						<span className="font-semibold text-gray-900">
							{formattedDate}
						</span>
					</div>

          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsModalOpen(true);
            }}
            className="w-full text-center text-sm font-medium text-[#ff5b5b] hover:text-[#e04a4a] transition-colors cursor-pointer"
          >
            {t('owner.clients.viewDetails')}
          </button>
				</div>
			</div>

			<ClientDetailsModal
				isOpen={isModalOpen}
				onClose={() => setIsModalOpen(false)}
				clientId={client.id}
			/>
		</>
	);
});

export default ClientCard;

