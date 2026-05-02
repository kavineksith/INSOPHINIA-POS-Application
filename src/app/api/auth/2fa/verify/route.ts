import { NextRequest } from 'next/server';
import crypto from 'crypto';
import prisma from '@/lib/db';
import { generateToken, setAuthCookie, validatePending2FAToken, getTokenFromRequest } from '@/lib/auth';
import { protectedRoute, publicRoute } from '@/lib/route-helper';
import { checkRateLimit, rateLimitResponse, getClientIp, logSecurityEvent, auditLog } from '@/lib/security';
import {
    verifyTOTPCode,
    decryptSecret,
    generateBackupCodes,
    hashBackupCodes,
    verifyBackupCode,
    parseUserAgent,
    hashToken,
} from '@/lib/two-factor';

// POST /api/auth/2fa/verify
// Used for: (1) enabling 2FA during setup, (2) verifying during login
export const POST = publicRoute(async (request: NextRequest) => {
    const clientIp = getClientIp(request);

    // Strict rate limit for 2FA verification
    const rateLimit = await checkRateLimit(clientIp, '2fa_verify');
    if (!rateLimit.allowed) {
        await logSecurityEvent({
            eventType: 'BRUTE_FORCE_DETECTED',
            ipAddress: clientIp,
            userAgent: request.headers.get('user-agent') || '',
            details: '2FA verification rate limit exceeded',
            severity: 'critical',
        });
        return rateLimitResponse();
    }

    const body = await request.json();
    const { code, pending_token, is_backup_code } = body;

    if (!code || typeof code !== 'string') {
        return Response.json({ success: false, message: 'Verification code is required' }, { status: 400 });
    }

    // Determine context: login flow (with pending_token) or setup flow (with auth token)
    let userId: string;
    let username: string;
    let role: string;
    let isLoginFlow = false;

    if (pending_token) {
        // Login flow: validate pending 2FA token
        const pending = validatePending2FAToken(pending_token);
        if (!pending) {
            return Response.json(
                { success: false, message: 'Invalid or expired verification session. Please login again.' },
                { status: 401 }
            );
        }
        userId = pending.user_id;
        username = pending.username;
        role = pending.role;
        isLoginFlow = true;
    } else {
        // Setup flow: use regular auth token
        const token = getTokenFromRequest(request);
        if (!token) {
            return Response.json({ success: false, message: 'Authentication required' }, { status: 401 });
        }

        const { validateToken } = await import('@/lib/auth');
        const payload = validateToken(token);
        if (!payload) {
            return Response.json({ success: false, message: 'Invalid or expired token' }, { status: 401 });
        }
        userId = payload.user_id;
        username = payload.username;
        role = payload.role;
    }

    // Get user from DB
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.twoFactorSecret) {
        return Response.json({ success: false, message: '2FA is not set up' }, { status: 400 });
    }

    // Decrypt the stored secret
    let decryptedSecret: string;
    try {
        decryptedSecret = decryptSecret(user.twoFactorSecret);
    } catch {
        return Response.json({ success: false, message: '2FA configuration error' }, { status: 500 });
    }

    let verified = false;
    let usedBackup = false;

    if (is_backup_code && user.twoFactorBackupCodes) {
        // Verify backup code
        const hashedCodes: string[] = JSON.parse(user.twoFactorBackupCodes);
        const result = await verifyBackupCode(code, hashedCodes);

        if (result.valid) {
            verified = true;
            usedBackup = true;
            // Update remaining backup codes
            await prisma.user.update({
                where: { id: userId },
                data: { twoFactorBackupCodes: JSON.stringify(result.remainingCodes) },
            });

            await logSecurityEvent({
                userId,
                eventType: 'TWO_FACTOR_BACKUP_USED',
                ipAddress: clientIp,
                userAgent: request.headers.get('user-agent') || '',
                details: `Backup code used. ${result.remainingCodes.length} remaining.`,
                severity: 'high',
            });
        }
    } else {
        // Verify TOTP code
        verified = verifyTOTPCode(code, decryptedSecret);
    }

    if (!verified) {
        await logSecurityEvent({
            userId,
            eventType: 'TWO_FACTOR_FAILED',
            ipAddress: clientIp,
            userAgent: request.headers.get('user-agent') || '',
            details: is_backup_code ? 'Invalid backup code' : 'Invalid TOTP code',
            severity: 'medium',
        });

        return Response.json(
            { success: false, message: 'Invalid verification code' },
            { status: 401 }
        );
    }

    await logSecurityEvent({
        userId,
        eventType: 'TWO_FACTOR_VERIFIED',
        ipAddress: clientIp,
        userAgent: request.headers.get('user-agent') || '',
        severity: 'low',
    });

    if (isLoginFlow) {
        // Complete login: create session + generate full token
        const userAgent = request.headers.get('user-agent') || '';
        const deviceInfo = parseUserAgent(userAgent);

        let sessionId: string | undefined;
        try {
            const session = await prisma.loginSession.create({
                data: {
                    userId,
                    sessionToken: hashToken(crypto.randomUUID()),
                    ipAddress: clientIp,
                    userAgent,
                    browser: deviceInfo.browser,
                    os: deviceInfo.os,
                    device: deviceInfo.device,
                    city: 'Unknown',
                    country: 'Unknown',
                    region: 'Unknown',
                    expiresAt: new Date(Date.now() + parseInt(process.env.JWT_EXPIRATION || '3600', 10) * 1000),
                    isActive: true,
                }
            });
            sessionId = session.id;
        } catch (error) {
            console.error('Session creation error:', error);
        }

        const token = generateToken({
            user_id: userId,
            username,
            role,
            session_id: sessionId,
        });

        const mustChangePassword = user.mustChangePassword ||
            (user.passwordExpiresAt && user.passwordExpiresAt < new Date());

        await auditLog({
            userId,
            action: 'LOGIN_SUCCESS_2FA',
            entity: 'auth',
            ipAddress: clientIp,
            userAgent: request.headers.get('user-agent') || undefined,
        });

        const response = Response.json({
            success: true,
            data: {
                token,
                user: {
                    id: user.id,
                    username: user.username,
                    email: user.email,
                    role: user.role,
                    first_name: user.firstName,
                    last_name: user.lastName,
                    must_change_password: mustChangePassword,
                    two_factor_enabled: true,
                },
            },
        });

        response.headers.set('Set-Cookie', setAuthCookie(token));
        return response;
    } else {
        // Setup flow: enable 2FA and generate backup codes
        if (!user.twoFactorEnabled) {
            const backupCodes = generateBackupCodes(8);
            const hashedBackupCodes = await hashBackupCodes(backupCodes);

            await prisma.user.update({
                where: { id: userId },
                data: {
                    twoFactorEnabled: true,
                    twoFactorBackupCodes: JSON.stringify(hashedBackupCodes),
                },
            });

            await logSecurityEvent({
                userId,
                eventType: 'TWO_FACTOR_ENABLED',
                ipAddress: clientIp,
                userAgent: request.headers.get('user-agent') || '',
                details: '2FA enabled successfully',
                severity: 'medium',
            });

            return Response.json({
                success: true,
                message: '2FA enabled successfully!',
                data: {
                    backup_codes: backupCodes,
                    warning: 'Save these backup codes in a secure place. They will not be shown again.',
                },
            });
        }

        return Response.json({ success: true, message: '2FA verification successful' });
    }
});
