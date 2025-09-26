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
}

export default function BookingTrendsChart({ data }: BookingTrendsChartProps) {
	// Подготавливаем данные для графика
	const chartData = {
		labels: data.map((item) => {
			// Преобразуем дату в формат "JUL", "AUG", etc.
			const date = new Date(item.date);
			return date.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
		}),
		datasets: [
			{
				label: 'Bookings',
				data: data.map((item) => item.count),
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
						weight: '500' as const,
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
						weight: '500' as const,
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
