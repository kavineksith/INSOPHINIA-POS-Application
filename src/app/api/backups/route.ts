import { NextRequest } from 'next/server';
import prisma from '@/lib/db';
import { protectedRoute } from '@/lib/route-helper';
import { encryptAES256, gzipCompress, cleanupOldBackups, cleanupOldLogs, appendSystemLog } from '@/lib/log-manager';
import { uploadBackupToStorage } from '@/lib/supabase-storage';

// GET /api/backups
export const GET = protectedRoute(async (request: NextRequest) => {
    // Run 7-day cleanup on access
    await cleanupOldBackups().catch(console.error);

    const backups = await prisma.backup.findMany({
        orderBy: { createdAt: 'desc' },
        include: { creator: { select: { username: true } } }
    });

    return Response.json({
        success: true,
        data: backups.map(b => ({
            id: b.id,
            filename: b.filename,
            file_size: Number(b.fileSize),
            backup_type: b.backupType,
            username: b.creator?.username || 'System',
            created_at: b.createdAt,
            exists: true
        }))
    });
}, { requiredRole: 'admin' });

// POST /api/backups (Manual Trigger)
// Pipeline: JSON Dump → Exclude logs → AES-256-GCM Encrypt → Gzip Compress
export const POST = protectedRoute(async (request: NextRequest, { user }) => {
    try {
        // Business data tables only (exclude SystemLog, SecurityEvent, AuditLog)
        const tables = ['users', 'categories', 'items', 'promotions', 'customers', 'bills', 'bill_items', 'stock_movements', 'settings'];
        const data: Record<string, any> = {};

        for (const table of tables) {
            // @ts-ignore - dynamic prisma table access
            data[table] = await (prisma as any)[table].findMany();
        }

        // Clean up old logs (24h retention for system logs & security events)
        const logCleanup = await cleanupOldLogs();

        const filename = `backup_${new Date().toISOString().replace(/[:.]/g, '-')}.enc.gz`;
        const content = JSON.stringify(data, null, 2);
        
        // Pipeline: JSON → AES-256-GCM Encrypt → Gzip Compress
        const encrypted = encryptAES256(content);
        const compressed = await gzipCompress(encrypted);
        const buffer = Buffer.from(compressed);

        // Upload to Supabase Storage
        await uploadBackupToStorage(filename, buffer);

        // Save metadata to DB
        const backup = await prisma.backup.create({
            data: {
                filename,
                filePath: filename,
                fileSize: BigInt(buffer.length),
                backupType: 'manual',
                createdBy: user.user_id
            }
        });

        await appendSystemLog({
            level: 'info',
            category: 'backup',
            action: 'CREATE_BACKUP',
            message: `Manual backup (AES-256-GCM + Gzip): ${filename}. Log cleanup: ${logCleanup.systemLogs} system logs, ${logCleanup.securityEvents} security events removed.`,
            userId: user.user_id,
            metadata: { size: buffer.length, logCleanup }
        });

        return Response.json({ success: true, message: 'Backup created successfully', data: { ...backup, fileSize: Number(backup.fileSize) } });
    } catch (error: any) {
        await appendSystemLog({
            level: 'error',
            category: 'backup',
            action: 'CREATE_BACKUP_FAILED',
            message: `Failed to create backup: ${error.message}`,
            userId: user.user_id,
        });
        return Response.json({ success: false, message: 'Backup failed', error: error.message }, { status: 500 });
    }
}, { requiredRole: 'admin', auditAction: 'BACKUP_CREATE', auditEntity: 'backup' });
