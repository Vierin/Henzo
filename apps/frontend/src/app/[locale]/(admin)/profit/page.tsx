'use client';

import { useState, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
	format,
	startOfMonth,
	endOfMonth,
	eachMonthOfInterval,
} from 'date-fns';
import { apiClient } from '@/lib/api-client';
import LoadingSpinner from '@/components/LoadingSpinner';

interface MonthlyReport {
	month: Date;
	revenue: number; // Прибыль с подписок
	expenses: number; // Расходы
	netProfit: number; // Чистая прибыль
}

interface ExpensesData {
	[key: string]: {
		[key: string]: number; // Категории расходов (Digital ocean, Supabase, и т.д.)
	};
}

export default function ProfitPage() {
	// Генерируем список месяцев с октября 2025 до текущего месяца
	const months = useMemo(() => {
		const now = new Date();
		const startDate = new Date(2025, 9, 1); // Октябрь 2025 (месяц 9, т.к. 0-индексированный)
		const endDate = now > startDate ? endOfMonth(now) : endOfMonth(startDate);
		return eachMonthOfInterval({
			start: startOfMonth(startDate),
			end: endDate,
		}).reverse(); // Новые месяцы сверху
	}, []);

	// Загружаем прибыль с подписок из API
	const { data: monthlyRevenue, isLoading: isLoadingRevenue } = useQuery({
		queryKey: ['admin-monthly-revenue'],
		queryFn: async () => {
			const response = await apiClient.get<Record<string, number>>(
				'/admin/monthly-revenue'
			);
			return response;
		},
		staleTime: 5 * 60 * 1000, // 5 minutes
	});

	// Загружаем расходы из JSON файла
	const { data: expenses, isLoading: isLoadingExpenses } = useQuery({
		queryKey: ['admin-expenses'],
		queryFn: async () => {
			const response = await fetch('/expenses.json');
			if (!response.ok) {
				throw new Error('Failed to load expenses');
			}
			const data: ExpensesData = await response.json();
			return data;
		},
		staleTime: 60 * 60 * 1000, // 1 hour (расходы обновляются редко)
	});

	// Конвертируем из донгов в доллары (примерный курс: 1 USD = 25000 VND)
	const convertToUSD = (amountInVND: number) => {
		return amountInVND / 25000;
	};

	// Объединяем данные в reports и конвертируем в доллары
	const reports = useMemo(() => {
		const result: Record<string, MonthlyReport> = {};
		months.forEach((month) => {
			const key = format(month, 'yyyy-MM');
			// Конвертируем прибыль из донгов в доллары
			const revenueVND = monthlyRevenue?.[key] || 0;
			const revenue = convertToUSD(revenueVND);
			// Суммируем все категории расходов для месяца
			const monthExpenses = expenses?.[key] || {};
			const expensesAmount = Object.values(monthExpenses).reduce(
				(sum, value) => sum + (typeof value === 'number' ? value : 0),
				0
			);
			result[key] = {
				month,
				revenue,
				expenses: expensesAmount,
				netProfit: revenue - expensesAmount,
			};
		});
		return result;
	}, [months, monthlyRevenue, expenses]);

	const formatCurrency = (amount: number) => {
		// Предполагаем, что amount уже в долларах (после конвертации)
		return new Intl.NumberFormat('en-US', {
			style: 'currency',
			currency: 'USD',
			minimumFractionDigits: 2,
			maximumFractionDigits: 2,
		}).format(amount);
	};

	const formatMonth = (date: Date) => {
		const months = [
			'Январь',
			'Февраль',
			'Март',
			'Апрель',
			'Май',
			'Июнь',
			'Июль',
			'Август',
			'Сентябрь',
			'Октябрь',
			'Ноябрь',
			'Декабрь',
		];
		const monthName = months[date.getMonth()];
		const year = date.getFullYear();
		return `${monthName} ${year}`;
	};

	const handleEdit = (monthKey: string) => {
		// TODO: Открыть модальное окно для редактирования
		console.log('Edit month:', monthKey);
	};

	if (isLoadingRevenue || isLoadingExpenses) {
		return <LoadingSpinner size="lg" message="Загрузка финансовых данных..." />;
	}

	return (
		<div className="space-y-6">
			<div className="flex justify-between items-center">
				<div>
					<h1 className="text-3xl font-bold text-gray-900">Прибыль</h1>
					<p className="text-gray-600 mt-1">Финансовые отчеты по месяцам</p>
				</div>
			</div>

			{/* Список карточек по месяцам */}
			<div className="space-y-3">
				{months.map((month) => {
					const monthKey = format(month, 'yyyy-MM');
					const report = reports[monthKey];
					const netProfit = report.revenue - report.expenses;

					return (
						<div
							key={monthKey}
							className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow"
						>
							<div className="p-4">
								{/* Заголовок карточки */}
								<div className="flex items-center justify-between mb-3">
									<h2 className="text-lg font-semibold text-gray-900">
										{formatMonth(month)}
									</h2>
									<button
										onClick={() => handleEdit(monthKey)}
										className="px-3 py-1.5 text-xs font-medium text-[#ff5b5b] hover:bg-red-50 rounded-md transition-colors border border-[#ff5b5b]/20 hover:border-[#ff5b5b]/40"
									>
										Редактировать
									</button>
								</div>

								{/* Финансовые данные */}
								<div className="grid grid-cols-1 md:grid-cols-3 gap-3">
									{/* Прибыль с подписок */}
									<div className="bg-green-50 rounded-md p-3 border border-green-100">
										<div className="text-xs text-gray-600 mb-0.5">
											Revenue with subscriptions
										</div>
										<div className="text-lg font-bold text-green-700">
											{formatCurrency(report.revenue)}
										</div>
									</div>

									{/* Расходы */}
									<div className="bg-red-50 rounded-md p-3 border border-red-100">
										<div className="text-xs text-gray-600 mb-0.5">Expenses</div>
										<div className="text-lg font-bold text-red-700">
											{formatCurrency(report.expenses)}
										</div>
									</div>

									{/* Чистая прибыль */}
									<div
										className={`rounded-md p-3 border ${
											netProfit >= 0
												? 'bg-blue-50 border-blue-100'
												: 'bg-orange-50 border-orange-100'
										}`}
									>
										<div className="text-xs text-gray-600 mb-0.5">
											Net profit
										</div>
										<div
											className={`text-lg font-bold ${
												netProfit >= 0 ? 'text-blue-700' : 'text-orange-700'
											}`}
										>
											{formatCurrency(netProfit)}
										</div>
									</div>
								</div>
							</div>
						</div>
					);
				})}
			</div>

			{/* Итоговая статистика */}
			<div className="bg-gradient-to-r from-[#fff7f6] to-[#ffe5e3] rounded-xl p-6 border border-[#ff5b5b]/20">
				<h2 className="text-lg font-bold text-gray-900 mb-4">
					Итого за период
				</h2>
				<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
					<div className="bg-white rounded-lg p-4 shadow-sm">
						<div className="text-sm text-gray-600 mb-1">
							Total revenue with subscriptions
						</div>
						<div className="text-2xl font-bold text-gray-900">
							{formatCurrency(
								Object.values(reports).reduce((sum, r) => sum + r.revenue, 0)
							)}
						</div>
					</div>
					<div className="bg-white rounded-lg p-4 shadow-sm">
						<div className="text-sm text-gray-600 mb-1">Total expenses</div>
						<div className="text-2xl font-bold text-gray-900">
							{formatCurrency(
								Object.values(reports).reduce((sum, r) => sum + r.expenses, 0)
							)}
						</div>
					</div>
					<div className="bg-white rounded-lg p-4 shadow-sm">
						<div className="text-sm text-gray-600 mb-1">Total net profit</div>
						<div className="text-2xl font-bold text-gray-900">
							{formatCurrency(
								Object.values(reports).reduce(
									(sum, r) => sum + (r.revenue - r.expenses),
									0
								)
							)}
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
