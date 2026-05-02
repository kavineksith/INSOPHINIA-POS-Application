import { NextRequest } from 'next/server';
import prisma from '@/lib/db';
import { createCategorySchema, validateRequest, formatZodErrors, paginationSchema } from '@/lib/validation';
import { protectedRoute } from '@/lib/route-helper';

// GET /api/categories
export const GET = protectedRoute(async (request: NextRequest) => {
    const url = new URL(request.url);
    const params = Object.fromEntries(url.searchParams);
    const pagination = paginationSchema.parse(params);

    const where = {
        deletedAt: null,
        ...(pagination.search ? { name: { contains: pagination.search } } : {}),
    };

    const [categories, total] = await Promise.all([
        prisma.category.findMany({
            where,
            skip: (pagination.page - 1) * pagination.limit,
            take: pagination.limit,
            orderBy: { [pagination.sortBy || 'name']: pagination.sortOrder === 'desc' ? 'desc' : 'asc' },
            include: { _count: { select: { items: { where: { deletedAt: null } } } } },
        }),
        prisma.category.count({ where }),
    ]);

    return Response.json({
        success: true,
        data: categories.map(c => ({
            id: c.id, name: c.name, description: c.description,
            is_active: c.isActive, item_count: c._count.items,
            created_at: c.createdAt, updated_at: c.updatedAt,
        })),
        pagination: { page: pagination.page, limit: pagination.limit, total, pages: Math.ceil(total / pagination.limit) },
    });
}, { requiredPermission: 'view:categories' });

// POST /api/categories
export const POST = protectedRoute(async (request: NextRequest) => {
    const body = await request.json();
    const validation = validateRequest(createCategorySchema, body);
    if (!validation.success) {
        return Response.json({ success: false, message: 'Validation failed', errors: formatZodErrors(validation.errors) }, { status: 400 });
    }

    const existing = await prisma.category.findFirst({ where: { name: validation.data.name, deletedAt: null } });
    if (existing) {
        return Response.json({ success: false, message: 'Category already exists' }, { status: 409 });
    }

    const category = await prisma.category.create({ data: { name: validation.data.name, description: validation.data.description } });

    return Response.json({
        success: true,
        data: { id: category.id, name: category.name, description: category.description },
        message: 'Category created successfully',
    }, { status: 201 });
}, { requiredPermission: 'manage:categories', auditAction: 'CATEGORY_CREATE', auditEntity: 'category' });
