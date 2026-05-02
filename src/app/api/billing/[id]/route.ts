import { NextRequest } from 'next/server';
import prisma from '@/lib/db';
import { uuidSchema } from '@/lib/validation';
import { protectedRoute } from '@/lib/route-helper';

// GET /api/billing/[id]
export const GET = protectedRoute(async (request: NextRequest, { params }) => {
    const { id } = await params;
    if (!uuidSchema.safeParse(id).success) return Response.json({ success: false, message: 'Invalid ID' }, { status: 400 });

    const bill = await prisma.bill.findFirst({
        where: { id, deletedAt: null },
        include: { billItems: true },
    });
    if (!bill) return Response.json({ success: false, message: 'Bill not found' }, { status: 404 });

    return Response.json({
        success: true,
        data: {
            id: bill.id, bill_number: bill.billNumber,
            customer_id: bill.customerId, customer_name: bill.customerName,
            customer_email: bill.customerEmail, staff_id: bill.staffId, staff_name: bill.staffName,
            start_time: bill.startTime, end_time: bill.endTime,
            subtotal: Number(bill.subtotal), total_discount: Number(bill.totalDiscount),
            total_amount: Number(bill.totalAmount), paid_amount: Number(bill.paidAmount),
            balance: Number(bill.balance), status: bill.status,
            return_reason: bill.returnReason, remarks: bill.remarks,
            is_printed: bill.isPrinted, is_email_sent: bill.isEmailSent,
            earned_points: bill.earnedPoints,
            points_redeemed: (bill as any).pointsRedeemed,
            points_value: Number((bill as any).pointsValue),
            points_authorized_by: (bill as any).pointsAuthorizedBy,
            points_authorized_at: (bill as any).pointsAuthorizedAt,
            total_points_after: bill.totalPointsAfter,
            created_at: bill.createdAt,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            items: bill.billItems.map((bi: any) => ({
                id: bi.id, item_id: bi.itemId, plu_code: bi.pluCode,
                item_name: bi.itemName, quantity: Number(bi.quantity), unit: bi.unit || 'pcs',
                unit_price: Number(bi.unitPrice), actual_price: Number(bi.actualPrice),
                discount: Number(bi.discount), discount_percentage: Number(bi.discountPercentage),
                subtotal: Number(bi.subtotal),
            })),
        },
    });
}, { requiredPermission: 'view:billing' });
