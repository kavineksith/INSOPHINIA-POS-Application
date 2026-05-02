import { NextRequest } from 'next/server';
import prisma from '@/lib/db';
import { protectedRoute } from '@/lib/route-helper';
import { appendSystemLog } from '@/lib/log-manager';

// POST /api/system/lock — Lock the system (master_admin only)
export const POST = protectedRoute(async (request: NextRequest, { user }) => {
    const body = await request.json().catch(() => ({}));
    const reason = body.reason || 'Manual lockout by master administrator';

    const state = await (prisma as any).systemState.findFirst();
    if (!state) {
        await (prisma as any).systemState.create({
            data: {
                isLocked: true,
                lockReason: reason,
                lockedBy: user.user_id,
                lockedAt: new Date(),
            }
        });
    } else {
        await (prisma as any).systemState.update({
            where: { id: state.id },
            data: {
                isLocked: true,
                lockReason: reason,
                lockedBy: user.user_id,
                lockedAt: new Date(),
            }
        });
    }

    await appendSystemLog({
        level: 'critical',
        category: 'security',
        action: 'SYSTEM_LOCKED',
        message: `System locked by ${user.username}: ${reason}`,
        userId: user.user_id,
    });

    return Response.json({ success: true, message: 'System has been locked' });
}, { requiredPermission: 'manage:system_lock', skipLockCheck: true, auditAction: 'SYSTEM_LOCK', auditEntity: 'system' });

// DELETE /api/system/lock — Unlock the system (master_admin only)
export const DELETE = protectedRoute(async (request: NextRequest, { user }) => {
    const state = await (prisma as any).systemState.findFirst();
    if (!state) {
        return Response.json({ success: false, message: 'No system state found' }, { status: 404 });
    }

    await (prisma as any).systemState.update({
        where: { id: state.id },
        data: {
            isLocked: false,
            lockReason: null,
            lockedBy: null,
            lockedAt: null,
            lastCheckinAt: new Date(), // Reset deadman on unlock
        }
    });

    await appendSystemLog({
        level: 'critical',
        category: 'security',
        action: 'SYSTEM_UNLOCKED',
        message: `System unlocked by ${user.username}`,
        userId: user.user_id,
    });

    return Response.json({ success: true, message: 'System has been unlocked' });
}, { requiredPermission: 'manage:system_lock', skipLockCheck: true, auditAction: 'SYSTEM_UNLOCK', auditEntity: 'system' });
