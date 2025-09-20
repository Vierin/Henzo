const {
	PrismaClient,
} = require('../../packages/db/node_modules/@prisma/client');

const prisma = new PrismaClient();

async function main() {
	console.log('🌱 Seeding database...');

	// Create a test user
	const user = await prisma.user.upsert({
		where: { email: 'test@example.com' },
		update: {},
		create: {
			email: 'test@example.com',
			name: 'Test User',
			role: 'OWNER',
		},
	});

	console.log('✅ User created:', user.email);

	// Create a test salon
	const salon = await prisma.salon.upsert({
		where: { id: '1' },
		update: {},
		create: {
			id: '1',
			name: 'Test Beauty Salon',
			address: '123 Main St, City, State 12345',
			phone: '+1 (555) 123-4567',
			email: 'info@testbeautysalon.com',
			website: 'https://testbeautysalon.com',
			instagram: '@testbeautysalon',
			ownerId: user.id,
		},
	});

	console.log('✅ Salon created:', salon.name);

	// Create test services
	const services = [
		{
			name: 'Haircut',
			description: 'Professional haircut and styling',
			duration: 60,
			price: 50,
		},
		{
			name: 'Manicure',
			description: 'Full manicure with nail polish',
			duration: 45,
			price: 35,
		},
		{
			name: 'Facial',
			description: 'Deep cleansing facial treatment',
			duration: 90,
			price: 80,
		},
		{
			name: 'Massage',
			description: 'Relaxing full body massage',
			duration: 60,
			price: 70,
		},
		{
			name: 'Hair Color',
			description: 'Professional hair coloring service',
			duration: 120,
			price: 120,
		},
	];

	for (const serviceData of services) {
		const service = await prisma.service.upsert({
			where: {
				name_salonId: {
					name: serviceData.name,
					salonId: salon.id,
				},
			},
			update: {},
			create: {
				...serviceData,
				salonId: salon.id,
			},
		});
		console.log('✅ Service created:', service.name);
	}

	// Create test staff
	const staff = [
		{
			name: 'Emily Carter',
			role: 'Hair Stylist',
			email: 'emily@testbeautysalon.com',
			phone: '+1 (555) 111-1111',
		},
		{
			name: 'Ava Thompson',
			role: 'Nail Technician',
			email: 'ava@testbeautysalon.com',
			phone: '+1 (555) 222-2222',
		},
		{
			name: 'Chloe Davis',
			role: 'Esthetician',
			email: 'chloe@testbeautysalon.com',
			phone: '+1 (555) 333-3333',
		},
		{
			name: 'Grace Evans',
			role: 'Massage Therapist',
			email: 'grace@testbeautysalon.com',
			phone: '+1 (555) 444-4444',
		},
		{
			name: 'Lily Foster',
			role: 'Hair Stylist',
			email: 'lily@testbeautysalon.com',
			phone: '+1 (555) 555-5555',
		},
	];

	for (const staffData of staff) {
		const staffMember = await prisma.staff.upsert({
			where: {
				name_salonId: {
					name: staffData.name,
					salonId: salon.id,
				},
			},
			update: {},
			create: {
				...staffData,
				salonId: salon.id,
			},
		});
		console.log('✅ Staff created:', staffMember.name);
	}

	console.log('🎉 Database seeded successfully!');
}

main()
	.catch((e) => {
		console.error('❌ Error seeding database:', e);
		process.exit(1);
	})
	.finally(async () => {
		await prisma.$disconnect();
	});
