import { NextRequest } from 'next/server';
import prisma from '@/lib/db';
import { verifyPassword, hashPassword, validatePasswordStrength } from '@/lib/auth';
import { changePasswordSchema, validateRequest, formatZodErrors } from '@/lib/validation';
import { protectedRoute } from '@/lib/route-helper';
import { auditLog, getClientIp } from '@/lib/security';

// POST /api/auth/change-password
export const POST = protectedRoute(async (request: NextRequest, { user }) => {
    const body = await request.json();
    const validation = validateRequest(changePasswordSchema, body);

    if (!validation.success) {
        return Response.json(
            { success: false, message: 'Validation failed', errors: formatZodErrors(validation.errors) },
            { status: 400 }
        );
    }

    const { current_password, new_password } = validation.data;

    // Get user from DB
    const dbUser = await prisma.user.findUnique({ where: { id: user.user_id } });
    if (!dbUser) {
        return Response.json({ success: false, message: 'User not found' }, { status: 404 });
    }

    // Verify current password
    const isValid = await verifyPassword(current_password, dbUser.password);
    if (!isValid) {
        return Response.json({ success: false, message: 'Current password is incorrect' }, { status: 401 });
    }

    // Validate password strength (OWASP A07)
    const strengthErrors = validatePasswordStrength(new_password);
    if (strengthErrors.length > 0) {
        return Response.json(
            { success: false, message: 'Password does not meet requirements', errors: { password: strengthErrors } },
            { status: 400 }
        );
    }

    // Hash and update
    const hashedPassword = await hashPassword(new_password);

    // Fetch expiry from settings
    const expirySetting = await prisma.setting.findUnique({ where: { key: 'password_expiry_days' } });
    const expiryDays = expirySetting ? parseInt(expirySetting.value || '7', 10) : parseInt(process.env.PASSWORD_EXPIRY_DAYS || '7', 10);

    await prisma.user.update({
        where: { id: user.user_id },
        data: {
            password: hashedPassword,
            mustChangePassword: false,
            passwordChangedAt: new Date(),
            passwordExpiresAt: new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000),
        },
    });

    await auditLog({
        userId: user.user_id,
        action: 'PASSWORD_CHANGED',
        entity: 'auth',
        ipAddress: getClientIp(request),
    });

    return Response.json({ success: true, message: 'Password changed successfully' });
}, { auditAction: 'PASSWORD_CHANGE', auditEntity: 'auth' });
