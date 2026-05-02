import { NextRequest } from 'next/server';
import prisma from '@/lib/db';
import { updatePromotionSchema, uuidSchema, validateRequest, formatZodErrors } from '@/lib/validation';
import { protectedRoute } from '@/lib/route-helper';

export const GET = protectedRoute(async (request: NextRequest, { params }) => {
    const { id } = await params;
    if (!uuidSchema.safeParse(id).success) return Response.json({ success: false, message: 'Invalid ID' }, { status: 400 });
    const p = await prisma.promotion.findFirst({ where: { id, deletedAt: null }, include: { item: { select: { name: true } }, category: { select: { name: true } } } });
    if (!p) return Response.json({ success: false, message: 'Promotion not found' }, { status: 404 });
    return Response.json({ success: true, data: { id: p.id, name: p.name, description: p.description, item_id: p.itemId, item_name: p.item?.name, category_id: p.categoryId, category_name: p.category?.name, discount_type: p.discountType, discount_value: Number(p.discountValue), start_date: p.startDate, end_date: p.endDate, is_active: p.isActive } });
}, { requiredPermission: 'view:promotions' });

export const PUT = protectedRoute(async (request: NextRequest, { params }) => {
    const { id } = await params;
    if (!uuidSchema.safeParse(id).success) return Response.json({ success: false, message: 'Invalid ID' }, { status: 400 });
    const body = await request.json();
    const validation = validateRequest(updatePromotionSchema, body);
    if (!validation.success) return Response.json({ success: false, message: 'Validation failed', errors: formatZodErrors(validation.errors) }, { status: 400 });

    const existing = await prisma.promotion.findFirst({ where: { id, deletedAt: null } });
    if (!existing) return Response.json({ success: false, message: 'Promotion not found' }, { status: 404 });

    const d = validation.data;
    const updateData: Record<string, unknown> = {};
    if (d.name !== undefined) updateData.name = d.name;
    if (d.description !== undefined) updateData.description = d.description;
    if (d.item_id !== undefined) updateData.itemId = d.item_id;
    if (d.category_id !== undefined) updateData.categoryId = d.category_id;
    if (d.discount_type !== undefined) updateData.discountType = d.discount_type;
    if (d.discount_value !== undefined) updateData.discountValue = d.discount_value;
    if (d.start_date !== undefined) updateData.startDate = d.start_date;
    if (d.end_date !== undefined) updateData.endDate = d.end_date;
    if (d.is_active !== undefined) updateData.isActive = d.is_active;

    await prisma.promotion.update({ where: { id }, data: updateData });
    return Response.json({ success: true, message: 'Promotion updated successfully' });
}, { requiredPermission: 'manage:promotions', auditAction: 'PROMOTION_UPDATE', auditEntity: 'promotion' });

export const DELETE = protectedRoute(async (request: NextRequest, { params }) => {
    const { id } = await params;
    if (!uuidSchema.safeParse(id).success) return Response.json({ success: false, message: 'Invalid ID' }, { status: 400 });
    const existing = await prisma.promotion.findFirst({ where: { id, deletedAt: null } });
    if (!existing) return Response.json({ success: false, message: 'Promotion not found' }, { status: 404 });
    await prisma.promotion.update({ where: { id }, data: { deletedAt: new Date() } });
    return Response.json({ success: true, message: 'Promotion deleted successfully' });
}, { requiredPermission: 'manage:promotions', auditAction: 'PROMOTION_DELETE', auditEntity: 'promotion' });
