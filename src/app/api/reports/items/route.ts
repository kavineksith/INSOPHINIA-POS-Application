import { NextRequest } from 'next/server';
import prisma from '@/lib/db';
import { protectedRoute } from '@/lib/route-helper';

// GET /api/reports/items
export const GET = protectedRoute(async (request: NextRequest) => {
    try {
        const url = new URL(request.url);
        const startDate = url.searchParams.get('start_date');
        const endDate = url.searchParams.get('end_date');

        const where: any = {
            bill: {
                status: 'completed',
                deletedAt: null,
            }
        };

        if (startDate || endDate) {
            where.bill.createdAt = {};
            if (startDate) where.bill.createdAt.gte = new Date(startDate);
            if (endDate) where.bill.createdAt.lte = new Date(endDate + 'T23:59:59.999Z');
        }

        // 1. Top Selling Items
        const topItemsRaw = await prisma.billItem.groupBy({
            by: ['itemId', 'itemName', 'pluCode'],
            where,
            _sum: {
                quantity: true,
                subtotal: true,
            },
            orderBy: {
                _sum: {
                    quantity: 'desc',
                },
            },
            take: 10,
        });

        const topItems = topItemsRaw.map(item => ({
            id: item.itemId,
            name: item.itemName,
            plu_code: item.pluCode,
            quantity: item._sum.quantity || 0,
            revenue: Number(item._sum.subtotal || 0),
        }));

        // 2. Promotion Impact
        const promoImpactRaw = await prisma.billItem.aggregate({
            where: {
                ...where,
                discount: { gt: 0 },
            },
            _sum: {
                quantity: true,
                subtotal: true,
                discount: true,
            },
            _count: true,
        });

        const regularSalesRaw = await prisma.billItem.aggregate({
            where: {
                ...where,
                discount: 0,
            },
            _sum: {
                quantity: true,
                subtotal: true,
            },
            _count: true,
        });

        return Response.json({
            success: true,
            data: {
                top_items: topItems,
                impact: {
                    promoted_count: promoImpactRaw._count || 0,
                    promoted_quantity: promoImpactRaw._sum.quantity || 0,
                    promoted_revenue: Number(promoImpactRaw._sum.subtotal || 0),
                    total_discount_given: Number(promoImpactRaw._sum.discount || 0),
                    regular_count: regularSalesRaw._count || 0,
                    regular_quantity: regularSalesRaw._sum.quantity || 0,
                    regular_revenue: Number(regularSalesRaw._sum.subtotal || 0),
                }
            },
        });
    } catch (error) {
        console.error('Items Report Error:', error);
        return Response.json({ success: false, message: 'Failed to fetch items report' }, { status: 500 });
    }
}, { requiredPermission: 'view:reports', auditAction: 'REPORT_GENERATE', auditEntity: 'report' });
