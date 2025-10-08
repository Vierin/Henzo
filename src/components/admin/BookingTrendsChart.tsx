'use client';

import {
	Chart as ChartJS,
	CategoryScale,
	LinearScale,
	PointElement,
	LineElement,
	Title,
	Tooltip,
	Legend,
	Filler,
} from 'chart.js';
import { Line } from 'react-chartjs-2';

// Регистрируем компоненты Chart.js
ChartJS.register(
	CategoryScale,
	LinearScale,
	PointElement,
	LineElement,
	Title,
	Tooltip,
	Legend,
	Filler
);

interface BookingTrendsChartProps {
	data: Array<{
		date: string;
		count: number;
	}>;
	period?: string;
}

export default function BookingTrendsChart({
	data,
	period = '30d',
}: BookingTrendsChartProps) {
	// Если нет данных, показываем пустой график
	if (!data || data.length === 0) {
		return (
			<div className="w-full h-64 flex items-center justify-center text-gray-500">
				<div className="text-center">
					<svg
						className="w-12 h-12 mx-auto mb-2 text-gray-300"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
					>
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth={2}
							d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
						/>
					</svg>
					<p className="text-sm">No booking data available</p>
				</div>
			</div>
		);
	}

	// Сортируем данные по дате для правильного отображения
	const sortedData = [...data].sort(
		(a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
	);

	// Функция для форматирования подписей в зависимости от периода
	const formatLabel = (dateString: string, period: string) => {
		const date = new Date(dateString);

		switch (period) {
			case '7d':
				// Для 7 дней показываем день недели
				return date.toLocaleDateString('en-US', { weekday: 'short' });
			case '30d':
				// Для 30 дней показываем недели (Week 1, Week 2, etc.)
				const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
				const dayOfMonth = date.getDate();
				const weekNumber = Math.ceil((dayOfMonth + startOfMonth.getDay()) / 7);
				return `Week ${weekNumber}`;
			case '3m':
				// Для 3 месяцев показываем месяцы
				return date
					.toLocaleDateString('en-US', { month: 'short' })
					.toUpperCase();
			case '1y':
				// Для года показываем кварталы
				const quarter = Math.ceil((date.getMonth() + 1) / 3);
				return `Q${quarter}`;
			default:
				return date
					.toLocaleDateString('en-US', { month: 'short' })
					.toUpperCase();
		}
	};

	// Подготавливаем данные для графика
	const chartData = {
		labels: sortedData.map((item) => formatLabel(item.date, period)),
		datasets: [
			{
				label: 'Bookings',
				data: sortedData.map((item) => item.count),
				borderColor: '#ff5b5b',
				backgroundColor: 'rgba(255, 91, 91, 0.1)',
				borderWidth: 2,
				fill: true,
				tension: 0.4,
				pointBackgroundColor: '#ff5b5b',
				pointBorderColor: '#ffffff',
				pointBorderWidth: 2,
				pointRadius: 4,
				pointHoverRadius: 6,
			},
		],
	};

	const options = {
		responsive: true,
		maintainAspectRatio: false,
		plugins: {
			legend: {
				display: false, // Скрываем легенду
			},
			tooltip: {
				backgroundColor: 'rgba(0, 0, 0, 0.8)',
				titleColor: '#ffffff',
				bodyColor: '#ffffff',
				borderColor: '#ff5b5b',
				borderWidth: 1,
				cornerRadius: 8,
				displayColors: false,
				callbacks: {
					label: function (context: any) {
						return `${context.parsed.y} bookings`;
					},
				},
			},
		},
		scales: {
			x: {
				display: true,
				grid: {
					display: false, // Скрываем вертикальные линии сетки
				},
				ticks: {
					color: '#6b7280',
					font: {
						size: 12,
						weight: 500,
					},
				},
			},
			y: {
				display: true,
				grid: {
					color: 'rgba(107, 114, 128, 0.1)',
					drawBorder: false,
				},
				ticks: {
					color: '#6b7280',
					font: {
						size: 12,
						weight: 500,
					},
					callback: function (value: any) {
						return value;
					},
				},
			},
		},
		elements: {
			point: {
				hoverBackgroundColor: '#ff5b5b',
			},
		},
	};

	return (
		<div className="w-full h-64">
			<Line data={chartData} options={options} />
		</div>
	);
}
