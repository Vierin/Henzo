import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/salons - Get all salons
export async function GET() {
	try {
		const salons = await prisma.salon.findMany({
			include: {
				owner: true,
			},
			orderBy: {
				name: 'asc',
			},
		});

		return NextResponse.json({ salons });
	} catch (error: any) {
		console.error('Error fetching salons:', error);
		return NextResponse.json(
			{ error: error.message || 'Failed to fetch salons' },
			{ status: 500 }
		);
	}
}

// POST /api/salons - Create new salon
export async function POST(request: NextRequest) {
	try {
		const { name, address, phone, email, website, instagram, ownerId } =
			await request.json();

		// Validate required fields
		if (!name || !ownerId) {
			return NextResponse.json(
				{ error: 'Name and ownerId are required' },
				{ status: 400 }
			);
		}

		// Create salon
		const salon = await prisma.salon.create({
			data: {
				name,
				address: address || '',
				phone: phone || '',
				email: email || '',
				website: website || '',
				instagram: instagram || '',
				ownerId,
			},
		});

		return NextResponse.json({ salon }, { status: 201 });
	} catch (error: any) {
		console.error('Error creating salon:', error);
		return NextResponse.json(
			{ error: error.message || 'Failed to create salon' },
			{ status: 500 }
		);
	}
}
