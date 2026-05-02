import { NextRequest } from 'next/server';
import prisma from '@/lib/db';
import { uuidSchema } from '@/lib/validation';
import { protectedRoute } from '@/lib/route-helper';
import { generateBillHtml, generateThermalReceiptHtml } from '@/lib/billTemplate';

export const GET = protectedRoute(async (request: NextRequest, { params }) => {
    const { id } = await params;
    if (!uuidSchema.safeParse(id).success) return Response.json({ success: false, message: 'Invalid ID' }, { status: 400 });

    const [bill, settingsRaw] = await Promise.all([
        prisma.bill.findFirst({
            where: { id, deletedAt: null },
            include: { billItems: true },
        }),
        prisma.setting.findMany({
            where: { key: { in: ['shop_name', 'shop_address', 'shop_phone'] } }
        })
    ]);

    if (!bill) return Response.json({ success: false, message: 'Bill not found' }, { status: 404 });

    const settings: Record<string, string> = {
        shop_name: 'INSOPHINIA',
        shop_address: '123 Main St, City',
        shop_phone: '+94 123 456 789'
    };
    settingsRaw.forEach(s => {
        if (s.value) settings[s.key] = s.value;
    });

    const billData = {
        billNumber: bill.billNumber,
        customerName: bill.customerName,
        customerEmail: bill.customerEmail || undefined,
        staffName: bill.staffName,
        startTime: bill.startTime,
        endTime: bill.endTime || undefined,
        subtotal: Number(bill.subtotal),
        totalDiscount: Number(bill.totalDiscount),
        totalAmount: Number(bill.totalAmount),
        paidAmount: Number(bill.paidAmount),
        balance: Number(bill.balance),
        status: bill.status,
        items: bill.billItems.map((bi: any) => ({
            itemName: bi.itemName,
            quantity: Number(bi.quantity),
            unit: bi.unit || 'pcs',
            unitPrice: Number(bi.unitPrice),
            discount: Number(bi.discount),
            subtotal: Number(bi.subtotal),
        })),
        earnedPoints: bill.earnedPoints,
        totalPointsAfter: bill.totalPointsAfter,
    };

    const shopData = {
        name: settings.shop_name,
        address: settings.shop_address,
        phone: settings.shop_phone,
    };

    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get('type');

    let html;
    if (type === 'thermal') {
        html = generateThermalReceiptHtml(billData, shopData);
    } else {
        html = generateBillHtml(billData, shopData);
    }

    return new Response(html, {
        headers: {
            'Content-Type': 'text/html',
        },
    });
});
