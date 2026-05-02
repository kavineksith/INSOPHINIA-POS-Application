import { NextRequest } from 'next/server';
import prisma from '@/lib/db';
import { protectedRoute } from '@/lib/route-helper';
import { uuidSchema } from '@/lib/validation';
import { downloadBackupFromStorage } from '@/lib/supabase-storage';

// GET /api/backups/[id]/download
export const GET = protectedRoute(async (request: NextRequest, { params }) => {
    const { id } = await params;
    if (!uuidSchema.safeParse(id).success) {
        return new Response('Invalid ID', { status: 400 });
    }

    const backup = await prisma.backup.findUnique({ where: { id } });
    if (!backup) {
        return new Response('Backup not found', { status: 404 });
    }

    try {
        const blob = await downloadBackupFromStorage(backup.filename);
        const arrayBuffer = await blob.arrayBuffer();
        
        return new Response(arrayBuffer, {
            headers: {
                'Content-Type': 'application/octet-stream',
                'Content-Disposition': `attachment; filename="${backup.filename}"`,
                'Content-Length': arrayBuffer.byteLength.toString(),
            },
        });
    } catch (error: any) {
        console.error('Backup download error:', error);
        return new Response('Failed to download backup', { status: 500 });
    }
}, { requiredRole: 'admin' });
