'use client';

import React from 'react';
import LoadingSpinner from '../LoadingSpinner';

interface Column<T> {
	key: keyof T | string;
	label: string;
	render?: (item: T, value: any, index: number) => React.ReactNode;
	sortable?: boolean;
	width?: string;
}

interface AdminTableProps<T> {
	data: T[];
	columns: Column<T>[];
	loading?: boolean;
	emptyMessage?: string;
	onRowClick?: (item: T) => void;
	className?: string;
}

export default function AdminTable<T extends { id: string }>({
	data,
	columns,
	loading = false,
	emptyMessage = 'No data found',
	onRowClick,
	className = '',
}: AdminTableProps<T>) {
	if (loading) {
		return (
			<div className="bg-white shadow overflow-hidden sm:rounded-md">
				<div className="flex items-center justify-center py-12">
					<LoadingSpinner size="lg" />
				</div>
			</div>
		);
	}

	if (data.length === 0) {
		return (
			<div className="bg-white shadow overflow-hidden sm:rounded-md">
				<div className="text-center py-12">
					<div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
						<span className="text-2xl">📋</span>
					</div>
					<h3 className="text-lg font-medium text-gray-900 mb-2">
						No data available
					</h3>
					<p className="text-gray-500">{emptyMessage}</p>
				</div>
			</div>
		);
	}

	return (
		<div
			className={`bg-white shadow overflow-hidden sm:rounded-md ${className}`}
		>
			<div className="overflow-x-auto">
				<table className="min-w-full divide-y divide-gray-200">
					<thead className="bg-gray-50">
						<tr>
							{columns.map((column, index) => (
								<th
									key={index}
									className={`px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${
										column.width ? '' : ''
									}`}
									style={{ width: column.width }}
								>
									{column.label}
								</th>
							))}
						</tr>
					</thead>
					<tbody className="bg-white divide-y divide-gray-200">
						{data.map((item, rowIndex) => (
							<tr
								key={item.id}
								className={`hover:bg-gray-50 ${
									onRowClick ? 'cursor-pointer' : ''
								}`}
								onClick={() => onRowClick?.(item)}
							>
								{columns.map((column, colIndex) => {
									const keyStr = String(column.key);
									const value = keyStr.includes('.')
										? keyStr
												.split('.')
												.reduce((obj, key) => (obj as any)?.[key], item)
										: (item as any)[column.key];

									return (
										<td
											key={colIndex}
											className="px-6 py-4 whitespace-nowrap text-sm text-gray-500"
										>
											{column.render
												? column.render(item, value, rowIndex)
												: value}
										</td>
									);
								})}
							</tr>
						))}
					</tbody>
				</table>
			</div>
		</div>
	);
}
