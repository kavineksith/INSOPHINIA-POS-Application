import { NextRequest } from 'next/server';
import { protectedRoute } from '@/lib/route-helper';
import { clearAuthCookie, blacklistToken } from '@/lib/auth';
import { auditLog, getClientIp, logSecurityEvent } from '@/lib/security';
import prisma from '@/lib/db';
import { appendSystemLog } from '@/lib/log-manager';

// POST /api/auth/logout
export const POST = protectedRoute(async (request: NextRequest, { user, token }) => {
    const clientIp = getClientIp(request);

    // Blacklist the current token
    await blacklistToken(token, user.user_id, 'logout');

    // Revoke session in MongoDB
    if (user.session_id) {
        try {
            await prisma.loginSession.update({
                where: { id: user.session_id },
                data: { isActive: false, revokedAt: new Date(), revokeReason: 'logout' }
            });
        } catch (error) {
            console.error('Session revocation error:', error);
        }
    }

    await logSecurityEvent({
        userId: user.user_id,
        eventType: 'LOGOUT',
        ipAddress: clientIp,
        userAgent: request.headers.get('user-agent') || '',
        severity: 'low',
    });

    await auditLog({
        userId: user.user_id,
        action: 'LOGOUT',
        entity: 'auth',
        ipAddress: clientIp,
    });

    await appendSystemLog({
        level: 'info',
        category: 'auth',
        action: 'LOGOUT_SUCCESS',
        message: `User logged out successfully`,
        userId: user.user_id,
        ipAddress: clientIp,
    });

    const response = Response.json({ success: true, message: 'Logged out successfully' });
    response.headers.set('Set-Cookie', `${clearAuthCookie()}; csrf_token=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0`);
    return response;
});
