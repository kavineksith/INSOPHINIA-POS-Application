import { NextRequest } from 'next/server';
import { protectedRoute } from '@/lib/route-helper';
import { getClientIp, logSecurityEvent } from '@/lib/security';
import prisma from '@/lib/db';

// POST /api/auth/sessions/[id]/revoke — Revoke a specific session
// Admins can revoke any user's session; non-admins can only revoke their own
export const POST = protectedRoute(async (request: NextRequest, { user, params }) => {
    const resolvedParams = await params;
    const sessionId = resolvedParams.id;

    if (!sessionId) {
        return Response.json({ success: false, message: 'Session ID is required' }, { status: 400 });
    }

    try {
        const isAdmin = user.role === 'admin';

        // Admins can revoke any session; non-admins can only revoke their own
        const whereClause: Record<string, unknown> = {
            id: sessionId,
            isActive: true,
        };
        if (!isAdmin) {
            whereClause.userId = user.user_id;
        }

        const session = await prisma.loginSession.findFirst({ where: whereClause });

        if (!session) {
            return Response.json(
                { success: false, message: 'Session not found or already revoked' },
                { status: 404 }
            );
        }

        // Prevent revoking your own current session (use logout for that)
        if (sessionId === user.session_id) {
            return Response.json(
                { success: false, message: 'Cannot revoke current session. Use logout instead.' },
                { status: 400 }
            );
        }

        // Revoke the session
        await prisma.loginSession.update({
            where: { id: sessionId },
            data: {
                isActive: false,
                revokedAt: new Date(),
                revokeReason: isAdmin && session.userId !== user.user_id ? 'admin_revoked' : 'user_revoked'
            }
        });

        await logSecurityEvent({
            userId: user.user_id,
            eventType: 'SESSION_REVOKED',
            ipAddress: getClientIp(request),
            userAgent: request.headers.get('user-agent') || '',
            details: `Session ${sessionId} revoked${isAdmin && session.userId !== user.user_id ? ' (by admin)' : ''} (IP: ${session.ipAddress}, Device: ${session.browser} on ${session.os})`,
            severity: 'medium',
        });

        return Response.json({ success: true, message: 'Session revoked successfully' });
    } catch (error) {
        console.error('Session revocation error:', error);
        return Response.json(
            { success: false, message: 'Failed to revoke session' },
            { status: 500 }
        );
    }
});
