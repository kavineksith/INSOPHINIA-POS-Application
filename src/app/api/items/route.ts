import { NextRequest } from 'next/server';
import prisma from '@/lib/db';
import { createItemSchema, validateRequest, formatZodErrors, paginationSchema } from '@/lib/validation';
import { protectedRoute } from '@/lib/route-helper';

// GET /api/items
export const GET = protectedRoute(async (request: NextRequest) => {
    const url = new URL(request.url);
    const params = Object.fromEntries(url.searchParams);
    const pagination = paginationSchema.parse(params);
    const categoryId = url.searchParams.get('category_id');

    const where: Record<string, unknown> = { deletedAt: null };
    if (categoryId) where.categoryId = categoryId;
    if (pagination.search) {
        where.OR = [
            { name: { contains: pagination.search } },
            { pluCode: { contains: pagination.search } },
            { barcode: { contains: pagination.search } },
        ];
    }

    const [items, total] = await Promise.all([
        prisma.item.findMany({
            where,
            include: { category: { select: { id: true, name: true } } },
            skip: (pagination.page - 1) * pagination.limit,
            take: pagination.limit,
            orderBy: { [pagination.sortBy || 'createdAt']: pagination.sortOrder },
        }),
        prisma.item.count({ where }),
    ]);

    return Response.json({
        success: true,
        data: items.map((item: any) => ({
            id: item.id, plu_code: item.pluCode, name: item.name, description: item.description,
            category_id: item.categoryId, category_name: item.category.name,
            barcode: item.barcode, qr_code: item.qrCode, unit: item.unit || 'pcs',
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
        })),
        pagination: { page: pagination.page, limit: pagination.limit, total, pages: Math.ceil(total / pagination.limit) },
    });
}, { requiredPermission: 'view:items' });

// POST /api/items
export const POST = protectedRoute(async (request: NextRequest) => {
    const body = await request.json();
    const validation = validateRequest(createItemSchema, body);
    if (!validation.success) {
        return Response.json({ success: false, message: 'Validation failed', errors: formatZodErrors(validation.errors) }, { status: 400 });
    }

    const data = validation.data;

    // Check duplicate PLU/barcode
    const dupPlu = await prisma.item.findFirst({ where: { pluCode: data.plu_code, deletedAt: null } });
    if (dupPlu) return Response.json({ success: false, message: 'PLU code already exists' }, { status: 409 });

    if (data.barcode) {
        const dupBarcode = await prisma.item.findFirst({ where: { barcode: data.barcode, deletedAt: null } });
        if (dupBarcode) return Response.json({ success: false, message: 'Barcode already exists' }, { status: 409 });
    }

    // Verify category exists
    const category = await prisma.category.findFirst({ where: { id: data.category_id, deletedAt: null } });
    if (!category) return Response.json({ success: false, message: 'Category not found' }, { status: 404 });

    try {
        const item = await prisma.item.create({
            data: {
                pluCode: data.plu_code, name: data.name, description: data.description,
                categoryId: data.category_id, barcode: data.barcode || null, qrCode: data.qr_code || null,
                price: data.price, costPrice: data.cost_price, unit: data.unit,
                stockQuantity: data.stock_quantity, totalQuantity: data.stock_quantity,
                lowStockThreshold: data.low_stock_threshold,
                hasDiscount: data.has_discount, discountPercentage: data.discount_percentage,
            } as any,
        });

        return Response.json({
            success: true,
            data: { id: item.id, plu_code: item.pluCode, name: item.name },
            message: 'Item created successfully',
        }, { status: 201 });
    } catch (error: any) {
        if (error.code === 'P2002') {
            const target = error.meta?.target || [];
            if (target.includes('plu_code')) return Response.json({ success: false, message: 'PLU code already exists' }, { status: 400 });
            if (target.includes('barcode')) return Response.json({ success: false, message: 'Barcode already exists' }, { status: 400 });
        }
        console.error('Item Creation Error:', error);
        return Response.json({ success: false, message: 'Failed to create item' }, { status: 500 });
    }
}, { requiredPermission: 'manage:items', auditAction: 'ITEM_CREATE', auditEntity: 'item' });
