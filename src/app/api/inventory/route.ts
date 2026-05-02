import { NextRequest } from 'next/server';
import prisma from '@/lib/db';
import { stockMovementSchema, validateRequest, formatZodErrors, paginationSchema } from '@/lib/validation';
import { protectedRoute } from '@/lib/route-helper';

// GET /api/inventory
export const GET = protectedRoute(async (request: NextRequest) => {
    const url = new URL(request.url);
    const params = Object.fromEntries(url.searchParams);
    const pagination = paginationSchema.parse(params);
    const type = url.searchParams.get('type'); // low-stock, out-of-stock, or null

    const where: Record<string, unknown> = { deletedAt: null };
    if (type === 'low-stock') {
        where.stockQuantity = { gt: "0" };
        where.AND = [{ stockQuantity: { lte: prisma.item.fields?.lowStockThreshold } }];
    }
    if (type === 'out-of-stock') {
        where.stockQuantity = "0";
    }
    if (pagination.search) {
        where.OR = [
            { name: { contains: pagination.search } },
            { pluCode: { contains: pagination.search } },
        ];
    }

    const items = await prisma.item.findMany({
        where: { deletedAt: null, ...(type === 'out-of-stock' ? { stockQuantity: "0" } : {}), ...(pagination.search ? { OR: [{ name: { contains: pagination.search } }, { pluCode: { contains: pagination.search } }] } : {}) },
        include: { category: { select: { name: true } }, stockMovements: { orderBy: { createdAt: 'desc' }, take: 5 } },
        skip: (pagination.page - 1) * pagination.limit,
        take: pagination.limit,
        orderBy: { stockQuantity: 'asc' },
    });

    const total = await prisma.item.count({ where: { deletedAt: null, ...(type === 'out-of-stock' ? { stockQuantity: "0" } : {}) } });

    return Response.json({
        success: true,
        data: items.map((item: any) => ({
            id: item.id, plu_code: item.pluCode, name: item.name,
            category_name: item.category.name,
            stock_quantity: Number(item.stockQuantity), 
            total_quantity: Number(item.totalQuantity),
            unit: item.unit || 'pcs',
            sell_quantity: Number(item.sellQuantity), 
            return_quantity: Number(item.returnQuantity),
            damage_quantity: Number(item.damageQuantity), 
            lost_quantity: Number(item.lostQuantity),
            low_stock_threshold: Number(item.lowStockThreshold),
            is_low_stock: Number(item.stockQuantity) > 0 && Number(item.stockQuantity) <= Number(item.lowStockThreshold),
            is_out_of_stock: Number(item.stockQuantity) === 0,
            recent_movements: item.stockMovements.map((m: any) => ({
                type: m.movementType, quantity: Number(m.quantity), notes: m.notes, date: m.movementDate,
            })),
        })),
        pagination: { page: pagination.page, limit: pagination.limit, total, pages: Math.ceil(total / pagination.limit) },
    });
}, { requiredPermission: 'view:inventory' });
