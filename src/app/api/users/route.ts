import { NextRequest } from 'next/server';
import prisma from '@/lib/db';
import { hashPassword, validatePasswordStrength } from '@/lib/auth';
import { createUserSchema, updateUserSchema, validateRequest, formatZodErrors, paginationSchema } from '@/lib/validation';
import { protectedRoute } from '@/lib/route-helper';
import { appendSystemLog } from '@/lib/log-manager';

// GET /api/users - List all users
export const GET = protectedRoute(async (request: NextRequest) => {
    const url = new URL(request.url);
    const params = Object.fromEntries(url.searchParams);
    const pagination = paginationSchema.parse(params);

    const where = {
        deletedAt: null,
        ...(pagination.search ? {
            OR: [
                { username: { contains: pagination.search } },
                { firstName: { contains: pagination.search } },
                { lastName: { contains: pagination.search } },
                { email: { contains: pagination.search } },
            ],
        } : {}),
    };

    const [users, total] = await Promise.all([
        prisma.user.findMany({
            where,
            select: {
                id: true, username: true, email: true, role: true,
                firstName: true, lastName: true, isActive: true,
                lockedUntil: true,
                mustChangePassword: true, createdAt: true, updatedAt: true,
            },
            skip: (pagination.page - 1) * pagination.limit,
            take: pagination.limit,
            orderBy: { [pagination.sortBy || 'createdAt']: pagination.sortOrder },
        }),
        prisma.user.count({ where }),
    ]);

    return Response.json({
        success: true,
        data: users.map((u: { id: any; username: any; email: any; role: any; firstName: any; lastName: any; isActive: any; lockedUntil: any; mustChangePassword: any; createdAt: any; updatedAt: any; }) => ({
            id: u.id, username: u.username, email: u.email, role: u.role,
            first_name: u.firstName, last_name: u.lastName, is_active: u.isActive,
            locked_until: u.lockedUntil,
            must_change_password: u.mustChangePassword,
            created_at: u.createdAt, updated_at: u.updatedAt,
        })),
        pagination: { page: pagination.page, limit: pagination.limit, total, pages: Math.ceil(total / pagination.limit) },
    });
}, { requiredPermission: 'view:users' });

// POST /api/users - Create user
export const POST = protectedRoute(async (request: NextRequest) => {
    const body = await request.json();
    const validation = validateRequest(createUserSchema, body);

    if (!validation.success) {
        return Response.json(
            { success: false, message: 'Validation failed', errors: formatZodErrors(validation.errors) },
            { status: 400 }
        );
    }

    const data = validation.data;

    // Check password strength (OWASP A07)
    const passwordErrors = validatePasswordStrength(data.password);
    if (passwordErrors.length > 0) {
        return Response.json(
            { success: false, message: 'Password does not meet requirements', errors: { password: passwordErrors } },
            { status: 400 }
        );
    }

    // Check for duplicate username/email
    const existing = await prisma.user.findFirst({
        where: {
            OR: [{ username: data.username }, { email: data.email }],
            deletedAt: null,
        },
    });

    if (existing) {
        const field = existing.username === data.username ? 'username' : 'email';
        return Response.json(
            { success: false, message: `A user with this ${field} already exists` },
            { status: 409 }
        );
    }

    const hashedPassword = await hashPassword(data.password);
    const expiryDays = parseInt(process.env.PASSWORD_EXPIRY_DAYS || '7', 10);

    const user = await prisma.user.create({
        data: {
            username: data.username,
            email: data.email,
            password: hashedPassword,
            role: data.role,
            firstName: data.first_name,
            lastName: data.last_name,
            mustChangePassword: true,
            passwordExpiresAt: new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000),
        },
    });

    await appendSystemLog({
        level: 'info',
        category: 'users',
        action: 'USER_CREATE',
        message: `Created new user: ${user.username}`,
        metadata: { role: user.role, email: user.email },
    });

    return Response.json({
        success: true,
        data: {
            id: user.id, username: user.username, email: user.email, role: user.role,
            first_name: user.firstName, last_name: user.lastName,
        },
        message: 'User created successfully',
    }, { status: 201 });
}, { requiredPermission: 'manage:users', auditAction: 'USER_CREATE', auditEntity: 'user' });
