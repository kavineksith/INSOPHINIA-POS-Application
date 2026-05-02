import { NextRequest } from 'next/server';
import prisma from '@/lib/db';
import { protectedRoute } from '@/lib/route-helper';
import { appendSystemLog } from '@/lib/log-manager';

// POST /api/logs/aggregate — log maintenance endpoint
export const POST = protectedRoute(async (request: NextRequest, { user }) => {
    try {
        await appendSystemLog({
            level: 'info',
            category: 'system',
            action: 'LOG_MAINTENANCE',
            message: 'System log maintenance triggered.',
            userId: user.user_id,
        });

        return Response.json({
            success: true,
            message: 'System maintenance completed.',
        });
    } catch (error: any) {
        return Response.json({ success: false, message: error.message }, { status: 500 });
    }
}, { requiredRole: 'admin', auditAction: 'LOG_MAINTENANCE', auditEntity: 'logs' });

// GET /api/logs/aggregate — DB-based log summary (counts by level & category)
export const GET = protectedRoute(async (request: NextRequest) => {
    try {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        // Get counts by level
        const levelCounts = await (prisma as any).systemLog.groupBy({
            by: ['level'],
            _count: { id: true },
            where: { createdAt: { gte: thirtyDaysAgo } },
        });

        // Get counts by category
        const categoryCounts = await (prisma as any).systemLog.groupBy({
            by: ['category'],
            _count: { id: true },
            where: { createdAt: { gte: thirtyDaysAgo } },
        });

        // Total count
        const totalCount = await (prisma as any).systemLog.count({
            where: { createdAt: { gte: thirtyDaysAgo } },
        });

        return Response.json({
            success: true,
            data: {
                total: totalCount,
                period: 'last_30_days',
                by_level: levelCounts.map((l: any) => ({ level: l.level, count: l._count.id })),
                by_category: categoryCounts.map((c: any) => ({ category: c.category, count: c._count.id })),
            },
        });
    } catch (error: any) {
        return Response.json({ success: false, message: error.message }, { status: 500 });
    }
}, { requiredRole: 'admin' });
