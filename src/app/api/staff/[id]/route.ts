import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// PUT /api/staff/[id] - Update staff member
export async function PUT(
	request: NextRequest,
	{ params }: { params: { id: string } }
) {
	try {
		const { name, accessLevel, email, phone } = await request.json();

		// Validate required fields
		if (!name) {
			return NextResponse.json({ error: 'Name is required' }, { status: 400 });
		}

		// Validate access level
		if (accessLevel && !['ADMIN', 'EMPLOYEE'].includes(accessLevel)) {
			return NextResponse.json(
				{ error: 'Invalid access level. Must be ADMIN or EMPLOYEE' },
				{ status: 400 }
			);
		}

		// Update staff member
		const staff = await prisma.staff.update({
			where: { id: params.id },
			data: {
				name,
				accessLevel: accessLevel || 'EMPLOYEE',
				email: email || '',
				phone: phone || '',
			},
		});

		return NextResponse.json({ staff });
	} catch (error: any) {
		console.error('Error updating staff member:', error);
		return NextResponse.json(
			{ error: error.message || 'Failed to update staff member' },
			{ status: 500 }
		);
	}
}

// DELETE /api/staff/[id] - Delete staff member
export async function DELETE(
	request: NextRequest,
	{ params }: { params: { id: string } }
) {
	try {
		// Delete staff member
		await prisma.staff.delete({
			where: { id: params.id },
		});

		return NextResponse.json({ success: true });
	} catch (error: any) {
		console.error('Error deleting staff member:', error);
		return NextResponse.json(
			{ error: error.message || 'Failed to delete staff member' },
			{ status: 500 }
		);
	}
}
