import { NextRequest } from 'next/server';
import prisma from '@/lib/db';
import { protectedRoute } from '@/lib/route-helper';

// GET /api/logs?page=1&limit=50&level=&category=&from=&to=
export const GET = protectedRoute(async (request: NextRequest) => {
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 200);
    const level = url.searchParams.get('level') || undefined;
    const category = url.searchParams.get('category') || undefined;
    const from = url.searchParams.get('from');
    const to = url.searchParams.get('to');
    const search = url.searchParams.get('search') || undefined;

    const where: Record<string, unknown> = {};
    if (level) where.level = level;
    if (category) where.category = category;
    if (from || to) {
        where.createdAt = {
            ...(from ? { gte: new Date(from) } : {}),
            ...(to ? { lte: new Date(to) } : {}),
        };
    }
    if (search) {
        where.OR = [
            { action: { contains: search, mode: 'insensitive' } },
            { message: { contains: search, mode: 'insensitive' } },
        ];
    }

    const [total, logs] = await Promise.all([
        (prisma as any).systemLog.count({ where }),
        (prisma as any).systemLog.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            skip: (page - 1) * limit,
            take: limit,
        }),
    ]);

    return Response.json({
        success: true,
        data: logs.map((l: any) => ({
            id: l.id,
            level: l.level,
            category: l.category,
            action: l.action,
            message: l.message,
            metadata: l.metadata ? JSON.parse(l.metadata) : null,
            user_id: l.userId,
            ip_address: l.ipAddress,
            created_at: l.createdAt,
        })),
        pagination: {
            total,
            page,
            pages: Math.ceil(total / limit),
            limit,
        },
    });
}, { requiredRole: 'admin' });
