import { NextRequest } from 'next/server';
import prisma from '@/lib/db';
import { verifyPassword, generateToken, generatePending2FAToken, setAuthCookie } from '@/lib/auth';
import { loginSchema, validateRequest, formatZodErrors } from '@/lib/validation';
import { publicRoute } from '@/lib/route-helper';
import { auditLog, getClientIp, checkRateLimit, rateLimitResponse, logSecurityEvent, generateCsrfToken } from '@/lib/security';
import { parseUserAgent, hashToken } from '@/lib/two-factor';
import { sendEmail } from '@/lib/email';
import { appendSystemLog } from '@/lib/log-manager';

// POST /api/auth/login
export const POST = publicRoute(async (request: NextRequest) => {
    const clientIp = getClientIp(request);

    // Strict rate limit for login
    const loginRateLimit = await checkRateLimit(clientIp, 'login');
    if (!loginRateLimit.allowed) {
        await logSecurityEvent({
            eventType: 'BRUTE_FORCE_DETECTED',
            ipAddress: clientIp,
            userAgent: request.headers.get('user-agent') || '',
            details: 'Login rate limit exceeded',
            severity: 'high',
        });
        return rateLimitResponse();
    }

    const body = await request.json();
    const validation = validateRequest(loginSchema, body);

    if (!validation.success) {
        return Response.json(
            { success: false, message: 'Validation failed', errors: formatZodErrors(validation.errors) },
            { status: 400 }
        );
    }

    const { username, password } = validation.data;

    // Find user
    const user = await prisma.user.findFirst({
        where: { username, deletedAt: null },
    });

    if (!user) {
        return Response.json(
            { success: false, message: 'Invalid username or password' },
            { status: 401 }
        );
    }

    // Check if account is locked (OWASP A07)
    if (user.lockedUntil && user.lockedUntil > new Date()) {
        await logSecurityEvent({
            userId: user.id,
            eventType: 'LOGIN_LOCKED',
            ipAddress: clientIp,
            userAgent: request.headers.get('user-agent') || '',
            details: 'Login attempt on locked account',
            severity: 'medium',
        });
        await appendSystemLog({
            level: 'warn',
            category: 'auth',
            action: 'LOGIN_LOCKED',
            message: `Login attempt on locked account: ${username}`,
            userId: user.id,
            ipAddress: clientIp,
        });
        return Response.json(
            { success: false, message: 'Account is locked due to multiple failed attempts. Please contact an administrator.' },
            { status: 423 }
        );
    }

    // Check if user is active
    if (!user.isActive) {
        return Response.json(
            { success: false, message: 'Account is deactivated. Please contact admin.' },
            { status: 403 }
        );
    }

    // Verify password
    const isValidPassword = await verifyPassword(password, user.password);
    if (!isValidPassword) {
        const failedAttempts = user.failedLoginAttempts + 1;
        const updateData: Record<string, unknown> = { failedLoginAttempts: failedAttempts };

        // Lock account after 5 failed attempts (OWASP A07 - Brute Force Protection)
        if (failedAttempts >= 5) {
            // Set lock for 100 years (permanent until admin unlock)
            updateData.lockedUntil = new Date(Date.now() + 100 * 365 * 24 * 60 * 60 * 1000);
            await logSecurityEvent({
                userId: user.id,
                eventType: 'ACCOUNT_LOCKED',
                ipAddress: clientIp,
                userAgent: request.headers.get('user-agent') || '',
                details: `Account permanently locked after ${failedAttempts} failed attempts. Requires admin intervention.`,
                severity: 'high',
            });
        }

        await prisma.user.update({ where: { id: user.id }, data: updateData });

        await logSecurityEvent({
            userId: user.id,
            eventType: 'LOGIN_FAILED',
            ipAddress: clientIp,
            userAgent: request.headers.get('user-agent') || '',
            details: `Failed attempt ${failedAttempts}`,
            severity: failedAttempts >= 3 ? 'medium' : 'low',
        });

        await appendSystemLog({
            level: failedAttempts >= 5 ? 'error' : 'warn',
            category: 'auth',
            action: failedAttempts >= 5 ? 'ACCOUNT_LOCKED' : 'LOGIN_FAILED',
            message: failedAttempts >= 5 ? `Account locked after ${failedAttempts} failed attempts` : `Failed login attempt for user ${username}`,
            userId: user.id,
            ipAddress: clientIp,
        });

        return Response.json(
            { success: false, message: 'Invalid username or password' },
            { status: 401 }
        );
    }

    // Reset failed attempts on successful password
    await prisma.user.update({
        where: { id: user.id },
        data: { failedLoginAttempts: 0, lockedUntil: null },
    });

    // Check if 2FA is enabled
    if (user.twoFactorEnabled && user.twoFactorSecret) {
        // Generate short-lived pending token
        const pendingToken = generatePending2FAToken({
            user_id: user.id,
            username: user.username,
            role: user.role,
            pending_2fa: true,
        });

        await auditLog({
            userId: user.id,
            action: 'LOGIN_PENDING_2FA',
            entity: 'auth',
            ipAddress: clientIp,
            userAgent: request.headers.get('user-agent') || undefined,
        });

        return Response.json({
            success: true,
            requires_2fa: true,
            data: {
                pending_token: pendingToken,
                user: {
                    username: user.username,
                },
            },
        });
    }

    // No 2FA — complete login
    const userAgent = request.headers.get('user-agent') || '';
    const deviceInfo = parseUserAgent(userAgent);

    // Create session in Prisma (PostgreSQL)
    let sessionId: string | undefined;
    try {
        // Check for new device login
        const existingSessions = await prisma.loginSession.findMany({
            where: {
                userId: user.id,
                isActive: true,
                browser: deviceInfo.browser,
                os: deviceInfo.os,
            }
        });

        const isNewDevice = existingSessions.length === 0;

        const session = await prisma.loginSession.create({
            data: {
                userId: user.id,
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

        // Send email alert for new device login
        if (isNewDevice && user.email) {
            sendEmail({
                to: user.email,
                subject: 'New Device Login Detected - INSOPHINIA POS',
                html: `
                    <div style="font-family: 'Inter', sans-serif; max-width: 600px; margin: 0 auto; background: #0f172a; border-radius: 16px; overflow: hidden;">
                        <div style="padding: 40px; text-align: center; background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);">
                            <h1 style="color: #f1f5f9; font-size: 24px; margin-bottom: 8px;">New Device Login</h1>
                            <p style="color: #94a3b8; font-size: 14px;">A new login was detected on your account</p>
                        </div>
                        <div style="padding: 32px;">
                            <div style="background: #1e293b; border-radius: 12px; padding: 24px; margin-bottom: 16px;">
                                <p style="color: #94a3b8; font-size: 12px; text-transform: uppercase; margin-bottom: 4px;">Device</p>
                                <p style="color: #f1f5f9; font-size: 16px; margin: 0;">${deviceInfo.browser} on ${deviceInfo.os} (${deviceInfo.device})</p>
                            </div>
                            <div style="background: #1e293b; border-radius: 12px; padding: 24px; margin-bottom: 16px;">
                                <p style="color: #94a3b8; font-size: 12px; text-transform: uppercase; margin-bottom: 4px;">IP Address</p>
                                <p style="color: #f1f5f9; font-size: 16px; margin: 0;">${clientIp}</p>
                            </div>
                            <div style="background: #1e293b; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
                                <p style="color: #94a3b8; font-size: 12px; text-transform: uppercase; margin-bottom: 4px;">Time</p>
                                <p style="color: #f1f5f9; font-size: 16px; margin: 0;">${new Date().toLocaleString()}</p>
                            </div>
                            <p style="color: #f87171; font-size: 14px; text-align: center;">If this wasn't you, please change your password immediately and enable 2FA.</p>
                        </div>
                    </div>
                `,
            }).catch(() => { }); // Fire and forget
        }

        if (isNewDevice) {
            await logSecurityEvent({
                userId: user.id,
                eventType: 'NEW_DEVICE_LOGIN',
                ipAddress: clientIp,
                userAgent,
                details: `${deviceInfo.browser} on ${deviceInfo.os}`,
                severity: 'medium',
            });
        }
    } catch (error) {
        console.error('Session creation error:', error);
    }

    // Generate JWT with session_id
    const token = generateToken({
        user_id: user.id,
        username: user.username,
        role: user.role,
        session_id: sessionId,
    });

    const mustChangePassword = user.mustChangePassword ||
        (user.passwordExpiresAt && user.passwordExpiresAt < new Date());

    await logSecurityEvent({
        userId: user.id,
        eventType: 'LOGIN_SUCCESS',
        ipAddress: clientIp,
        userAgent,
        severity: 'low',
    });

    await auditLog({
        userId: user.id,
        action: 'LOGIN_SUCCESS',
        entity: 'auth',
        ipAddress: clientIp,
        userAgent: userAgent || undefined,
    });

    await appendSystemLog({
        level: 'info',
        category: 'auth',
        action: 'LOGIN_SUCCESS',
        message: `User ${user.username} logged in successfully`,
        userId: user.id,
        ipAddress: clientIp,
        metadata: { browser: deviceInfo.browser, os: deviceInfo.os },
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
                two_factor_enabled: user.twoFactorEnabled,
            },
        },
    });

    const authCookie = setAuthCookie(token);
    const csrfToken = generateCsrfToken();
    const csrfCookie = `csrf_token=${csrfToken}; Path=/; Max-Age=${process.env.JWT_EXPIRATION || '3600'}; SameSite=Strict${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`;

    // Set multiple cookies via response headers
    response.headers.append('Set-Cookie', authCookie);
    response.headers.append('Set-Cookie', csrfCookie);

    return response;
});
