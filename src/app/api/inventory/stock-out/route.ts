import { NextRequest } from 'next/server';
import prisma from '@/lib/db';
import { stockMovementSchema, validateRequest, formatZodErrors } from '@/lib/validation';
import { protectedRoute } from '@/lib/route-helper';

// POST /api/inventory/stock-out
export const POST = protectedRoute(async (request: NextRequest, { user }) => {
    const body = await request.json();
    const validation = validateRequest(stockMovementSchema, body);
    if (!validation.success) return Response.json({ success: false, message: 'Validation failed', errors: formatZodErrors(validation.errors) }, { status: 400 });

    const { item_id, quantity, notes } = validation.data;
    const item = await prisma.item.findFirst({ where: { id: item_id, deletedAt: null } });
    if (!item) return Response.json({ success: false, message: 'Item not found' }, { status: 404 });
    if (Number(item.stockQuantity) < quantity) return Response.json({ success: false, message: 'Insufficient stock' }, { status: 400 });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await prisma.$transaction(async (tx: any) => {
        await tx.item.update({ where: { id: item_id }, data: { stockQuantity: { decrement: quantity } } });
        await tx.stockMovement.create({
            data: {
                itemId: item_id, movementType: 'out', quantity,
                referenceType: 'manual', notes: notes || 'Stock out',
                movementDate: new Date(), createdBy: user.user_id,
            },
        });
    });

    return Response.json({ success: true, message: 'Stock removed successfully' });
}, { requiredPermission: 'manage:inventory', auditAction: 'STOCK_OUT', auditEntity: 'inventory' });
