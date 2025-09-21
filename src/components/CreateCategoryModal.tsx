'use client';

import React, { useState } from 'react';
import { useCreateCategory } from '@/hooks/useCategories';

interface CreateCategoryModalProps {
	isOpen: boolean;
	onClose: () => void;
	salonId: string;
	onSuccess?: (category: any) => void;
}

export default function CreateCategoryModal({
	isOpen,
	onClose,
	salonId,
	onSuccess,
}: CreateCategoryModalProps) {
	const [categoryName, setCategoryName] = useState('');
	const createCategoryMutation = useCreateCategory();

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		if (!categoryName.trim()) {
			return;
		}

		try {
			const newCategory = await createCategoryMutation.mutateAsync({
				name: categoryName.trim(),
				salonId,
			});

			onSuccess?.(newCategory);
			setCategoryName('');
			onClose();
		} catch (error) {
			console.error('Failed to create category:', error);
		}
	};

	if (!isOpen) return null;

	return (
		<div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
			<div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md mx-auto">
				<h2 className="text-xl font-bold text-gray-900 mb-4">
					Add New Category
				</h2>

				<form onSubmit={handleSubmit}>
					<div className="mb-4">
						<label
							htmlFor="categoryName"
							className="block text-sm font-medium text-gray-700 mb-2"
						>
							Category Name
						</label>
						<input
							type="text"
							id="categoryName"
							value={categoryName}
							onChange={(e) => setCategoryName(e.target.value)}
							className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff5b5b] focus:border-transparent text-gray-900"
							placeholder="e.g., Hair Services, Nail Care"
							required
							autoFocus
						/>
					</div>

					<div className="flex justify-end gap-3">
						<button
							type="button"
							onClick={onClose}
							className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
							disabled={createCategoryMutation.isPending}
						>
							Cancel
						</button>
						<button
							type="submit"
							className="px-4 py-2 bg-[#ff5b5b] text-white rounded-lg font-medium hover:bg-[#e04a4a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
							disabled={
								createCategoryMutation.isPending || !categoryName.trim()
							}
						>
							{createCategoryMutation.isPending
								? 'Creating...'
								: 'Create Category'}
						</button>
					</div>
				</form>
			</div>
		</div>
	);
}
