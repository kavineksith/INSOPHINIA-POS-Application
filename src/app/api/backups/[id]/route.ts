import { NextRequest } from 'next/server';
import prisma from '@/lib/db';
import { protectedRoute } from '@/lib/route-helper';
import { uuidSchema } from '@/lib/validation';
import { deleteBackupFromStorage } from '@/lib/supabase-storage';

// DELETE /api/backups/[id]
export const DELETE = protectedRoute(async (request: NextRequest, { params }) => {
    const { id } = await params;
    if (!uuidSchema.safeParse(id).success) return Response.json({ success: false, message: 'Invalid ID' }, { status: 400 });

    const backup = await prisma.backup.findUnique({ where: { id } });
    if (!backup) return Response.json({ success: false, message: 'Backup not found' }, { status: 404 });

    try {
        // Delete from Supabase Storage
        await deleteBackupFromStorage(backup.filename);
    } catch (e: any) {
        console.error('Failed to delete backup from storage:', e);
        // We still proceed to delete the record so it's not orphaned in DB
    }

    // Delete Prisma record
    await prisma.backup.delete({ where: { id } });

    return Response.json({ success: true, message: 'Backup deleted successfully' });
}, { requiredRole: 'admin', auditAction: 'BACKUP_DELETE', auditEntity: 'backup' });
