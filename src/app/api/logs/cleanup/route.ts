import { NextRequest } from 'next/server';
import prisma from '@/lib/db';
import { protectedRoute } from '@/lib/route-helper';
import { appendSystemLog, cleanupOldLogs } from '@/lib/log-manager';

// POST /api/logs/cleanup — Manual trigger for 24h log cleanup
export const POST = protectedRoute(async (request: NextRequest, { user }) => {
    const result = await cleanupOldLogs();

    await appendSystemLog({
        level: 'info',
        category: 'system',
        action: 'LOG_CLEANUP',
        message: `Manual log cleanup: ${result.systemLogs} system logs, ${result.securityEvents} security events removed`,
        userId: user.user_id,
    });

    return Response.json({
        success: true,
        message: `Cleaned up ${result.systemLogs} system logs and ${result.securityEvents} security events (older than 24h)`,
        data: result,
    });
}, { requiredRole: 'admin', auditAction: 'LOG_CLEANUP', auditEntity: 'logs' });
