import { NextRequest } from 'next/server';
import prisma from '@/lib/db';
import { stockMovementSchema, validateRequest, formatZodErrors } from '@/lib/validation';
import { protectedRoute } from '@/lib/route-helper';
import { appendSystemLog } from '@/lib/log-manager';

// POST /api/inventory/stock-in
export const POST = protectedRoute(async (request: NextRequest, { user }) => {
    const body = await request.json();
    const validation = validateRequest(stockMovementSchema, body);
    if (!validation.success) return Response.json({ success: false, message: 'Validation failed', errors: formatZodErrors(validation.errors) }, { status: 400 });

    const { item_id, quantity, notes } = validation.data;
    const item = await prisma.item.findFirst({ where: { id: item_id, deletedAt: null } });
    if (!item) return Response.json({ success: false, message: 'Item not found' }, { status: 404 });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await prisma.$transaction(async (tx: any) => {
        await tx.item.update({
            where: { id: item_id },
            data: { stockQuantity: { increment: quantity }, totalQuantity: { increment: quantity } },
        });
        await tx.stockMovement.create({
            data: {
                itemId: item_id, movementType: 'in', quantity,
                referenceType: 'manual', notes: notes || 'Stock in',
                movementDate: new Date(), createdBy: user.user_id,
            },
        });
    });

    await appendSystemLog({
        level: 'info',
        category: 'inventory',
        action: 'STOCK_IN',
        message: `Added ${quantity} units to item ${item.name}`,
        userId: user.user_id,
        metadata: { item_id, quantity, notes },
    });

    return Response.json({ success: true, message: 'Stock added successfully' });
}, { requiredPermission: 'manage:inventory', auditAction: 'STOCK_IN', auditEntity: 'inventory' });
