/**
 * Integration Tests: Promotions, Inventory, Users, Dashboard, Settings, Reports, Logs, System APIs
 * Consolidated test file for remaining API routes.
 */

jest.mock('@/lib/db');
jest.mock('@/lib/email');
jest.mock('@/lib/log-manager');
jest.mock('@/lib/auth', () => ({
  ...jest.requireActual('@/lib/auth'),
  authenticateRequest: jest.fn().mockResolvedValue({
    authenticated: true,
    user: { user_id: '550e8400-e29b-41d4-a716-446655440000', username: 'testadmin', role: 'admin' },
    token: 'mock-token',
  }),
  hashPassword: jest.fn().mockResolvedValue('hashed-password'),
  validatePasswordStrength: jest.fn().mockReturnValue([]),
}));
jest.mock('@/lib/security', () => ({
  ...jest.requireActual('@/lib/security'),
  checkRateLimit: jest.fn().mockResolvedValue({ allowed: true, remaining: 99, resetTime: 0 }),
  auditLog: jest.fn().mockResolvedValue(undefined),
  validateBodySize: jest.fn().mockResolvedValue(true),
  getClientIp: jest.fn().mockReturnValue('127.0.0.1'),
}));

import mockPrisma from '@/lib/db';
import { createMockRequest, createMockParams, TEST_IDS } from './helpers';

beforeEach(() => jest.clearAllMocks());

// ═══════════════════════════════════════════════════════════════════════════════
// PROMOTIONS API
// ═══════════════════════════════════════════════════════════════════════════════

describe('Promotions API', () => {
  // Dynamic imports for route handlers
  let getPromotions: any, postPromotion: any;

  beforeAll(async () => {
    const listModule = await import('@/app/api/promotions/route');
    getPromotions = listModule.GET;
    postPromotion = listModule.POST;
  });

  describe('GET /api/promotions', () => {
    it('returns promotions list', async () => {
      mockPrisma.promotion.findMany.mockResolvedValue([
        {
          id: TEST_IDS.promotion, name: 'Summer Sale', description: null,
          itemId: null, item: null, categoryId: TEST_IDS.category, category: { id: TEST_IDS.category, name: 'Beverages' },
          discountType: 'percentage', discountValue: 15,
          startDate: new Date(), endDate: new Date(), isActive: true, createdAt: new Date(),
        },
      ]);
      mockPrisma.promotion.count.mockResolvedValue(1);

      const request = createMockRequest('/api/promotions');
      const response = await getPromotions(request, { params: createMockParams({}) });
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.data).toHaveLength(1);
      expect(body.data[0].name).toBe('Summer Sale');
      expect(body.data[0].discount_type).toBe('percentage');
      expect(body.data[0].discount_value).toBe(15);
    });
  });

  describe('POST /api/promotions', () => {
    it('creates a promotion', async () => {
      mockPrisma.promotion.create.mockResolvedValue({ id: 'new-promo', name: 'New Promo' });

      const request = createMockRequest('/api/promotions', {
        method: 'POST',
        body: {
          name: 'New Promo', discount_type: 'percentage', discount_value: 20,
          start_date: '2026-01-01', end_date: '2026-12-31',
        },
      });
      const response = await postPromotion(request, { params: createMockParams({}) });
      const body = await response.json();

      expect(response.status).toBe(201);
      expect(body.success).toBe(true);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// INVENTORY API
// ═══════════════════════════════════════════════════════════════════════════════

describe('Inventory API', () => {
  let getInventory: any, postStockIn: any;

  beforeAll(async () => {
    const inventoryModule = await import('@/app/api/inventory/route');
    getInventory = inventoryModule.GET;
    const stockInModule = await import('@/app/api/inventory/stock-in/route');
    postStockIn = stockInModule.POST;
  });

  describe('GET /api/inventory', () => {
    it('returns inventory items', async () => {
      mockPrisma.item.findMany.mockResolvedValue([
        {
          id: TEST_IDS.item, pluCode: 'PLU001', name: 'Item 1',
          category: { name: 'Cat' }, unit: 'pcs',
          stockQuantity: 5, totalQuantity: 50, sellQuantity: 40,
          returnQuantity: 3, damageQuantity: 1, lostQuantity: 1,
          lowStockThreshold: 10, stockMovements: [],
        },
      ]);
      mockPrisma.item.count.mockResolvedValue(1);

      const request = createMockRequest('/api/inventory');
      const response = await getInventory(request, { params: createMockParams({}) });
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.data[0].is_low_stock).toBe(true);
      expect(body.data[0].stock_quantity).toBe(5);
    });
  });

  describe('POST /api/inventory/stock-in', () => {
    it('adds stock successfully', async () => {
      mockPrisma.item.findFirst.mockResolvedValue({ id: TEST_IDS.item, name: 'Item 1' });
      mockPrisma.$transaction.mockResolvedValue(undefined);

      const request = createMockRequest('/api/inventory/stock-in', {
        method: 'POST',
        body: { item_id: TEST_IDS.item, quantity: 25, notes: 'Restocking' },
      });
      const response = await postStockIn(request, { params: createMockParams({}) });
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.message).toContain('Stock added');
    });

    it('rejects when item not found (404)', async () => {
      mockPrisma.item.findFirst.mockResolvedValue(null);

      const request = createMockRequest('/api/inventory/stock-in', {
        method: 'POST',
        body: { item_id: TEST_IDS.item, quantity: 10 },
      });
      const response = await postStockIn(request, { params: createMockParams({}) });
      expect(response.status).toBe(404);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// USERS API
// ═══════════════════════════════════════════════════════════════════════════════

describe('Users API', () => {
  let getUsers: any, postUser: any;

  beforeAll(async () => {
    const usersModule = await import('@/app/api/users/route');
    getUsers = usersModule.GET;
    postUser = usersModule.POST;
  });

  describe('GET /api/users', () => {
    it('returns user list', async () => {
      mockPrisma.user.findMany.mockResolvedValue([
        {
          id: TEST_IDS.user, username: 'cashier1', email: 'c@example.com',
          role: 'cashier', firstName: 'Cash', lastName: 'Ier',
          isActive: true, lockedUntil: null, mustChangePassword: false,
          createdAt: new Date(), updatedAt: new Date(),
        },
      ]);
      mockPrisma.user.count.mockResolvedValue(1);

      const request = createMockRequest('/api/users');
      const response = await getUsers(request, { params: createMockParams({}) });
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.data).toHaveLength(1);
      expect(body.data[0].username).toBe('cashier1');
      expect(body.data[0].role).toBe('cashier');
    });
  });

  describe('POST /api/users', () => {
    it('creates a new user', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null); // No duplicate
      mockPrisma.user.create.mockResolvedValue({
        id: 'new-user-id', username: 'newuser', email: 'new@example.com',
        role: 'cashier', firstName: 'New', lastName: 'User',
      });

      const request = createMockRequest('/api/users', {
        method: 'POST',
        body: {
          username: 'newuser', email: 'new@example.com',
          password: 'Secure@Pass12', role: 'cashier',
          first_name: 'New', last_name: 'User',
        },
      });
      const response = await postUser(request, { params: createMockParams({}) });
      const body = await response.json();

      expect(response.status).toBe(201);
      expect(body.success).toBe(true);
      expect(body.data.username).toBe('newuser');
    });

    it('rejects duplicate username (409)', async () => {
      mockPrisma.user.findFirst.mockResolvedValue({ id: 'existing', username: 'newuser' });

      const request = createMockRequest('/api/users', {
        method: 'POST',
        body: {
          username: 'newuser', email: 'diff@example.com',
          password: 'Secure@Pass12', role: 'cashier',
          first_name: 'New', last_name: 'User',
        },
      });
      const response = await postUser(request, { params: createMockParams({}) });
      expect(response.status).toBe(409);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// DASHBOARD API
// ═══════════════════════════════════════════════════════════════════════════════

describe('Dashboard API', () => {
  it('GET /api/dashboard returns summary data', async () => {
    const { GET: getDashboard } = await import('@/app/api/dashboard/route');

    mockPrisma.bill.aggregate.mockResolvedValue({ _sum: { totalAmount: 5000 }, _count: 10 });
    mockPrisma.item.count.mockResolvedValue(50);
    mockPrisma.customer.count.mockResolvedValue(20);
    mockPrisma.category.count.mockResolvedValue(5);
    mockPrisma.bill.findMany.mockResolvedValue([]);
    mockPrisma.bill.count.mockResolvedValue(10);
    mockPrisma.promotion.count.mockResolvedValue(3);
    mockPrisma.user.count.mockResolvedValue(4);
    mockPrisma.bill.groupBy.mockResolvedValue([]);

    const request = createMockRequest('/api/dashboard');
    const response = await getDashboard(request, { params: createMockParams({}) });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data).toHaveProperty('today_sales');
    expect(body.data).toHaveProperty('total_items');
    expect(body.data).toHaveProperty('total_customers');
    expect(body.data).toHaveProperty('sales_chart');
    expect(body.data).toHaveProperty('recent_bills');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SETTINGS API
// ═══════════════════════════════════════════════════════════════════════════════

describe('Settings API', () => {
  let getSettings: any, putSettings: any;

  beforeAll(async () => {
    const settingsModule = await import('@/app/api/settings/route');
    getSettings = settingsModule.GET;
    putSettings = settingsModule.PUT;
  });

  describe('GET /api/settings', () => {
    it('returns settings as key-value', async () => {
      mockPrisma.setting.findMany.mockResolvedValue([
        { key: 'shop_name', value: 'My Shop', type: 'string' },
        { key: 'vat_rate', value: '15', type: 'integer' },
        { key: 'email_enabled', value: 'true', type: 'boolean' },
      ]);

      const request = createMockRequest('/api/settings');
      const response = await getSettings(request, { params: createMockParams({}) });
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.data.shop_name).toBe('My Shop');
      expect(body.data.vat_rate).toBe(15);
      expect(body.data.email_enabled).toBe(true);
    });
  });

  describe('PUT /api/settings', () => {
    it('updates settings', async () => {
      mockPrisma.setting.upsert.mockResolvedValue({});

      const request = createMockRequest('/api/settings', {
        method: 'PUT',
        body: { shop_name: 'Updated Shop', vat_rate: 20 },
      });
      const response = await putSettings(request, { params: createMockParams({}) });
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.success).toBe(true);
      expect(mockPrisma.setting.upsert).toHaveBeenCalledTimes(2);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// REPORTS API
// ═══════════════════════════════════════════════════════════════════════════════

describe('Reports API', () => {
  it('GET /api/reports/sales returns sales data', async () => {
    const { GET: getSalesReport } = await import('@/app/api/reports/sales/route');

    mockPrisma.bill.findMany.mockResolvedValue([]);
    mockPrisma.bill.count.mockResolvedValue(0);
    mockPrisma.bill.aggregate.mockResolvedValue({
      _sum: { totalAmount: 10000, totalDiscount: 500, subtotal: 10500 },
      _count: 25,
      _avg: { totalAmount: 400 },
    });

    const request = createMockRequest('/api/reports/sales', {
      searchParams: { start_date: '2026-01-01', end_date: '2026-12-31' },
    });
    const response = await getSalesReport(request, { params: createMockParams({}) });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.summary).toBeDefined();
    expect(body.data.summary.total_sales).toBe(10000);
    expect(body.data.summary.total_bills).toBe(25);
    expect(body.data.pagination).toBeDefined();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// LOGS API
// ═══════════════════════════════════════════════════════════════════════════════

describe('Logs API', () => {
  it('GET /api/logs returns system logs', async () => {
    const { GET: getLogs } = await import('@/app/api/logs/route');

    mockPrisma.systemLog.count.mockResolvedValue(2);
    mockPrisma.systemLog.findMany.mockResolvedValue([
      {
        id: 'log-1', level: 'info', category: 'auth', action: 'LOGIN_SUCCESS',
        message: 'User logged in', metadata: '{"browser":"Chrome"}',
        userId: TEST_IDS.user, ipAddress: '127.0.0.1', createdAt: new Date(),
      },
    ]);

    const request = createMockRequest('/api/logs', { searchParams: { level: 'info' } });
    const response = await getLogs(request, { params: createMockParams({}) });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toHaveLength(1);
    expect(body.data[0].level).toBe('info');
    expect(body.data[0].metadata).toEqual({ browser: 'Chrome' });
    expect(body.pagination.total).toBe(2);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SYSTEM API
// ═══════════════════════════════════════════════════════════════════════════════

describe('System API', () => {
  it('GET /api/system/status returns system state', async () => {
    const { GET: getSystemStatus } = await import('@/app/api/system/status/route');

    const checkinDate = new Date();
    checkinDate.setDate(checkinDate.getDate() - 5); // 5 days ago

    mockPrisma.systemState.findFirst.mockResolvedValue({
      id: 'state-1',
      isLocked: false,
      lockReason: null,
      lockedAt: null,
      lastCheckinAt: checkinDate,
      deadmanDays: 72,
    });

    const request = createMockRequest('/api/system/status');
    const response = await getSystemStatus(request, { params: createMockParams({}) });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.isLocked).toBe(false);
    expect(body.data.daysSinceCheckin).toBe(5);
    expect(body.data.daysRemaining).toBe(67);
    expect(body.data.deadmanDays).toBe(72);
  });

  it('returns defaults when no system state exists', async () => {
    const { GET: getSystemStatus } = await import('@/app/api/system/status/route');
    mockPrisma.systemState.findFirst.mockResolvedValue(null);

    const request = createMockRequest('/api/system/status');
    const response = await getSystemStatus(request, { params: createMockParams({}) });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.isLocked).toBe(false);
    expect(body.data.deadmanDays).toBe(72);
  });
});
