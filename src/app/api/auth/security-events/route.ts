import { NextRequest } from 'next/server';
import { protectedRoute } from '@/lib/route-helper';
import prisma from '@/lib/db';

// GET /api/auth/security-events — Get recent security events for the user
export const GET = protectedRoute(async (request: NextRequest, { user }) => {
    try {
        const url = new URL(request.url);
        const page = parseInt(url.searchParams.get('page') || '1', 10);
        const limit = Math.min(parseInt(url.searchParams.get('limit') || '10', 10), 100);

        const where = { userId: user.user_id };

        const [events, totalItems] = await Promise.all([
            (prisma as any).securityEvent.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                skip: (page - 1) * limit,
                take: limit,
            }),
            (prisma as any).securityEvent.count({ where }),
        ]);

        const formattedEvents = events.map((event: any) => ({
            id: event.id,
            event_type: event.eventType,
            ip_address: event.ipAddress,
            details: event.details,
            severity: event.severity,
            created_at: event.createdAt,
        }));

        return Response.json({
            success: true,
            data: formattedEvents,
            pagination: {
                page,
                limit,
                total: totalItems,
                pages: Math.ceil(totalItems / limit),
            }
        });
    } catch (error) {
        console.error('Security events error:', error);
        return Response.json({ success: false, message: 'Failed to fetch security events', data: [] }, { status: 500 });
    }
});

export const dynamic = 'force-dynamic';
