import { NextRequest } from 'next/server';
import prisma from '@/lib/db';
import { createBillSchema, validateRequest, formatZodErrors, paginationSchema } from '@/lib/validation';
import { protectedRoute } from '@/lib/route-helper';
import type { Item, Promotion } from '@prisma/client';
import { sendEmail } from '@/lib/email';
import { generateBillHtml } from '@/lib/billTemplate';
import { verifyPassword } from '@/lib/auth';
import { hasPermission } from '@/lib/permissions';
import { appendSystemLog } from '@/lib/log-manager';

// GET /api/billing - List bills
export const GET = protectedRoute(async (request: NextRequest) => {
    const url = new URL(request.url);
    const params = Object.fromEntries(url.searchParams);
    const pagination = paginationSchema.parse(params);
    const status = url.searchParams.get('status');
    const startDate = url.searchParams.get('start_date');
    const endDate = url.searchParams.get('end_date');

    const where: Record<string, unknown> = { deletedAt: null };
    if (status) where.status = status;
    if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) (where.createdAt as Record<string, unknown>).gte = new Date(startDate);
        if (endDate) (where.createdAt as Record<string, unknown>).lte = new Date(endDate + 'T23:59:59');
    }
    if (pagination.search) {
        where.OR = [
            { billNumber: { contains: pagination.search } },
            { customerName: { contains: pagination.search } },
        ];
    }

    const [bills, total] = await Promise.all([
        prisma.bill.findMany({
            where,
            skip: (pagination.page - 1) * pagination.limit,
            take: pagination.limit,
            orderBy: { createdAt: 'desc' },
        }),
        prisma.bill.count({ where }),
    ]);

    return Response.json({
        success: true,
        data: bills.map((b) => ({
            id: b.id, bill_number: b.billNumber, customer_name: b.customerName,
            staff_name: b.staffName, subtotal: Number(b.subtotal),
            total_discount: Number(b.totalDiscount), total_amount: Number(b.totalAmount),
            paid_amount: Number(b.paidAmount), balance: Number(b.balance),
            status: b.status, is_printed: b.isPrinted,
            created_at: b.createdAt, updated_at: b.updatedAt,
        })),
        pagination: { page: pagination.page, limit: pagination.limit, total, pages: Math.ceil(total / pagination.limit) },
    });
}, { requiredPermission: 'view:billing' });

// POST /api/billing - Create bill
export const POST = protectedRoute(async (request: NextRequest, { user }) => {
    const body = await request.json();
    const validation = validateRequest(createBillSchema, body);
    if (!validation.success) {
        return Response.json({ success: false, message: 'Validation failed', errors: formatZodErrors(validation.errors) }, { status: 400 });
    }

    const data = validation.data;
    const staffUser = await prisma.user.findUnique({ where: { id: user.user_id } });
    if (!staffUser) return Response.json({ success: false, message: 'Staff user not found' }, { status: 404 });

    // Fetch all items and verify stock
    const itemIds = data.items.map((i: { item_id: string }) => i.item_id);
    const items = await prisma.item.findMany({ where: { id: { in: itemIds }, deletedAt: null, isActive: true } });

    if (items.length !== itemIds.length) {
        return Response.json({ success: false, message: 'One or more items not found or inactive' }, { status: 404 });
    }

    const itemMap = new Map<string, Item>(items.map((i: Item) => [i.id, i]));

    // Verify stock availability
    for (const cartItem of data.items) {
        const item = itemMap.get(cartItem.item_id) as any;
        if (Number(item.stockQuantity) < cartItem.quantity) {
            return Response.json({ success: false, message: `Insufficient stock for ${item.name}. Available: ${Number(item.stockQuantity)}` }, { status: 400 });
        }
    }

    // Calculate totals
    let subtotal = 0;
    let totalDiscount = 0;
    const now = new Date();

    // Fetch active promotions and loyalty settings
    const [activePromotions, loyaltySetting] = await Promise.all([
        prisma.promotion.findMany({
            where: { isActive: true, deletedAt: null, startDate: { lte: now }, endDate: { gte: now } },
        }),
        prisma.setting.findUnique({ where: { key: 'loyalty_point_value' } })
    ]);

    const loyaltyPointValue = parseInt(loyaltySetting?.value || '100');

    const billItemsData = data.items.map((cartItem: { item_id: string; quantity: number, unit?: string }) => {
        const item = itemMap.get(cartItem.item_id)!;
        const unitPrice = Number(item.price);
        let discountPct = item.hasDiscount ? Number(item.discountPercentage) : 0;

        // Check promotions
        const itemPromo = activePromotions.find((p: Promotion) => p.itemId === item.id);
        const catPromo = activePromotions.find((p: Promotion) => p.categoryId === item.categoryId);
        const promo = itemPromo || catPromo;

        if (promo) {
            if (promo.discountType === 'percentage') {
                discountPct = Math.max(discountPct, Number(promo.discountValue));
            }
        }

        const discountAmt = (unitPrice * discountPct) / 100;
        const actualPrice = unitPrice - discountAmt;
        const lineSubtotal = actualPrice * cartItem.quantity;

        subtotal += unitPrice * cartItem.quantity;
        totalDiscount += discountAmt * cartItem.quantity;

        return {
            itemId: item.id, pluCode: item.pluCode, itemName: item.name,
            quantity: cartItem.quantity, unit: (item as any).unit || 'pcs', unitPrice, actualPrice,
            discount: discountAmt, discountPercentage: discountPct,
            subtotal: lineSubtotal,
        };
    });

    let totalAmount = subtotal - totalDiscount;
    let pointsValue = 0;
    const pointsRedeemed = data.points_redeemed || 0;
    let authorizerName: string | null = null;
    let authorizerId: string | null = null;

    if (pointsRedeemed > 0) {
        if (!data.customer_id) {
            return Response.json({ success: false, message: 'Customer selection required for point redemption' }, { status: 400 });
        }

        const customer = await prisma.customer.findUnique({ where: { id: data.customer_id } });
        if (!customer || customer.loyaltyPoints < pointsRedeemed) {
            return Response.json({ success: false, message: 'Insufficient loyalty points' }, { status: 400 });
        }

        if (pointsRedeemed < 100) {
            return Response.json({ success: false, message: 'Minimum 100 points required for redemption' }, { status: 400 });
        }

        // Authorization required
        if (!data.authorizer_username || !data.authorizer_password) {
            return Response.json({ success: false, message: 'Supervisor authorization required for point redemption' }, { status: 401 });
        }

        const authorizer = await prisma.user.findFirst({
            where: { username: data.authorizer_username, isActive: true, deletedAt: null }
        });

        if (!authorizer) {
            return Response.json({ success: false, message: 'Authorizer not found or inactive' }, { status: 401 });
        }

        if (!hasPermission(authorizer.role, 'authorize:loyalty')) {
            return Response.json({ success: false, message: 'Authorizer does not have permission for point redemption' }, { status: 403 });
        }

        const isPasswordValid = await verifyPassword(data.authorizer_password, authorizer.password);
        if (!isPasswordValid) {
            return Response.json({ success: false, message: 'Invalid authorizer password' }, { status: 401 });
        }

        authorizerName = `${authorizer.firstName} ${authorizer.lastName}`;
        authorizerId = authorizer.id;

        // 1 Point = Rs. 1.00
        pointsValue = pointsRedeemed;
        totalAmount = Math.max(0, totalAmount - pointsValue);
    }

    const balance = data.paid_amount - totalAmount;

    // Generate bill number
    const todayStr = now.toISOString().split('T')[0].replace(/-/g, '');
    const billCount = await prisma.bill.count({ where: { createdAt: { gte: new Date(now.toISOString().split('T')[0]) } } });
    const billNumber = `BILL-${todayStr}-${String(billCount + 1).padStart(4, '0')}`;

    // Loyalty points calculation
    const earnedPoints = Math.floor(totalAmount / loyaltyPointValue);
    let totalPointsAfter = earnedPoints;

    // Transaction: create bill + bill items + update stock + update customer loyalty
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const bill = await prisma.$transaction(async (tx: any) => {
        // Update customer points if customer is selected
        if (data.customer_id) {
            const customer = await tx.customer.update({
                where: { id: data.customer_id },
                data: { loyaltyPoints: { increment: earnedPoints - pointsRedeemed } }
            });
            totalPointsAfter = customer.loyaltyPoints;
        }

        const newBill = await tx.bill.create({
            data: {
                billNumber, customerId: data.customer_id || null,
                customerName: data.customer_name, customerEmail: data.customer_email || null,
                staffId: user.user_id, staffName: `${staffUser.firstName} ${staffUser.lastName}`,
                startTime: now, endTime: now,
                subtotal, totalDiscount, totalAmount,
                paidAmount: data.paid_amount, balance,
                status: 'completed', remarks: data.remarks || null,
                earnedPoints, pointsRedeemed, pointsValue, totalPointsAfter,
                pointsAuthorizedBy: authorizerName,
                pointsAuthorizedAt: authorizerName ? now : null,
            },
        });

        // Create bill items
        for (const bi of billItemsData) {
            await tx.billItem.create({
                data: {
                    billId: newBill.id, itemId: bi.itemId, pluCode: bi.pluCode,
                    itemName: bi.itemName, quantity: bi.quantity, unit: bi.unit,
                    unitPrice: bi.unitPrice, actualPrice: bi.actualPrice,
                    discount: bi.discount, discountPercentage: bi.discountPercentage,
                    subtotal: bi.subtotal,
                },
            });

            // Update stock
            await tx.item.update({
                where: { id: bi.itemId },
                data: {
                    stockQuantity: { decrement: Number(bi.quantity) },
                    sellQuantity: { increment: Number(bi.quantity) },
                },
            });

            // Stock movement record
            await tx.stockMovement.create({
                data: {
                    itemId: bi.itemId, movementType: 'out', quantity: bi.quantity,
                    referenceType: 'bill', referenceId: newBill.id,
                    notes: `Sold via bill ${billNumber}`, movementDate: now,
                    createdBy: user.user_id,
                },
            });
        }

        return newBill;
    });

    // Send automatic email if member has email
    const emailSetting = await prisma.setting.findUnique({ where: { key: 'email_enabled' } });
    const isEmailEnabled = emailSetting ? emailSetting.value === 'true' : (process.env.EMAIL_ENABLED !== 'false');

    if (bill.customerEmail && isEmailEnabled) {
        // Run in background to not block response
        (async () => {
            try {
                const settingsRaw = await prisma.setting.findMany({
                    where: { key: { in: ['shop_name', 'shop_address', 'shop_phone'] } }
                });
                const shop: any = { name: 'INSOPHINIA', address: '123 Main St, City', phone: '+94 123 456 789' };
                settingsRaw.forEach(s => { if (s.value) shop[s.key.replace('shop_', '')] = s.value; });

                const billData = {
                    billNumber: bill.billNumber, customerName: bill.customerName,
                    customerEmail: bill.customerEmail!, customerPhone: data.customer_phone || undefined,
                    staffName: bill.staffName, startTime: bill.startTime, endTime: bill.endTime || undefined,
                    subtotal: Number(bill.subtotal), totalDiscount: Number(bill.totalDiscount),
                    totalAmount: Number(bill.totalAmount), paidAmount: Number(bill.paidAmount),
                    balance: Number(bill.balance), status: bill.status,
                    items: billItemsData.map(bi => ({
                        itemName: bi.itemName, quantity: bi.quantity, unit: bi.unit, unitPrice: bi.unitPrice,
                        discount: bi.discount, subtotal: bi.subtotal
                    })),
                    earnedPoints: bill.earnedPoints,
                    pointsRedeemed: bill.pointsRedeemed,
                    pointsValue: Number(bill.pointsValue),
                    pointsAuthorizedBy: bill.pointsAuthorizedBy || undefined,
                    totalPointsAfter: bill.totalPointsAfter
                };

                const html = generateBillHtml(billData, shop);
                await sendEmail({ to: bill.customerEmail!, subject: `Receipt: ${bill.billNumber}`, html });
            } catch (err) {
                console.error('Auto-email error:', err);
            }
        })();
    }

    await appendSystemLog({
        level: 'info',
        category: 'billing',
        action: 'BILL_CREATE',
        message: `Created bill ${bill.billNumber} for ${Number(bill.totalAmount)}`,
        userId: user.user_id,
        metadata: {
            bill_number: bill.billNumber,
            total_amount: Number(bill.totalAmount),
            items_count: billItemsData.length,
            customer_id: data.customer_id,
        }
    });

    return Response.json({
        success: true,
        data: {
            id: bill.id, bill_number: bill.billNumber,
            total_amount: Number(bill.totalAmount), paid_amount: Number(bill.paidAmount),
            balance: Number(bill.balance), status: bill.status,
        },
        message: 'Bill created successfully',
    }, { status: 201 });
}, { requiredPermission: 'manage:billing', auditAction: 'BILL_CREATE', auditEntity: 'bill' });
