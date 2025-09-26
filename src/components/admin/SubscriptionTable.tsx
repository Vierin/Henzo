interface Subscription {
	salon: string;
	subscriptionType: string;
	status: string;
	nextPaymentDate: string;
}

interface SubscriptionTableProps {
	title: string;
	subscriptions: Subscription[];
}

export default function SubscriptionTable({
	title,
	subscriptions,
}: SubscriptionTableProps) {
	return (
		<div className="bg-white rounded-lg shadow">
			<div className="px-6 py-4 border-b border-gray-200">
				<h3 className="text-lg font-medium text-gray-900">{title}</h3>
			</div>
			<div className="overflow-x-auto">
				<table className="min-w-full divide-y divide-gray-200">
					<thead className="bg-gray-50">
						<tr>
							<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
								Salon
							</th>
							<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
								Subscription Type
							</th>
							<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
								Status
							</th>
							<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
								Next Payment Date
							</th>
						</tr>
					</thead>
					<tbody className="bg-white divide-y divide-gray-200">
						{subscriptions.map((subscription, index) => (
							<tr key={index}>
								<td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
									{subscription.salon}
								</td>
								<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
									{subscription.subscriptionType}
								</td>
								<td className="px-6 py-4 whitespace-nowrap">
									<span
										className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
											subscription.status === 'Active'
												? 'bg-orange-100 text-orange-800'
												: 'bg-gray-100 text-gray-800'
										}`}
									>
										{subscription.status}
									</span>
								</td>
								<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
									{subscription.nextPaymentDate}
								</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>
		</div>
	);
}
