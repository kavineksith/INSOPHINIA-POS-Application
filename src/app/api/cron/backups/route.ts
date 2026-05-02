import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { encryptAES256, gzipCompress, cleanupOldBackups, cleanupOldLogs, appendSystemLog } from '@/lib/log-manager';
import { uploadBackupToStorage } from '@/lib/supabase-storage';

export async function GET(request: NextRequest) {
    // Authenticate Vercel cron request
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}` && request.headers.get('x-vercel-cron') !== '1') {
        return new Response('Unauthorized', { status: 401 });
    }

    try {
        // Business data tables only (exclude SystemLog, SecurityEvent, AuditLog)
        const tables = ['users', 'categories', 'items', 'promotions', 'customers', 'bills', 'bill_items', 'stock_movements', 'settings'];
        const data: Record<string, any> = {};

        for (const table of tables) {
            // @ts-ignore - dynamic prisma table access
            data[table] = await (prisma as any)[table].findMany();
        }

        // Clean up old logs & backups
        const logCleanup = await cleanupOldLogs();
        await cleanupOldBackups().catch(console.error);

        const filename = `backup_auto_${new Date().toISOString().replace(/[:.]/g, '-')}.enc.gz`;
        const content = JSON.stringify(data, null, 2);
        
        // Pipeline: JSON → AES-256-GCM Encrypt → Gzip Compress
        const encrypted = encryptAES256(content);
        const compressed = await gzipCompress(encrypted);
        const buffer = Buffer.from(compressed);

        // Upload to Supabase Storage
        await uploadBackupToStorage(filename, buffer);

        // Find system user or use null
        const systemUser = await prisma.user.findUnique({ where: { username: 'admin' } });

        // Save metadata to DB
        const backup = await prisma.backup.create({
            data: {
                filename,
                filePath: filename,
                fileSize: BigInt(buffer.length),
                backupType: 'automatic',
                createdBy: systemUser?.id || undefined
            }
        });

        await appendSystemLog({
            level: 'info',
            category: 'backup',
            action: 'CREATE_BACKUP_AUTO',
            message: `Automated cron backup (AES-256-GCM + Gzip): ${filename}. Log cleanup: ${logCleanup.systemLogs} system logs, ${logCleanup.securityEvents} security events removed.`,
            userId: systemUser?.id || undefined,
            metadata: { size: buffer.length, logCleanup }
        });

        return NextResponse.json({ success: true, message: 'Automated backup completed', data: { ...backup, fileSize: Number(backup.fileSize) } });
    } catch (error: any) {
        console.error('Auto backup failed:', error);
        await appendSystemLog({
            level: 'error',
            category: 'backup',
            action: 'CREATE_BACKUP_AUTO_FAILED',
            message: `Failed to create automated backup: ${error.message}`,
            userId: undefined,
        });
        return NextResponse.json({ success: false, message: 'Backup failed', error: error.message }, { status: 500 });
    }
}
