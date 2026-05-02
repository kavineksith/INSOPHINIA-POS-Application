import { NextRequest } from 'next/server';
import prisma from '@/lib/db';
import { protectedRoute } from '@/lib/route-helper';

// GET /api/items/export
export const GET = protectedRoute(async (request: NextRequest) => {
    const items = await prisma.item.findMany({
        where: { deletedAt: null },
        include: { category: { select: { name: true } } },
        orderBy: { name: 'asc' },
    });

    const csvRows = [
        ['PLU Code', 'Name', 'Category', 'Price', 'Cost Price', 'Stock', 'Barcode', 'Discount %'].join(','),
        ...items.map(item =>
            [
                `"${item.pluCode}"`, `"${item.name}"`, `"${item.category.name}"`,
                Number(item.price), Number(item.costPrice), item.stockQuantity,
                `"${item.barcode || ''}"`, Number(item.discountPercentage),
            ].join(',')
        ),
    ];

    return new Response(csvRows.join('\n'), {
        headers: {
            'Content-Type': 'text/csv',
            'Content-Disposition': `attachment; filename="items_export_${new Date().toISOString().split('T')[0]}.csv"`,
        },
    });
});
