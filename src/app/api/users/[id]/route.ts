import { NextRequest } from 'next/server';
import prisma from '@/lib/db';
import { hashPassword } from '@/lib/auth';
import { updateUserSchema, uuidSchema, validateRequest, formatZodErrors } from '@/lib/validation';
import { protectedRoute } from '@/lib/route-helper';

// GET /api/users/[id]
export const GET = protectedRoute(async (request: NextRequest, { params }) => {
    const { id } = await params;
    const idValidation = uuidSchema.safeParse(id);
    if (!idValidation.success) {
        return Response.json({ success: false, message: 'Invalid user ID' }, { status: 400 });
    }

    const user = await prisma.user.findFirst({
        where: { id, deletedAt: null },
        select: {
            id: true, username: true, email: true, role: true,
            firstName: true, lastName: true, isActive: true,
            mustChangePassword: true, createdAt: true, updatedAt: true,
        },
    });

    if (!user) {
        return Response.json({ success: false, message: 'User not found' }, { status: 404 });
    }

    return Response.json({
        success: true,
        data: {
            id: user.id, username: user.username, email: user.email, role: user.role,
            first_name: user.firstName, last_name: user.lastName, is_active: user.isActive,
            must_change_password: user.mustChangePassword,
            created_at: user.createdAt, updated_at: user.updatedAt,
        },
    });
}, { requiredPermission: 'view:users' });

// PUT /api/users/[id]
export const PUT = protectedRoute(async (request: NextRequest, { params }) => {
    const { id } = await params;
    const idValidation = uuidSchema.safeParse(id);
    if (!idValidation.success) {
        return Response.json({ success: false, message: 'Invalid user ID' }, { status: 400 });
    }

    const body = await request.json();
    const validation = validateRequest(updateUserSchema, body);
    if (!validation.success) {
        return Response.json(
            { success: false, message: 'Validation failed', errors: formatZodErrors(validation.errors) },
            { status: 400 }
        );
    }

    const existing = await prisma.user.findFirst({ where: { id, deletedAt: null } });
    if (!existing) {
        return Response.json({ success: false, message: 'User not found' }, { status: 404 });
    }

    const data = validation.data;
    const updateData: Record<string, unknown> = {};
    if (data.username !== undefined) updateData.username = data.username;
    if (data.email !== undefined) updateData.email = data.email;
    if (data.role !== undefined) updateData.role = data.role;
    if (data.first_name !== undefined) updateData.firstName = data.first_name;
    if (data.last_name !== undefined) updateData.lastName = data.last_name;
    if (data.is_active !== undefined) updateData.isActive = data.is_active;
    if (data.locked_until !== undefined) {
        updateData.lockedUntil = data.locked_until ? new Date(data.locked_until) : null;
        // If unlocking, also reset failed attempts
        if (data.locked_until === null) {
            updateData.failedLoginAttempts = 0;
        }
    }

    try {
        const user = await prisma.user.update({ where: { id }, data: updateData });

        return Response.json({
            success: true,
            data: {
                id: user.id, username: user.username, email: user.email, role: user.role,
                first_name: user.firstName, last_name: user.lastName, is_active: user.isActive,
            },
            message: 'User updated successfully',
        });
    } catch (error: any) {
        if (error.code === 'P2002') {
            const target = error.meta?.target || [];
            if (target.includes('username')) return Response.json({ success: false, message: 'Username already exists' }, { status: 400 });
            if (target.includes('email')) return Response.json({ success: false, message: 'Email already exists' }, { status: 400 });
        }
        console.error('User Update Error:', error);
        return Response.json({ success: false, message: 'Failed to update user' }, { status: 500 });
    }
}, { requiredPermission: 'manage:users', auditAction: 'USER_UPDATE', auditEntity: 'user' });

// DELETE /api/users/[id] (soft delete)
export const DELETE = protectedRoute(async (request: NextRequest, { params }) => {
    const { id } = await params;
    const idValidation = uuidSchema.safeParse(id);
    if (!idValidation.success) {
        return Response.json({ success: false, message: 'Invalid user ID' }, { status: 400 });
    }

    const user = await prisma.user.findFirst({ where: { id, deletedAt: null } });
    if (!user) {
        return Response.json({ success: false, message: 'User not found' }, { status: 404 });
    }

    await prisma.user.update({ where: { id }, data: { deletedAt: new Date(), isActive: false } });

    return Response.json({ success: true, message: 'User deleted successfully' });
}, { requiredPermission: 'manage:users', auditAction: 'USER_DELETE', auditEntity: 'user' });
