import { NextRequest, NextResponse } from 'next/server';
import { protectedRoute } from '@/lib/route-helper';
import db from '@/lib/db';
import { z } from 'zod';

const deviceProfileSchema = z.object({
    deviceId: z.string().min(1),
    name: z.string().min(1).optional(),
    defaultPrinter: z.enum(['thermal', 'a4']).optional(),
    defaultScanner: z.enum(['keyboard', 'camera']).optional()
});

export const GET = protectedRoute(async (request: NextRequest) => {
    const { searchParams } = new URL(request.url);
    const deviceId = searchParams.get('deviceId');

    if (!deviceId) {
        return NextResponse.json({ success: false, message: 'Device ID required' }, { status: 400 });
    }

    let profile = await db.deviceProfile.findUnique({
        where: { deviceIdentifier: deviceId }
    });

    if (!profile) {
        // Create default profile for this new device
        profile = await db.deviceProfile.create({
            data: {
                deviceIdentifier: deviceId,
                name: `Device ${deviceId.substring(0, 6)}`,
                defaultPrinter: 'thermal',
                defaultScanner: 'keyboard'
            }
        });
    }

    return NextResponse.json({ success: true, data: profile });
});

export const POST = protectedRoute(async (request: NextRequest) => {
    try {
        const body = await request.json();
        const { deviceId, name, defaultPrinter, defaultScanner } = deviceProfileSchema.parse(body);

        const profile = await db.deviceProfile.upsert({
            where: { deviceIdentifier: deviceId },
            update: {
                ...(name && { name }),
                ...(defaultPrinter && { defaultPrinter }),
                ...(defaultScanner && { defaultScanner })
            },
            create: {
                deviceIdentifier: deviceId,
                name: name || `Device ${deviceId.substring(0, 6)}`,
                defaultPrinter: defaultPrinter || 'thermal',
                defaultScanner: defaultScanner || 'keyboard'
            }
        });

        return NextResponse.json({ success: true, data: profile });
    } catch (error) {
        return NextResponse.json({ success: false, message: 'Invalid data' }, { status: 400 });
    }
}, { requiredRole: 'admin' });
