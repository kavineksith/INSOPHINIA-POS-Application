import { NextRequest } from 'next/server';
import prisma from '@/lib/db';
import { protectedRoute } from '@/lib/route-helper';

// GET /api/dashboard
export const GET = protectedRoute(async (request: NextRequest) => {
    const now = new Date();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    // Calculate start of week (Sunday)
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    // Calculate dates for the last 7 days chart
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(today.getDate() - 6);

    const [
        todaySales, monthSales, weekSales, totalItems, lowStockItems,
        outOfStockItems, totalCustomers, totalCategories,
        recentBills, todayBillCount,
        ongoingPromotions,
        returnBillsToday, returnBillsMonth,
        cancelBillsToday, cancelBillsMonth,
        usersCount, loyaltyCustomers,
        salesLast7Days
    ] = await Promise.all([
        prisma.bill.aggregate({ where: { status: 'completed', deletedAt: null, createdAt: { gte: today } }, _sum: { totalAmount: true }, _count: true }),
        prisma.bill.aggregate({ where: { status: 'completed', deletedAt: null, createdAt: { gte: startOfMonth } }, _sum: { totalAmount: true }, _count: true }),
        prisma.bill.aggregate({ where: { status: 'completed', deletedAt: null, createdAt: { gte: startOfWeek } }, _sum: { totalAmount: true }, _count: true }),
        prisma.item.count({ where: { deletedAt: null } }),
        prisma.item.count({ where: { deletedAt: null, stockQuantity: { gt: "0", lte: "10" } } }),
        prisma.item.count({ where: { deletedAt: null, stockQuantity: "0" } }),
        prisma.customer.count({ where: { deletedAt: null } }),
        prisma.category.count({ where: { deletedAt: null } }),
        prisma.bill.findMany({
            where: { deletedAt: null }, orderBy: { createdAt: 'desc' }, take: 10,
            select: { id: true, billNumber: true, customerName: true, totalAmount: true, status: true, createdAt: true },
        }),
        prisma.bill.count({ where: { deletedAt: null, createdAt: { gte: today } } }),

        // New metrics
        prisma.promotion.count({ where: { isActive: true, deletedAt: null, startDate: { lte: now }, endDate: { gte: now } } }),
        prisma.bill.count({ where: { status: 'returned', deletedAt: null, createdAt: { gte: today } } }),
        prisma.bill.count({ where: { status: 'returned', deletedAt: null, createdAt: { gte: startOfMonth } } }),
        prisma.bill.count({ where: { status: 'cancelled', deletedAt: null, createdAt: { gte: today } } }),
        prisma.bill.count({ where: { status: 'cancelled', deletedAt: null, createdAt: { gte: startOfMonth } } }),
        prisma.user.count({ where: { isActive: true, deletedAt: null } }),
        prisma.customer.count({ where: { deletedAt: null, loyaltyPoints: { gt: 0 } } }), // Customers with active loyalty points

        // Sales for the last 7 days (grouping by date)
        prisma.bill.groupBy({
            by: ['createdAt'], // Grouping by exact datetime, we'll process it in JS
            where: { status: 'completed', deletedAt: null, createdAt: { gte: sevenDaysAgo } },
            _sum: { totalAmount: true }
        })
    ]);

    // Process last 7 days sales data into a day-by-day array
    const chartDataMap = new Map<string, number>();

    // Initialize last 7 days with 0
    for (let i = 6; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(today.getDate() - i);
        // Format as MMM DD (e.g., Oct 12)
        const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        chartDataMap.set(dateStr, 0);
    }

    // Populate actual data
    if (salesLast7Days) {
        salesLast7Days.forEach((record: any) => {
            const dateStr = new Date(record.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            if (chartDataMap.has(dateStr)) {
                chartDataMap.set(dateStr, chartDataMap.get(dateStr)! + Number(record._sum.totalAmount || 0));
            }
        });
    }

    const chartData = Array.from(chartDataMap, ([date, amount]) => ({ date, amount }));

    return Response.json({
        success: true,
        data: {
            today_sales: Number(todaySales._sum.totalAmount || 0),
            today_bills: todaySales._count,
            week_sales: Number(weekSales._sum.totalAmount || 0),
            week_bills: weekSales._count,
            month_sales: Number(monthSales._sum.totalAmount || 0),
            month_bills: monthSales._count,
            total_items: totalItems,
            low_stock_items: lowStockItems,
            out_of_stock_items: outOfStockItems,
            total_customers: totalCustomers,
            total_categories: totalCategories,
            ongoing_promotions: ongoingPromotions,
            return_bills_today: returnBillsToday,
            return_bills_month: returnBillsMonth,
            cancel_bills_today: cancelBillsToday,
            cancel_bills_month: cancelBillsMonth,
            users_count: usersCount,
            loyalty_customers: loyaltyCustomers,
            sales_chart: chartData,
            recent_bills: recentBills.map(b => ({
                id: b.id, bill_number: b.billNumber, customer_name: b.customerName,
                total_amount: Number(b.totalAmount), status: b.status, created_at: b.createdAt,
            })),
        },
    });
});
