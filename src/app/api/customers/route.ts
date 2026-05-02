import { NextRequest } from 'next/server';
import prisma from '@/lib/db';
import { createCustomerSchema, validateRequest, formatZodErrors, paginationSchema } from '@/lib/validation';
import { protectedRoute } from '@/lib/route-helper';

// GET /api/customers
export const GET = protectedRoute(async (request: NextRequest) => {
    const url = new URL(request.url);
    const params = Object.fromEntries(url.searchParams);
    const pagination = paginationSchema.parse(params);

    const where: Record<string, unknown> = { deletedAt: null };
    if (pagination.search) {
        where.OR = [
            { name: { contains: pagination.search } },
            { email: { contains: pagination.search } },
            { phone: { contains: pagination.search } },
        ];
    }

    const [customers, total] = await Promise.all([
        prisma.customer.findMany({ where, skip: (pagination.page - 1) * pagination.limit, take: pagination.limit, orderBy: { createdAt: 'desc' } }),
        prisma.customer.count({ where }),
    ]);

    return Response.json({
        success: true,
        data: customers.map(c => ({ id: c.id, name: c.name, email: c.email, phone: c.phone, loyalty_points: c.loyaltyPoints, created_at: c.createdAt })),
        pagination: { page: pagination.page, limit: pagination.limit, total, pages: Math.ceil(total / pagination.limit) },
    });
}, { requiredPermission: 'view:customers' });

// POST /api/customers
export const POST = protectedRoute(async (request: NextRequest) => {
    try {
        const body = await request.json();
        const validation = validateRequest(createCustomerSchema, body);
        if (!validation.success) return Response.json({ success: false, message: 'Validation failed', errors: formatZodErrors(validation.errors) }, { status: 400 });

        const customer = await prisma.customer.create({
            data: {
                name: validation.data.name,
                email: validation.data.email || null,
                phone: validation.data.phone || null,
                loyaltyPoints: validation.data.loyalty_points || 0
            }
        });
        return Response.json({ success: true, data: { id: customer.id, name: customer.name }, message: 'Customer created successfully' }, { status: 201 });
    } catch (error: any) {
        if (error.code === 'P2002') {
            const target = error.meta?.target || [];
            if (target.includes('email')) return Response.json({ success: false, message: 'A customer with this email already exists' }, { status: 400 });
            if (target.includes('phone')) return Response.json({ success: false, message: 'A customer with this phone number already exists' }, { status: 400 });
        }
        console.error('Customer Creation Error:', error);
        return Response.json({ success: false, message: 'Failed to create customer' }, { status: 500 });
    }
}, { requiredPermission: 'manage:customers', auditAction: 'CUSTOMER_CREATE', auditEntity: 'customer' });
