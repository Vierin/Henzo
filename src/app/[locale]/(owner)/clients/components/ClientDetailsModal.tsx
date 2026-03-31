'use client';

import { useState } from 'react';
import { useTranslation } from '@/contexts/LanguageContext';
import { useClient, useClientNotes, useCreateClientNote, useUpdateClientNote, useDeleteClientNote } from '@/hooks/useClients';
import { useOwnerLayout } from '@/contexts/OwnerLayoutContext';
import { formatVND } from '@/utils/currency';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import LoadingSpinner from '@/components/LoadingSpinner';
import { X, Plus, Edit2, Trash2 } from 'lucide-react';

interface ClientDetailsModalProps {
	isOpen: boolean;
	onClose: () => void;
	clientId: string;
}

export default function ClientDetailsModal({
	isOpen,
	onClose,
	clientId,
}: ClientDetailsModalProps) {
	const t = useTranslation();
	const { salonId } = useOwnerLayout();
	const [activeTab, setActiveTab] = useState<'info' | 'visits' | 'notes'>('info');
	const [isAddingNote, setIsAddingNote] = useState(false);
	const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
	const [noteText, setNoteText] = useState('');

	const { data: client, isLoading: clientLoading } = useClient(
		isOpen ? clientId : null
	);
	const { data: notes = [], isLoading: notesLoading } = useClientNotes(
		isOpen ? clientId : null
	);

	const createNoteMutation = useCreateClientNote();
	const updateNoteMutation = useUpdateClientNote();
	const deleteNoteMutation = useDeleteClientNote();

	if (!isOpen) return null;

	// Check if client is anonymous
	const isAnonymousClient = client?.email?.includes('@anonymous.local') || false;

	const handleSaveNote = async () => {
		if (!noteText.trim() || !salonId) return;

		if (editingNoteId) {
			try {
				await updateNoteMutation.mutateAsync({
					noteId: editingNoteId,
					note: noteText.trim(),
				});
				toast.success(t('owner.clients.noteUpdated'));
				setEditingNoteId(null);
				setNoteText('');
			} catch (error) {
				toast.error(t('owner.clients.failedToUpdateNote'));
			}
		} else {
			try {
				await createNoteMutation.mutateAsync({
					clientId,
					salonId,
					note: noteText.trim(),
				});
				toast.success(t('owner.clients.noteSaved'));
				setIsAddingNote(false);
				setNoteText('');
			} catch (error) {
				toast.error(t('owner.clients.failedToSaveNote'));
			}
		}
	};

	const handleDeleteNote = async (noteId: string) => {
		if (!confirm(t('owner.clients.areYouSureDeleteNote'))) return;

		try {
			await deleteNoteMutation.mutateAsync(noteId);
			toast.success(t('owner.clients.noteDeleted'));
		} catch (error) {
			toast.error(t('owner.clients.failedToDeleteNote'));
		}
	};

	const getStatusBadge = (status: string) => {
		const statusMap: Record<string, { bg: string; text: string; label: string }> = {
			PENDING: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: t('owner.dashboard.pending') },
			CONFIRMED: { bg: 'bg-green-100', text: 'text-green-800', label: t('owner.dashboard.confirmed') },
			COMPLETED: { bg: 'bg-blue-100', text: 'text-blue-800', label: t('owner.dashboard.completed') },
			CANCELED: { bg: 'bg-red-100', text: 'text-red-800', label: t('owner.dashboard.cancelled') },
			NOSHOW: { bg: 'bg-orange-100', text: 'text-orange-800', label: t('owner.dashboard.noShow') },
		};

		const statusInfo = statusMap[status] || { bg: 'bg-gray-100', text: 'text-gray-800', label: status };

		return (
			<span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${statusInfo.bg} ${statusInfo.text}`}>
				{statusInfo.label}
			</span>
		);
	};

	return (
		<div
			className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
			onClick={onClose}
		>
			<div
				className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-hidden shadow-xl flex flex-col"
				onClick={(e) => e.stopPropagation()}
			>
				{/* Header */}
				<div className="flex items-center justify-between p-6 border-b border-gray-200">
					<h2 className="text-xl font-semibold text-gray-900">
						{t('owner.clients.clientDetails')}
					</h2>
					<button
						onClick={onClose}
						className="p-2 hover:bg-gray-100 rounded-full transition-colors"
					>
						<X className="w-5 h-5 text-gray-500" />
					</button>
				</div>

				{clientLoading ? (
					<div className="flex items-center justify-center p-12">
						<LoadingSpinner />
					</div>
				) : !client ? (
					<div className="p-12 text-center text-gray-500">
						{t('owner.clients.failedToLoadClient')}
					</div>
				) : (
					<>
						{/* Tabs */}
						<div className="flex border-b border-gray-200">
							<button
								onClick={() => setActiveTab('info')}
								className={`flex-1 px-6 py-3 text-sm font-medium transition-colors ${
									activeTab === 'info'
										? 'text-[#ff5b5b] border-b-2 border-[#ff5b5b]'
										: 'text-gray-600 hover:text-gray-900'
								}`}
							>
								{t('owner.clients.contactInfo')}
							</button>
							<button
								onClick={() => setActiveTab('visits')}
								className={`flex-1 px-6 py-3 text-sm font-medium transition-colors ${
									activeTab === 'visits'
										? 'text-[#ff5b5b] border-b-2 border-[#ff5b5b]'
										: 'text-gray-600 hover:text-gray-900'
								}`}
							>
								{t('owner.clients.visitHistory')} ({client.bookings?.length || 0})
							</button>
							<button
								onClick={() => setActiveTab('notes')}
								className={`flex-1 px-6 py-3 text-sm font-medium transition-colors ${
									activeTab === 'notes'
										? 'text-[#ff5b5b] border-b-2 border-[#ff5b5b]'
										: 'text-gray-600 hover:text-gray-900'
								}`}
							>
								{t('owner.clients.notes')} ({notes.length})
							</button>
						</div>

						{/* Content */}
						<div className="flex-1 overflow-y-auto p-6">
							{activeTab === 'info' && (
								<div className="space-y-6">
									{!isAnonymousClient && (
										<div>
											<h3 className="text-lg font-semibold text-gray-900 mb-4">
												{t('owner.clients.contactInfo')}
											</h3>
											<div className="space-y-3">
												<div>
													<label className="text-sm font-medium text-gray-700">
														{t('owner.clients.name')}
													</label>
													<p className="mt-1 text-gray-900">
														{client.name || '-'}
													</p>
												</div>
												<div>
													<label className="text-sm font-medium text-gray-700">
														{t('owner.clients.email')}
													</label>
													<p className="mt-1 text-gray-900">{client.email}</p>
												</div>
												<div>
													<label className="text-sm font-medium text-gray-700">
														{t('owner.clients.phone')}
													</label>
													<p className="mt-1 text-gray-900">
														{client.phone || '-'}
													</p>
												</div>
											</div>
										</div>
									)}

									<div>
										<h3 className="text-lg font-semibold text-gray-900 mb-4">
											{t('owner.clients.statistics')}
										</h3>
										<div className="grid grid-cols-2 gap-4">
											<div className="bg-gray-50 rounded-lg p-4">
												<label className="text-sm font-medium text-gray-700">
													{t('owner.clients.totalRevenue')}
												</label>
												<p className="mt-1 text-xl font-semibold text-gray-900">
													{formatVND(client.totalSpent)}
												</p>
											</div>
											<div className="bg-gray-50 rounded-lg p-4">
												<label className="text-sm font-medium text-gray-700">
													{t('owner.clients.totalVisits')}
												</label>
												<p className="mt-1 text-xl font-semibold text-gray-900">
													{client.visitCount}
												</p>
											</div>
											<div className="bg-gray-50 rounded-lg p-4">
												<label className="text-sm font-medium text-gray-700">
													{t('owner.clients.completedVisits')}
												</label>
												<p className="mt-1 text-xl font-semibold text-gray-900">
													{client.completedVisits}
												</p>
											</div>
											<div className="bg-gray-50 rounded-lg p-4">
												<label className="text-sm font-medium text-gray-700">
													{t('owner.clients.lastVisit')}
												</label>
												<p className="mt-1 text-xl font-semibold text-gray-900">
													{client.lastVisit
														? format(new Date(client.lastVisit), 'MMM d, yyyy')
														: t('owner.clients.never')}
												</p>
											</div>
										</div>
									</div>
								</div>
							)}

							{activeTab === 'visits' && (
								<div>
									<h3 className="text-lg font-semibold text-gray-900 mb-4">
										{t('owner.clients.visitHistory')}
									</h3>
									{!client.bookings || client.bookings.length === 0 ? (
										<p className="text-gray-500 text-center py-8">
											{t('owner.clients.noVisits')}
										</p>
									) : (
										<div className="space-y-4">
											{client.bookings.map((booking) => (
												<div
													key={booking.id}
													className="border border-gray-200 rounded-lg p-4"
												>
													<div className="flex items-start justify-between mb-2">
														<div className="flex-1">
															<p className="font-semibold text-gray-900">
																{booking.Service.name}
															</p>
															<p className="text-sm text-gray-600 mt-1">
																{format(
																	new Date(booking.dateTime),
																	'MMM d, yyyy • h:mm a'
																)}
															</p>
														</div>
														{getStatusBadge(booking.status)}
													</div>
													<div className="grid grid-cols-2 gap-4 mt-3 text-sm">
														<div>
															<span className="text-gray-600">
																{t('owner.clients.staff')}:
															</span>
															<span className="ml-2 text-gray-900">
																{booking.Staff?.name || '-'}
															</span>
														</div>
														<div>
															<span className="text-gray-600">
																{t('owner.clients.price')}:
															</span>
															<span className="ml-2 text-gray-900 font-semibold">
																{formatVND(booking.Service.price)}
															</span>
														</div>
													</div>
													{booking.notes && (
														<div className="mt-3 pt-3 border-t border-gray-200">
															<p className="text-sm text-gray-600">
																{booking.notes}
															</p>
														</div>
													)}
												</div>
											))}
										</div>
									)}
								</div>
							)}

							{activeTab === 'notes' && (
								<div>
									<div className="flex items-center justify-between mb-4">
										<h3 className="text-lg font-semibold text-gray-900">
											{t('owner.clients.notes')}
										</h3>
										{!isAddingNote && !editingNoteId && (
											<button
												onClick={() => setIsAddingNote(true)}
												className="inline-flex items-center gap-2 px-4 py-2 bg-[#ff5b5b] text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
											>
												<Plus className="w-4 h-4" />
												{t('owner.clients.addNote')}
											</button>
										)}
									</div>

									{isAddingNote && (
										<div className="mb-6 p-4 bg-gray-50 rounded-lg">
											<textarea
												value={noteText}
												onChange={(e) => setNoteText(e.target.value)}
												placeholder={t('owner.clients.notePlaceholder')}
												className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff5b5b] resize-none"
												rows={4}
											/>
											<div className="flex gap-2 mt-3">
												<button
													onClick={handleSaveNote}
													disabled={!noteText.trim() || createNoteMutation.isPending}
													className="px-4 py-2 bg-[#ff5b5b] text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
												>
													{t('owner.clients.saveNote')}
												</button>
												<button
													onClick={() => {
														setIsAddingNote(false);
														setNoteText('');
													}}
													className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-300 transition-colors"
												>
													{t('owner.clients.cancel')}
												</button>
											</div>
										</div>
									)}

									{notesLoading ? (
										<div className="flex justify-center py-8">
											<LoadingSpinner />
										</div>
									) : notes.length === 0 ? (
										<p className="text-gray-500 text-center py-8">
											{t('owner.clients.noNotes')}
										</p>
									) : (
										<div className="space-y-4">
											{notes.map((note) => (
												<div
													key={note.id}
													className="border border-gray-200 rounded-lg p-4"
												>
													{editingNoteId === note.id ? (
														<div>
															<textarea
																value={noteText}
																onChange={(e) => setNoteText(e.target.value)}
																className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff5b5b] resize-none"
																rows={4}
															/>
															<div className="flex gap-2 mt-3">
																<button
																	onClick={handleSaveNote}
																	disabled={!noteText.trim() || updateNoteMutation.isPending}
																	className="px-4 py-2 bg-[#ff5b5b] text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
																>
																	{t('owner.clients.saveNote')}
																</button>
																<button
																	onClick={() => {
																		setEditingNoteId(null);
																		setNoteText('');
																	}}
																	className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-300 transition-colors"
																>
																	{t('owner.clients.cancel')}
																</button>
															</div>
														</div>
													) : (
														<>
															<p className="text-gray-900 whitespace-pre-wrap">
																{note.note}
															</p>
															<div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-200">
																<p className="text-xs text-gray-500">
																	{format(
																		new Date(note.createdAt),
																		'MMM d, yyyy • h:mm a'
																	)}
																</p>
																<div className="flex gap-2">
																	<button
																		onClick={() => {
																			setEditingNoteId(note.id);
																			setNoteText(note.note);
																			setIsAddingNote(false);
																		}}
																		className="p-1.5 text-gray-600 hover:text-[#ff5b5b] hover:bg-red-50 rounded transition-colors"
																	>
																		<Edit2 className="w-4 h-4" />
																	</button>
																	<button
																		onClick={() => handleDeleteNote(note.id)}
																		className="p-1.5 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
																	>
																		<Trash2 className="w-4 h-4" />
																	</button>
																</div>
															</div>
														</>
													)}
												</div>
											))}
										</div>
									)}
								</div>
							)}
						</div>
					</>
				)}
			</div>
		</div>
	);
}

