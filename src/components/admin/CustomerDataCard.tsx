interface Customer {
	salon: string;
	totalCustomers: number;
}

interface CustomerDataCardProps {
	title: string;
	customers: Customer[];
}

export default function CustomerDataCard({
	title,
	customers,
}: CustomerDataCardProps) {
	return (
		<div className="bg-white rounded-lg shadow p-6">
			<h3 className="text-lg font-medium text-gray-900 mb-4">{title}</h3>
			<div className="space-y-3">
				{customers.slice(0, 3).map((customer, index) => (
					<div key={index} className="flex justify-between items-center">
						<span className="text-sm text-gray-600">{customer.salon}</span>
						<span className="text-sm font-medium text-gray-900">
							{customer.totalCustomers}
						</span>
					</div>
				))}
			</div>
		</div>
	);
}
