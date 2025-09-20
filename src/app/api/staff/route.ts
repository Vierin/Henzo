import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/../../packages/db/client';

// GET /api/staff - Get all staff
export async function GET() {
	try {
		const staff = await prisma.staff.findMany({
			orderBy: {
				name: 'asc',
			},
		});

		return NextResponse.json({ staff });
	} catch (error: any) {
		console.error('Error fetching staff:', error);
		return NextResponse.json(
			{ error: error.message || 'Failed to fetch staff' },
			{ status: 500 }
		);
	}
}

// POST /api/staff - Create new staff member
export async function POST(request: NextRequest) {
	try {
		const { name, role, email, phone, salonId } = await request.json();

		// Validate required fields
		if (!name || !salonId) {
			return NextResponse.json(
				{ error: 'Name and salonId are required' },
				{ status: 400 }
			);
		}

		// Create staff member
		const staff = await prisma.staff.create({
			data: {
				name,
				role: role || '',
				email: email || '',
				phone: phone || '',
				salonId,
			},
		});

		return NextResponse.json({ staff }, { status: 201 });
	} catch (error: any) {
		console.error('Error creating staff:', error);
		return NextResponse.json(
			{ error: error.message || 'Failed to create staff' },
			{ status: 500 }
		);
	}
}
