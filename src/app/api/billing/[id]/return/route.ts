import { NextRequest } from 'next/server';
import prisma from '@/lib/db';
import { returnBillSchema, uuidSchema, validateRequest, formatZodErrors } from '@/lib/validation';
import { verifyPassword } from '@/lib/auth';
import { protectedRoute } from '@/lib/route-helper';

// POST /api/billing/[id]/return
export const POST = protectedRoute(async (request: NextRequest, { params, user: currentUser }) => {
    const { id } = await params;
    if (!uuidSchema.safeParse(id).success) return Response.json({ success: false, message: 'Invalid ID' }, { status: 400 });

    const body = await request.json();
    const validation = validateRequest(returnBillSchema, body);
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
    if (bill.status !== 'completed') return Response.json({ success: false, message: 'Only completed bills can be returned' }, { status: 400 });

    const now = new Date();
    await prisma.$transaction(async (tx: any) => {
        await tx.bill.update({
            where: { id },
            data: {
                status: 'returned',
                returnReason: reason,
                returnAuthorizedBy: authorizer.id,
                returnAuthorizedAt: now,
            },
        });

        // Restore stock
        for (const bi of bill.billItems) {
            await tx.item.update({
                where: { id: bi.itemId },
                data: { stockQuantity: { increment: bi.quantity }, returnQuantity: { increment: bi.quantity } },
            });
            await tx.stockMovement.create({
                data: {
                    itemId: bi.itemId, movementType: 'return_item', quantity: bi.quantity,
                    referenceType: 'bill', referenceId: id,
                    notes: `Return: ${reason} (Auth: ${authorizer.username})`,
                    movementDate: now,
                    createdBy: currentUser.user_id,
                },
            });
        }
    });

    return Response.json({ success: true, message: 'Bill returned successfully' });
}, { auditAction: 'BILL_RETURN', auditEntity: 'bill' });
