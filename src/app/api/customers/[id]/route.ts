import { NextRequest } from 'next/server';
import prisma from '@/lib/db';
import { updateCustomerSchema, uuidSchema, validateRequest, formatZodErrors } from '@/lib/validation';
import { protectedRoute } from '@/lib/route-helper';

export const GET = protectedRoute(async (request: NextRequest, { params }) => {
    const { id } = await params;
    if (!uuidSchema.safeParse(id).success) return Response.json({ success: false, message: 'Invalid ID' }, { status: 400 });
    const customer = await prisma.customer.findFirst({ where: { id, deletedAt: null } });
    if (!customer) return Response.json({ success: false, message: 'Customer not found' }, { status: 404 });
    return Response.json({ success: true, data: { id: customer.id, name: customer.name, email: customer.email, phone: customer.phone, loyalty_points: customer.loyaltyPoints, created_at: customer.createdAt } });
}, { requiredPermission: 'view:customers' });

export const PUT = protectedRoute(async (request: NextRequest, { params }) => {
    const { id } = await params;
    if (!uuidSchema.safeParse(id).success) return Response.json({ success: false, message: 'Invalid ID' }, { status: 400 });
    const body = await request.json();
    const validation = validateRequest(updateCustomerSchema, body);
    if (!validation.success) return Response.json({ success: false, message: 'Validation failed', errors: formatZodErrors(validation.errors) }, { status: 400 });

    const existing = await prisma.customer.findFirst({ where: { id, deletedAt: null } });
    if (!existing) return Response.json({ success: false, message: 'Customer not found' }, { status: 404 });

    const d = validation.data;
    try {
        const customer = await prisma.customer.update({
            where: { id },
            data: {
                ...(d.name !== undefined && { name: d.name }),
                ...(d.email !== undefined && { email: d.email }),
                ...(d.phone !== undefined && { phone: d.phone }),
                ...(d.loyalty_points !== undefined && { loyaltyPoints: d.loyalty_points })
            }
        });
        return Response.json({ success: true, data: { id: customer.id, name: customer.name }, message: 'Customer updated successfully' });
    } catch (error: any) {
        if (error.code === 'P2002') {
            const target = error.meta?.target || [];
            if (target.includes('email')) return Response.json({ success: false, message: 'A customer with this email already exists' }, { status: 400 });
            if (target.includes('phone')) return Response.json({ success: false, message: 'A customer with this phone number already exists' }, { status: 400 });
        }
        console.error('Customer Update Error:', error);
        return Response.json({ success: false, message: 'Failed to update customer' }, { status: 500 });
    }
}, { requiredPermission: 'manage:customers', auditAction: 'CUSTOMER_UPDATE', auditEntity: 'customer' });

export const DELETE = protectedRoute(async (request: NextRequest, { params }) => {
    const { id } = await params;
    if (!uuidSchema.safeParse(id).success) return Response.json({ success: false, message: 'Invalid ID' }, { status: 400 });
    const existing = await prisma.customer.findFirst({ where: { id, deletedAt: null } });
    if (!existing) return Response.json({ success: false, message: 'Customer not found' }, { status: 404 });
    await prisma.customer.update({ where: { id }, data: { deletedAt: new Date() } });
    return Response.json({ success: true, message: 'Customer deleted successfully' });
}, { requiredPermission: 'manage:customers', auditAction: 'CUSTOMER_DELETE', auditEntity: 'customer' });
