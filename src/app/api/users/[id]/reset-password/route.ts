import { NextRequest } from 'next/server';
import crypto from 'crypto';
import prisma from '@/lib/db';
import { hashPassword } from '@/lib/auth';
import { uuidSchema } from '@/lib/validation';
import { protectedRoute } from '@/lib/route-helper';

// POST /api/users/[id]/reset-password
export const POST = protectedRoute(async (request: NextRequest, { params }) => {
    const { id } = await params;
    const idValidation = uuidSchema.safeParse(id);
    if (!idValidation.success) {
        return Response.json({ success: false, message: 'Invalid user ID' }, { status: 400 });
    }

    const user = await prisma.user.findFirst({ where: { id, deletedAt: null } });
    if (!user) {
        return Response.json({ success: false, message: 'User not found' }, { status: 404 });
    }

    const tempPassword = crypto.randomBytes(8).toString('hex').slice(0, 12);
    const hashedPassword = await hashPassword(tempPassword);

    await prisma.user.update({
        where: { id },
        data: {
            password: hashedPassword,
            mustChangePassword: true,
            failedLoginAttempts: 0,
            lockedUntil: null,
        },
    });

    return Response.json({
        success: true,
        message: 'Password reset successfully',
        data: { temp_password: tempPassword }
    });
}, { requiredPermission: 'manage:users', auditAction: 'PASSWORD_RESET', auditEntity: 'user' });
