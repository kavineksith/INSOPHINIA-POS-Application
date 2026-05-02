import { NextRequest } from 'next/server';
import { protectedRoute } from '@/lib/route-helper';
import prisma from '@/lib/db';

// GET /api/auth/sessions — List active sessions
// Admins can pass ?userId=xxx to view any user's sessions
export const GET = protectedRoute(async (request: NextRequest, { user }) => {
    try {
        const url = new URL(request.url);
        const page = parseInt(url.searchParams.get('page') || '1', 10);
        const limit = parseInt(url.searchParams.get('limit') || '5', 10);

        const isAdmin = user.role === 'admin';
        const targetUserId = url.searchParams.get('userId');

        // Admin can view any user's sessions; others can only view their own
        const viewUserId = (targetUserId && isAdmin) ? targetUserId : user.user_id;

        const where = {
            userId: viewUserId,
            isActive: true,
        };

        const [sessions, totalItems] = await Promise.all([
            (prisma as any).loginSession.findMany({
                where,
                orderBy: { lastActivityAt: 'desc' },
                skip: (page - 1) * limit,
                take: limit,
                include: {
                    user: {
                        select: { username: true, firstName: true, lastName: true }
                    }
                }
            }),
            (prisma as any).loginSession.count({ where }),
        ]);

        const formattedSessions = sessions.map((session: any) => ({
            id: session.id,
            ip_address: session.ipAddress,
            device: { browser: session.browser, os: session.os, device: session.device },
            location: { city: session.city, country: session.country, region: session.region },
            created_at: session.createdAt,
            last_activity: session.lastActivityAt,
            is_current: session.id === user.session_id,
            user: session.user ? {
                username: session.user.username,
                first_name: session.user.firstName,
                last_name: session.user.lastName,
            } : undefined,
        }));

        return Response.json({
            success: true,
            data: formattedSessions,
            pagination: {
                page,
                limit,
                total: totalItems,
                pages: Math.ceil(totalItems / limit),
            }
        });
    } catch (error) {
        console.error('Session listing error:', error);
        return Response.json(
            { success: false, message: 'Failed to retrieve sessions' },
            { status: 500 }
        );
    }
});

// GET /api/auth/sessions?type=events — Get security events for dashboard
export const dynamic = 'force-dynamic';
