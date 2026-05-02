import { NextRequest } from 'next/server';
import prisma from '@/lib/db';
import { protectedRoute } from '@/lib/route-helper';
import { generateTOTPSecret, generateQRCodeDataURL, encryptSecret } from '@/lib/two-factor';
import { getClientIp, logSecurityEvent } from '@/lib/security';

// POST /api/auth/2fa/setup — Generate TOTP secret and QR code
export const POST = protectedRoute(async (request: NextRequest, { user }) => {
    // Check if 2FA is already enabled
    const dbUser = await prisma.user.findUnique({ where: { id: user.user_id } });
    if (!dbUser) {
        return Response.json({ success: false, message: 'User not found' }, { status: 404 });
    }

    if (dbUser.twoFactorEnabled) {
        return Response.json(
            { success: false, message: '2FA is already enabled. Disable it first to set up again.' },
            { status: 400 }
        );
    }

    // Generate new TOTP secret
    const secret = generateTOTPSecret();
    const qrCodeDataUrl = await generateQRCodeDataURL(secret, user.username);

    // Store encrypted secret (not yet enabled until verified)
    const encryptedSecret = encryptSecret(secret);
    await prisma.user.update({
        where: { id: user.user_id },
        data: {
            twoFactorSecret: encryptedSecret,
            twoFactorEnabled: false,
        },
    });

    await logSecurityEvent({
        userId: user.user_id,
        eventType: 'TWO_FACTOR_ENABLED',
        ipAddress: getClientIp(request),
        userAgent: request.headers.get('user-agent') || '',
        details: '2FA setup initiated (pending verification)',
        severity: 'medium',
    });

    return Response.json({
        success: true,
        data: {
            secret, // Show to user for manual entry
            qr_code: qrCodeDataUrl,
            message: 'Scan the QR code with your authenticator app, then verify with a code.',
        },
    });
}, { auditAction: '2FA_SETUP', auditEntity: 'auth' });
