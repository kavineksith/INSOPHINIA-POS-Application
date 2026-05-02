import { NextRequest } from 'next/server';
import prisma from '@/lib/db';
import { protectedRoute } from '@/lib/route-helper';

// GET /api/logs/export?from=2025-01-01&to=2025-01-31&level=error&category=auth&format=json
// Exports logs from the SystemLog DB table as a downloadable JSON file
export const GET = protectedRoute(async (request: NextRequest) => {
    const url = new URL(request.url);
    const from = url.searchParams.get('from');
    const to = url.searchParams.get('to');
    const level = url.searchParams.get('level');
    const category = url.searchParams.get('category');

    const where: Record<string, unknown> = {};
    if (from || to) {
        where.createdAt = {
            ...(from ? { gte: new Date(from) } : {}),
            ...(to ? { lte: new Date(to) } : {}),
        };
    }
    if (level) where.level = level;
    if (category) where.category = category;

    try {
        const logs = await (prisma as any).systemLog.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            take: 10000, // Cap at 10k rows for safety
        });

        const exportData = logs.map((l: any) => ({
            id: l.id,
            level: l.level,
            category: l.category,
            action: l.action,
            message: l.message,
            metadata: l.metadata ? JSON.parse(l.metadata) : null,
            user_id: l.userId,
            ip_address: l.ipAddress,
            created_at: l.createdAt,
        }));

        const content = JSON.stringify(exportData, null, 2);
        const now = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
        const filename = `system-logs-${now}.json`;

        return new Response(content, {
            headers: {
                'Content-Type': 'application/json; charset=utf-8',
                'Content-Disposition': `attachment; filename="${filename}"`,
            },
        });
    } catch (error: any) {
        return Response.json({ success: false, message: error.message }, { status: 500 });
    }
}, { requiredRole: 'admin' });
