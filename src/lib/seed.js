const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
    console.log('Starting seed process...');

    // 1. Seed Users
    const passwordHash = await bcrypt.hash('Password@123', 12);
    
    const users = [
        { username: 'master', email: 'master@insophinia.com', role: 'master_admin', firstName: 'Master', lastName: 'Admin' },
        { username: 'admin', email: 'admin@insophinia.com', role: 'admin', firstName: 'System', lastName: 'Admin' },
        { username: 'supervisor', email: 'supervisor@insophinia.com', role: 'supervisor', firstName: 'Store', lastName: 'Supervisor' },
        { username: 'cashier1', email: 'cashier1@insophinia.com', role: 'cashier', firstName: 'Jane', lastName: 'Doe' },
        { username: 'cashier2', email: 'cashier2@insophinia.com', role: 'cashier', firstName: 'John', lastName: 'Smith' },
    ];

    for (const u of users) {
        const result = await prisma.user.upsert({
            where: { username: u.username },
            update: {
                isActive: true,
                deletedAt: null,
                failedLoginAttempts: 0,
                lockedUntil: null
            },
            create: {
                ...u,
                password: passwordHash,
                mustChangePassword: false,
                isActive: true,
            },
        });
        console.log(`- User ${u.username}: ${result.username === u.username ? 'Synced' : 'Error'}`);
    }
    console.log(`Verified ${users.length} users. (Default password: Password@123)`);

    // 2. Seed Categories
    const categoriesData = [
        { name: 'Beverages', description: 'Cold and hot drinks' },
        { name: 'Snacks', description: 'Chips, cookies, and quick bites' },
        { name: 'Groceries', description: 'Daily household items' },
        { name: 'Electronics', description: 'Gadgets and accessories' },
        { name: 'Apparel', description: 'Clothing and accessories' }
    ];

    const createdCategories = {};
    for (const c of categoriesData) {
        const category = await prisma.category.upsert({
            where: { name: c.name },
            update: {},
            create: c
        });
        createdCategories[c.name] = category.id;
    }
    console.log(`Verified ${categoriesData.length} categories.`);

    // 3. Seed Items
    const itemsData = [
        {
            pluCode: 'BEV-001',
            name: 'Cola Can 330ml',
            categoryId: createdCategories['Beverages'],
            barcode: '1234567890123',
            price: 1.50,
            costPrice: 0.80,
            stockQuantity: 150,
            totalQuantity: 150,
            lowStockThreshold: 20,
            unit: 'pcs'
        },
        {
            pluCode: 'BEV-002',
            name: 'Orange Juice 1L',
            categoryId: createdCategories['Beverages'],
            price: 3.00,
            costPrice: 1.50,
            stockQuantity: 40,
            totalQuantity: 40,
            lowStockThreshold: 10,
            unit: 'pcs'
        },
        {
            pluCode: 'SNK-001',
            name: 'Potato Chips Salted',
            categoryId: createdCategories['Snacks'],
            barcode: '1234567890124',
            price: 2.00,
            costPrice: 1.00,
            stockQuantity: 100,
            totalQuantity: 100,
            lowStockThreshold: 15,
            unit: 'pcs'
        },
        {
            pluCode: 'GRO-001',
            name: 'Basmati Rice 5kg',
            categoryId: createdCategories['Groceries'],
            price: 15.00,
            costPrice: 10.00,
            stockQuantity: 20,
            totalQuantity: 20,
            lowStockThreshold: 5,
            unit: 'bags'
        },
        {
            pluCode: 'ELE-001',
            name: 'Wireless Mouse',
            categoryId: createdCategories['Electronics'],
            price: 25.00,
            costPrice: 12.00,
            stockQuantity: 15,
            totalQuantity: 15,
            lowStockThreshold: 5,
            unit: 'pcs',
            hasDiscount: true,
            discountPercentage: 10.00
        }
    ];

    for (const item of itemsData) {
        await prisma.item.upsert({
            where: { pluCode: item.pluCode },
            update: {},
            create: item
        });
    }
    console.log(`Verified ${itemsData.length} items.`);

    // 4. Seed Customers
    const customersData = [
        { name: 'Alice Williams', phone: '0771112222', email: 'alice@example.com', loyaltyPoints: 120 },
        { name: 'Bob Brown', phone: '0773334444', email: 'bob@example.com', loyaltyPoints: 45 },
        { name: 'Charlie Davis', phone: '0775556666', email: 'charlie@example.com', loyaltyPoints: 0 },
    ];

    for (const customer of customersData) {
        await prisma.customer.upsert({
            where: { phone: customer.phone },
            update: {},
            create: customer
        });
    }
    console.log(`Verified ${customersData.length} customers.`);

    // 5. Seed Device Profiles
    await prisma.deviceProfile.upsert({
        where: { deviceIdentifier: 'MAIN-POS-01' },
        update: {},
        create: {
            deviceIdentifier: 'MAIN-POS-01',
            name: 'Counter 1 POS',
            defaultPrinter: 'thermal-1',
            defaultScanner: 'usb-scanner-1',
            isActive: true
        }
    });
    console.log(`Verified device profiles.`);
    
    // 6. Seed System Settings
    const settingsData = [
        { key: 'STORE_NAME', value: 'INSOPHINIA Supermart', type: 'string', description: 'Name of the store' },
        { key: 'CURRENCY_SYMBOL', value: '$', type: 'string', description: 'Currency symbol used in the system' },
        { key: 'TAX_RATE', value: '15', type: 'integer', description: 'Default tax rate percentage' },
        { key: 'ENABLE_LOYALTY', value: 'true', type: 'boolean', description: 'Enable loyalty points program' }
    ];

    for (const setting of settingsData) {
        await prisma.setting.upsert({
            where: { key: setting.key },
            update: {},
            create: setting
        });
    }
    console.log(`Verified system settings.`);

    console.log('Seed completed successfully!');
}

main()
    .then(async () => {
        await prisma.$disconnect();
    })
    .catch(async (e) => {
        console.error(e);
        await prisma.$disconnect();
        process.exit(1);
    });
