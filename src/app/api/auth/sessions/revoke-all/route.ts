import { NextRequest } from 'next/server';
import { protectedRoute } from '@/lib/route-helper';
import { getClientIp, logSecurityEvent } from '@/lib/security';
import prisma from '@/lib/db';

// POST /api/auth/sessions/revoke-all — Revoke all sessions except current
// Admins can pass ?userId=xxx to revoke all sessions for a specific user
export const POST = protectedRoute(async (request: NextRequest, { user }) => {
    try {
        const isAdmin = user.role === 'admin';

        // Admin can revoke all sessions for a specific user via query param
        const url = new URL(request.url);
        const targetUserId = url.searchParams.get('userId');

        let revokeUserId = user.user_id;
        if (targetUserId && isAdmin) {
            revokeUserId = targetUserId;
        }

        // Build the where clause
        const whereClause: Record<string, unknown> = {
            userId: revokeUserId,
            isActive: true,
        };

        // Only exclude current session if revoking own sessions
        if (revokeUserId === user.user_id) {
            whereClause.NOT = { id: user.session_id || '' };
        }

        const result = await prisma.loginSession.updateMany({
            where: whereClause,
            data: {
                isActive: false,
                revokedAt: new Date(),
                revokeReason: isAdmin && revokeUserId !== user.user_id ? 'admin_revoked_all' : 'user_revoked_all',
            }
        });

        await logSecurityEvent({
            userId: user.user_id,
            eventType: 'ALL_SESSIONS_REVOKED',
            ipAddress: getClientIp(request),
            userAgent: request.headers.get('user-agent') || '',
            details: `${result.count} sessions revoked${isAdmin && revokeUserId !== user.user_id ? ` for user ${revokeUserId} (by admin)` : ''}`,
            severity: 'high',
        });

        return Response.json({
            success: true,
            message: `${result.count} session(s) revoked successfully`,
            data: { revoked_count: result.count },
        });
    } catch (error) {
        console.error('Revoke all sessions error:', error);
        return Response.json(
            { success: false, message: 'Failed to revoke sessions' },
            { status: 500 }
        );
    }
});
