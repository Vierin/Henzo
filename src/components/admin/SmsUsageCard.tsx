interface SmsUsageCardProps {
	title: string;
	sent: number;
	balance: number;
}

export default function SmsUsageCard({
	title,
	sent,
	balance,
}: SmsUsageCardProps) {
	return (
		<div className="bg-white rounded-lg shadow p-6">
			<h3 className="text-lg font-medium text-gray-900 mb-4">{title}</h3>
			<div className="space-y-4">
				<div className="flex justify-between items-center">
					<span className="text-sm text-gray-600">SMS Sent</span>
					<span className="text-2xl font-bold text-gray-900">{sent}</span>
				</div>
				<div className="flex justify-between items-center">
					<span className="text-sm text-gray-600">SMS Balance</span>
					<span className="text-2xl font-bold text-gray-900">{balance}</span>
				</div>
			</div>
		</div>
	);
}
