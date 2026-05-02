import { NextRequest } from 'next/server';
import prisma from '@/lib/db';
import { createPromotionSchema, validateRequest, formatZodErrors, paginationSchema } from '@/lib/validation';
import { protectedRoute } from '@/lib/route-helper';

export const GET = protectedRoute(async (request: NextRequest) => {
    const url = new URL(request.url);
    const params = Object.fromEntries(url.searchParams);
    const pagination = paginationSchema.parse(params);

    const where: Record<string, unknown> = { deletedAt: null };
    if (pagination.search) where.name = { contains: pagination.search };

    const [promotions, total] = await Promise.all([
        prisma.promotion.findMany({
            where, include: { item: { select: { id: true, name: true } }, category: { select: { id: true, name: true } } },
            skip: (pagination.page - 1) * pagination.limit, take: pagination.limit, orderBy: { createdAt: 'desc' },
        }),
        prisma.promotion.count({ where }),
    ]);

    return Response.json({
        success: true,
        data: promotions.map((p: { id: any; name: any; description: any; itemId: any; item: { name: any; } | null; categoryId: any; category: { name: any; } | null; discountType: any; discountValue: any; startDate: any; endDate: any; isActive: any; createdAt: any; }) => ({
            id: p.id, name: p.name, description: p.description,
            item_id: p.itemId, item_name: p.item?.name || null,
            category_id: p.categoryId, category_name: p.category?.name || null,
            discount_type: p.discountType, discount_value: Number(p.discountValue),
            start_date: p.startDate, end_date: p.endDate, is_active: p.isActive,
            created_at: p.createdAt,
        })),
        pagination: { page: pagination.page, limit: pagination.limit, total, pages: Math.ceil(total / pagination.limit) },
    });
}, { requiredPermission: 'view:promotions' });

export const POST = protectedRoute(async (request: NextRequest) => {
    const body = await request.json();
    const validation = validateRequest(createPromotionSchema, body);
    if (!validation.success) return Response.json({ success: false, message: 'Validation failed', errors: formatZodErrors(validation.errors) }, { status: 400 });

    const d = validation.data;
    const promotion = await prisma.promotion.create({
        data: {
            name: d.name, description: d.description, itemId: d.item_id || null, categoryId: d.category_id || null,
            discountType: d.discount_type, discountValue: d.discount_value,
            startDate: d.start_date, endDate: d.end_date, isActive: d.is_active,
        },
    });
    return Response.json({ success: true, data: { id: promotion.id, name: promotion.name }, message: 'Promotion created successfully' }, { status: 201 });
}, { requiredPermission: 'manage:promotions', auditAction: 'PROMOTION_CREATE', auditEntity: 'promotion' });
