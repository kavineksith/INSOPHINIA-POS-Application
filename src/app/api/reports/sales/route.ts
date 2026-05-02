import { NextRequest } from 'next/server';
import prisma from '@/lib/db';
import { protectedRoute } from '@/lib/route-helper';

// GET /api/reports/sales
export const GET = protectedRoute(async (request: NextRequest) => {
    try {
        const url = new URL(request.url);
        const startDate = url.searchParams.get('start_date');
        const endDate = url.searchParams.get('end_date');
        const staffId = url.searchParams.get('staff_id');

        const page = parseInt(url.searchParams.get('page') || '1', 10);
        const limit = parseInt(url.searchParams.get('limit') || '10', 10);

        const where: Record<string, unknown> = { deletedAt: null, status: 'completed' };

        if (startDate || endDate) {
            const dateFilter: Record<string, unknown> = {};
            if (startDate) {
                const start = new Date(startDate);
                if (!isNaN(start.getTime())) dateFilter.gte = start;
            }
            if (endDate) {
                const end = new Date(endDate + 'T23:59:59.999Z');
                if (!isNaN(end.getTime())) dateFilter.lte = end;
            }
            if (Object.keys(dateFilter).length > 0) where.createdAt = dateFilter;
        }

        if (staffId && staffId !== 'all') where.staffId = staffId;

        const [bills, totalItems, aggregate] = await Promise.all([
            prisma.bill.findMany({
                where,
                select: {
                    id: true, billNumber: true, customerName: true, staffName: true,
                    subtotal: true, totalDiscount: true, totalAmount: true,
                    paidAmount: true, status: true, createdAt: true,
                },
                orderBy: { createdAt: 'desc' },
                skip: (page - 1) * limit,
                take: limit,
            }),
            prisma.bill.count({ where }),
            prisma.bill.aggregate({
                where,
                _sum: { totalAmount: true, totalDiscount: true, subtotal: true },
                _count: true,
                _avg: { totalAmount: true },
            }),
        ]);

        return Response.json({
            success: true,
            data: {
                bills: (bills || []).map((b: any) => ({
                    id: b.id, bill_number: b.billNumber, customer_name: b.customerName,
                    staff_name: b.staffName, subtotal: Number(b.subtotal || 0),
                    total_discount: Number(b.totalDiscount || 0), total_amount: Number(b.totalAmount || 0),
                    status: b.status, created_at: b.createdAt,
                })),
                summary: {
                    total_sales: Number(aggregate._sum?.totalAmount || 0),
                    total_discount: Number(aggregate._sum?.totalDiscount || 0),
                    total_subtotal: Number(aggregate._sum?.subtotal || 0),
                    total_bills: aggregate._count || 0,
                    average_bill: Number(aggregate._avg?.totalAmount || 0),
                },
                pagination: {
                    page,
                    limit,
                    total: totalItems,
                    pages: Math.ceil(totalItems / limit),
                }
            },
        });
    } catch (error) {
        console.error('Sales Report Error:', error);
        return Response.json({ success: false, message: 'Failed to generate report' }, { status: 500 });
    }
}, { requiredPermission: 'view:reports', auditAction: 'REPORT_GENERATE', auditEntity: 'report' });
