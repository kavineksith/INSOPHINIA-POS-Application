import { NextRequest } from 'next/server';
import prisma from '@/lib/db';
import { updateItemSchema, uuidSchema, validateRequest, formatZodErrors } from '@/lib/validation';
import { protectedRoute } from '@/lib/route-helper';

// GET /api/items/[id]
export const GET = protectedRoute(async (request: NextRequest, { params }) => {
    const { id } = await params;
    if (!uuidSchema.safeParse(id).success) return Response.json({ success: false, message: 'Invalid ID' }, { status: 400 });

    const item = await prisma.item.findFirst({
        where: { id, deletedAt: null },
        include: { category: { select: { id: true, name: true } } },
    });
    if (!item) return Response.json({ success: false, message: 'Item not found' }, { status: 404 });

    return Response.json({
        success: true,
        data: {
            id: item.id, plu_code: item.pluCode, name: item.name, description: item.description,
            category_id: item.categoryId, category_name: item.category.name,
            barcode: item.barcode, qr_code: item.qrCode, unit: (item as any).unit || 'pcs',
            price: Number(item.price), cost_price: Number(item.costPrice),
            stock_quantity: Number(item.stockQuantity), 
            total_quantity: Number(item.totalQuantity),
            sell_quantity: Number(item.sellQuantity), 
            return_quantity: Number(item.returnQuantity),
            damage_quantity: Number(item.damageQuantity), 
            lost_quantity: Number(item.lostQuantity),
            low_stock_threshold: Number(item.lowStockThreshold),
            is_active: item.isActive, has_discount: item.hasDiscount,
            discount_percentage: Number(item.discountPercentage),
            created_at: item.createdAt, updated_at: item.updatedAt,
        },
    });
}, { requiredPermission: 'view:items' });

// PUT /api/items/[id]
export const PUT = protectedRoute(async (request: NextRequest, { params }) => {
    const { id } = await params;
    if (!uuidSchema.safeParse(id).success) return Response.json({ success: false, message: 'Invalid ID' }, { status: 400 });
    const body = await request.json();
    const validation = validateRequest(updateItemSchema, body);
    if (!validation.success) return Response.json({ success: false, message: 'Validation failed', errors: formatZodErrors(validation.errors) }, { status: 400 });

    const existing = await prisma.item.findFirst({ where: { id, deletedAt: null } });
    if (!existing) return Response.json({ success: false, message: 'Item not found' }, { status: 404 });

    const data = validation.data;
    const updateData: Record<string, unknown> = {};
    if (data.plu_code !== undefined) updateData.pluCode = data.plu_code;
    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.category_id !== undefined) updateData.categoryId = data.category_id;
    if (data.barcode !== undefined) updateData.barcode = data.barcode || null;
    if (data.qr_code !== undefined) updateData.qrCode = data.qr_code || null;
    if (data.price !== undefined) updateData.price = data.price;
    if (data.cost_price !== undefined) updateData.costPrice = data.cost_price;
    if (data.unit !== undefined) updateData.unit = data.unit;
    if (data.low_stock_threshold !== undefined) updateData.lowStockThreshold = data.low_stock_threshold;
    if (data.has_discount !== undefined) updateData.hasDiscount = data.has_discount;
    if (data.discount_percentage !== undefined) updateData.discountPercentage = data.discount_percentage;

    try {
        const item = await prisma.item.update({ where: { id }, data: updateData });
        return Response.json({ success: true, data: { id: item.id, name: item.name }, message: 'Item updated successfully' });
    } catch (error: any) {
        if (error.code === 'P2002') {
            const target = error.meta?.target || [];
            if (target.includes('plu_code')) return Response.json({ success: false, message: 'PLU code already exists' }, { status: 400 });
            if (target.includes('barcode')) return Response.json({ success: false, message: 'Barcode already exists' }, { status: 400 });
        }
        console.error('Item Update Error:', error);
        return Response.json({ success: false, message: 'Failed to update item' }, { status: 500 });
    }
}, { requiredPermission: 'manage:items', auditAction: 'ITEM_UPDATE', auditEntity: 'item' });

// DELETE /api/items/[id]
export const DELETE = protectedRoute(async (request: NextRequest, { params }) => {
    const { id } = await params;
    if (!uuidSchema.safeParse(id).success) return Response.json({ success: false, message: 'Invalid ID' }, { status: 400 });
    const existing = await prisma.item.findFirst({ where: { id, deletedAt: null } });
    if (!existing) return Response.json({ success: false, message: 'Item not found' }, { status: 404 });
    await prisma.item.update({ where: { id }, data: { deletedAt: new Date(), isActive: false } });
    return Response.json({ success: true, message: 'Item deleted successfully' });
}, { requiredPermission: 'manage:items', auditAction: 'ITEM_DELETE', auditEntity: 'item' });
