import { NextRequest } from 'next/server';
import prisma from '@/lib/db';
import { updateCategorySchema, uuidSchema, validateRequest, formatZodErrors } from '@/lib/validation';
import { protectedRoute } from '@/lib/route-helper';

// GET /api/categories/[id]
export const GET = protectedRoute(async (request: NextRequest, { params }) => {
    const { id } = await params;
    if (!uuidSchema.safeParse(id).success) return Response.json({ success: false, message: 'Invalid ID' }, { status: 400 });
    const category = await prisma.category.findFirst({ where: { id, deletedAt: null } });
    if (!category) return Response.json({ success: false, message: 'Category not found' }, { status: 404 });
    return Response.json({ success: true, data: { id: category.id, name: category.name, description: category.description, is_active: category.isActive, created_at: category.createdAt } });
}, { requiredPermission: 'view:categories' });

// PUT /api/categories/[id]
export const PUT = protectedRoute(async (request: NextRequest, { params }) => {
    const { id } = await params;
    if (!uuidSchema.safeParse(id).success) return Response.json({ success: false, message: 'Invalid ID' }, { status: 400 });
    const body = await request.json();
    const validation = validateRequest(updateCategorySchema, body);
    if (!validation.success) return Response.json({ success: false, message: 'Validation failed', errors: formatZodErrors(validation.errors) }, { status: 400 });

    const existing = await prisma.category.findFirst({ where: { id, deletedAt: null } });
    if (!existing) return Response.json({ success: false, message: 'Category not found' }, { status: 404 });

    if (validation.data.name) {
        const dup = await prisma.category.findFirst({ where: { name: validation.data.name, deletedAt: null, NOT: { id } } });
        if (dup) return Response.json({ success: false, message: 'Category name already exists' }, { status: 409 });
    }

    try {
        const category = await prisma.category.update({ where: { id }, data: { name: validation.data.name, description: validation.data.description } });
        return Response.json({ success: true, data: { id: category.id, name: category.name, description: category.description }, message: 'Category updated successfully' });
    } catch (error: any) {
        if (error.code === 'P2002') {
            return Response.json({ success: false, message: 'Category name already exists' }, { status: 400 });
        }
        console.error('Category Update Error:', error);
        return Response.json({ success: false, message: 'Failed to update category' }, { status: 500 });
    }
}, { requiredPermission: 'manage:categories', auditAction: 'CATEGORY_UPDATE', auditEntity: 'category' });

// DELETE /api/categories/[id]
export const DELETE = protectedRoute(async (request: NextRequest, { params }) => {
    const { id } = await params;
    if (!uuidSchema.safeParse(id).success) return Response.json({ success: false, message: 'Invalid ID' }, { status: 400 });
    const existing = await prisma.category.findFirst({ where: { id, deletedAt: null } });
    if (!existing) return Response.json({ success: false, message: 'Category not found' }, { status: 404 });

    const itemCount = await prisma.item.count({ where: { categoryId: id, deletedAt: null } });
    if (itemCount > 0) return Response.json({ success: false, message: 'Cannot delete category with active items' }, { status: 400 });

    await prisma.category.update({ where: { id }, data: { deletedAt: new Date() } });
    return Response.json({ success: true, message: 'Category deleted successfully' });
}, { requiredPermission: 'manage:categories', auditAction: 'CATEGORY_DELETE', auditEntity: 'category' });
