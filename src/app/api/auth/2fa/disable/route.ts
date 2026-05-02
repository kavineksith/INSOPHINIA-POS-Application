import { NextRequest } from 'next/server';
import prisma from '@/lib/db';
import { verifyPassword } from '@/lib/auth';
import { protectedRoute } from '@/lib/route-helper';
import { getClientIp, logSecurityEvent } from '@/lib/security';

// POST /api/auth/2fa/disable — Disable 2FA (requires password)
export const POST = protectedRoute(async (request: NextRequest, { user }) => {
    const body = await request.json();
    const { password } = body;

    if (!password) {
        return Response.json({ success: false, message: 'Password is required to disable 2FA' }, { status: 400 });
    }

    // Verify current password
    const dbUser = await prisma.user.findUnique({ where: { id: user.user_id } });
    if (!dbUser) {
        return Response.json({ success: false, message: 'User not found' }, { status: 404 });
    }

    const isValid = await verifyPassword(password, dbUser.password);
    if (!isValid) {
        return Response.json({ success: false, message: 'Invalid password' }, { status: 401 });
    }

    // Disable 2FA
    await prisma.user.update({
        where: { id: user.user_id },
        data: {
            twoFactorSecret: null,
            twoFactorEnabled: false,
            twoFactorBackupCodes: null,
        },
    });

    await logSecurityEvent({
        userId: user.user_id,
        eventType: 'TWO_FACTOR_DISABLED',
        ipAddress: getClientIp(request),
        userAgent: request.headers.get('user-agent') || '',
        details: '2FA disabled by user',
        severity: 'high',
    });

    return Response.json({ success: true, message: '2FA has been disabled successfully' });
}, { auditAction: '2FA_DISABLE', auditEntity: 'auth' });
