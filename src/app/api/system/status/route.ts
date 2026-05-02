import { NextRequest } from 'next/server';
import prisma from '@/lib/db';
import { protectedRoute } from '@/lib/route-helper';

// GET /api/system/status — Get system lock state + deadman timer
export const GET = protectedRoute(async (request: NextRequest) => {
    const state = await (prisma as any).systemState.findFirst();

    if (!state) {
        return Response.json({
            success: true,
            data: {
                isLocked: false,
                lockReason: null,
                lockedAt: null,
                lastCheckinAt: null,
                deadmanDays: 72,
                daysSinceCheckin: 0,
                daysRemaining: 72,
            }
        });
    }

    const daysSinceCheckin = Math.floor(
        (Date.now() - new Date(state.lastCheckinAt).getTime()) / (1000 * 60 * 60 * 24)
    );

    return Response.json({
        success: true,
        data: {
            isLocked: state.isLocked,
            lockReason: state.lockReason,
            lockedAt: state.lockedAt,
            lastCheckinAt: state.lastCheckinAt,
            deadmanDays: state.deadmanDays,
            daysSinceCheckin,
            daysRemaining: Math.max(0, state.deadmanDays - daysSinceCheckin),
        }
    });
}, { requiredPermission: 'manage:settings', skipLockCheck: true });
