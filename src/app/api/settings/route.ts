import { NextRequest } from 'next/server';
import prisma from '@/lib/db';
import { updateSettingsSchema, validateRequest, formatZodErrors } from '@/lib/validation';
import { protectedRoute } from '@/lib/route-helper';

// GET /api/settings
export const GET = protectedRoute(async (request: NextRequest) => {
    const settings = await prisma.setting.findMany({ orderBy: { key: 'asc' } });
    const settingsObj: Record<string, unknown> = {};
    for (const s of settings) {
        settingsObj[s.key] = s.type === 'integer' ? parseInt(s.value || '0') : s.type === 'boolean' ? s.value === '1' || s.value === 'true' : s.type === 'json' ? JSON.parse(s.value || '{}') : s.value;
    }

    // Merge in .env defaults for email settings if they don't exist in DB
    const emailKeys = ['email_enabled', 'email_host', 'email_port', 'email_username', 'email_password', 'email_from'];
    emailKeys.forEach(key => {
        if (settingsObj[key] === undefined || settingsObj[key] === '') {
            const envKey = key.toUpperCase();
            const envVal = process.env[envKey];
            if (envVal !== undefined) {
                settingsObj[key] = key.includes('enabled') ? (envVal === 'true' || envVal === '1') : envVal;
            }
        }
    });

    return Response.json({ success: true, data: settingsObj });
}, { requiredPermission: 'view:settings' });

// PUT /api/settings
export const PUT = protectedRoute(async (request: NextRequest) => {
    const body = await request.json();
    const validation = validateRequest(updateSettingsSchema, body);
    if (!validation.success) return Response.json({ success: false, message: 'Validation failed', errors: formatZodErrors(validation.errors) }, { status: 400 });

    for (const [key, value] of Object.entries(validation.data)) {
        const type = typeof value === 'number' ? 'integer' : typeof value === 'boolean' ? 'boolean' : 'string';
        await prisma.setting.upsert({
            where: { key },
            update: { value: String(value), type },
            create: { key, value: String(value), type },
        });
    }

    return Response.json({ success: true, message: 'Settings updated successfully' });
}, { requiredPermission: 'manage:settings', auditAction: 'SETTINGS_UPDATE', auditEntity: 'settings' });
