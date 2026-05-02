import { NextRequest } from 'next/server';
import prisma from '@/lib/db';
import { cancelBillSchema, uuidSchema, validateRequest, formatZodErrors } from '@/lib/validation';
import { verifyPassword } from '@/lib/auth';
import { protectedRoute } from '@/lib/route-helper';

// POST /api/billing/[id]/cancel
export const POST = protectedRoute(async (request: NextRequest, { params, user: currentUser }) => {
    const { id } = await params;
    if (!uuidSchema.safeParse(id).success) return Response.json({ success: false, message: 'Invalid ID' }, { status: 400 });

    const body = await request.json();
    const validation = validateRequest(cancelBillSchema, body);
    if (!validation.success) return Response.json({ success: false, message: 'Validation failed', errors: formatZodErrors(validation.errors) }, { status: 400 });

    const { authorizer_username, authorizer_password, reason } = validation.data;

    // Find and verify authorizer
    const authorizer = await prisma.user.findFirst({
        where: { username: authorizer_username, isActive: true, deletedAt: null }
    });

    if (!authorizer) {
        return Response.json({ success: false, message: 'Authorizer not found or inactive' }, { status: 401 });
    }

    // Check if authorizer has permission
    const { hasPermission } = await import('@/lib/permissions');
    if (!hasPermission(authorizer.role, 'authorize:returns')) {
        return Response.json({ success: false, message: 'Authorizer does not have permission for this action' }, { status: 403 });
    }

    // Verify authorizer password
    const isPasswordValid = await verifyPassword(authorizer_password, authorizer.password);
    if (!isPasswordValid) {
        return Response.json({ success: false, message: 'Invalid authorizer password' }, { status: 401 });
    }

    const bill = await prisma.bill.findFirst({ where: { id, deletedAt: null }, include: { billItems: true } });
    if (!bill) return Response.json({ success: false, message: 'Bill not found' }, { status: 404 });
    if (bill.status === 'cancelled') return Response.json({ success: false, message: 'Bill is already cancelled' }, { status: 400 });

    const now = new Date();
    await prisma.$transaction(async (tx: any) => {
        await tx.bill.update({
            where: { id },
            data: {
                status: 'cancelled',
                returnReason: reason,
                returnAuthorizedBy: authorizer.id,
                returnAuthorizedAt: now
            },
        });

        if (bill.status === 'completed') {
            for (const bi of bill.billItems) {
                await tx.item.update({
                    where: { id: bi.itemId },
                    data: { stockQuantity: { increment: bi.quantity }, sellQuantity: { decrement: bi.quantity } },
                });
                await tx.stockMovement.create({
                    data: {
                        itemId: bi.itemId, movementType: 'return_item', quantity: bi.quantity,
                        referenceType: 'bill', referenceId: id,
                        notes: `Cancel: ${reason} (Auth: ${authorizer.username})`,
                        movementDate: now, createdBy: currentUser.user_id,
                    },
                });
            }
        }
    });

    return Response.json({ success: true, message: 'Bill cancelled successfully' });
}, { auditAction: 'BILL_CANCEL', auditEntity: 'bill' });
