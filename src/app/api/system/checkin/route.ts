import { NextRequest } from 'next/server';
import prisma from '@/lib/db';
import { protectedRoute } from '@/lib/route-helper';
import { appendSystemLog } from '@/lib/log-manager';

// POST /api/system/checkin — Reset deadman timer (master_admin only)
export const POST = protectedRoute(async (request: NextRequest, { user }) => {
    const state = await (prisma as any).systemState.findFirst();
    if (!state) {
        await (prisma as any).systemState.create({
            data: {
                lastCheckinAt: new Date(),
            }
        });
    } else {
        await (prisma as any).systemState.update({
            where: { id: state.id },
            data: {
                lastCheckinAt: new Date(),
            }
        });
    }

    await appendSystemLog({
        level: 'info',
        category: 'security',
        action: 'DEADMAN_CHECKIN',
        message: `Deadman switch check-in by ${user.username}`,
        userId: user.user_id,
    });

    return Response.json({ success: true, message: 'Deadman timer reset successfully' });
}, { requiredPermission: 'manage:system_lock', skipLockCheck: true, auditAction: 'DEADMAN_CHECKIN', auditEntity: 'system' });
