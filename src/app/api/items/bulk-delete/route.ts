import { NextRequest } from 'next/server';
import prisma from '@/lib/db';
import { protectedRoute } from '@/lib/route-helper';
import { z } from 'zod';

// POST /api/items/bulk-delete
export const POST = protectedRoute(async (request: NextRequest) => {
    const body = await request.json();
    const schema = z.object({ ids: z.array(z.string().uuid()).min(1) });
    const result = schema.safeParse(body);
    if (!result.success) return Response.json({ success: false, message: 'Invalid item IDs' }, { status: 400 });

    await prisma.item.updateMany({
        where: { id: { in: result.data.ids }, deletedAt: null },
        data: { deletedAt: new Date(), isActive: false },
    });

    return Response.json({ success: true, message: `${result.data.ids.length} items deleted successfully` });
}, { requiredPermission: 'manage:items', auditAction: 'ITEM_BULK_DELETE', auditEntity: 'item' });
