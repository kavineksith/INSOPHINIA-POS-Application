import { NextRequest, NextResponse } from 'next/server';
import { protectedRoute } from '@/lib/route-helper';
import { z } from 'zod';
import db from '@/lib/db';
import { sendEmail, generateBillEmailHtml } from '@/lib/email';
import { JwtPayload } from '@/lib/auth';

const emailSchema = z.object({ email: z.string().email() });

export const POST = protectedRoute(async (request: NextRequest, context: { params: Promise<Record<string, string>>; user: JwtPayload }) => {
    const params = await context.params;
    const { id } = params;
    const body = await request.json();
    const { email } = emailSchema.parse(body);

    const [bill, settingsRaw] = await Promise.all([
        db.bill.findUnique({
            where: { id },
            include: { billItems: true }
        }),
        db.setting.findMany({
            where: { key: { in: ['shop_name', 'shop_address', 'shop_phone'] } }
        })
    ]);

    if (!bill) {
        return NextResponse.json({ success: false, message: 'Bill not found' }, { status: 404 });
    }

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
        customerName: bill.customerName || 'Customer',
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
    };

    const shopData = {
        name: settings.shop_name,
        address: settings.shop_address,
        phone: settings.shop_phone,
    };

    const html = generateBillEmailHtml(billData, shopData);

    const sent = await sendEmail({ to: email, subject: `Receipt #${bill.billNumber} - ${shopData.name}`, html });

    if (!sent) {
        return NextResponse.json({ success: false, message: 'Failed to send email. Check SMTP settings.' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Email sent successfully' });
}, { requiredRole: 'cashier', auditAction: 'EMAIL_BILL', auditEntity: 'billing' });
