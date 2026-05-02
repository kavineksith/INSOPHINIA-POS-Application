/**
 * Integration Tests: Items API
 * Tests GET/POST /api/items and GET/PUT/DELETE /api/items/[id]
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
}));
jest.mock('@/lib/security', () => ({
  ...jest.requireActual('@/lib/security'),
  checkRateLimit: jest.fn().mockResolvedValue({ allowed: true, remaining: 99, resetTime: 0 }),
  auditLog: jest.fn().mockResolvedValue(undefined),
  validateBodySize: jest.fn().mockResolvedValue(true),
  getClientIp: jest.fn().mockReturnValue('127.0.0.1'),
}));

import mockPrisma from '@/lib/db';
import { GET as getItems, POST as postItem } from '@/app/api/items/route';
import { GET as getItem, PUT as putItem, DELETE as deleteItem } from '@/app/api/items/[id]/route';
import { createMockRequest, createMockParams, TEST_IDS } from './helpers';

beforeEach(() => jest.clearAllMocks());

const mockItem = {
  id: TEST_IDS.item,
  pluCode: 'PLU001',
  name: 'Coca-Cola',
  description: null,
  categoryId: TEST_IDS.category,
  barcode: '1234567890',
  qrCode: null,
  price: 250,
  costPrice: 200,
  unit: 'pcs',
  stockQuantity: 100,
  totalQuantity: 150,
  sellQuantity: 30,
  returnQuantity: 5,
  damageQuantity: 2,
  lostQuantity: 1,
  lowStockThreshold: 10,
  isActive: true,
  hasDiscount: false,
  discountPercentage: 0,
  createdAt: new Date(),
  updatedAt: new Date(),
  category: { id: TEST_IDS.category, name: 'Beverages' },
};

// ─── GET /api/items ──────────────────────────────────────────────────────────

describe('GET /api/items', () => {
  it('returns paginated items with categories', async () => {
    mockPrisma.item.findMany.mockResolvedValue([mockItem]);
    mockPrisma.item.count.mockResolvedValue(1);

    const request = createMockRequest('/api/items');
    const response = await getItems(request, { params: createMockParams({}) });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data).toHaveLength(1);
    expect(body.data[0].plu_code).toBe('PLU001');
    expect(body.data[0].category_name).toBe('Beverages');
    expect(body.data[0].price).toBe(250);
    expect(body.data[0].stock_quantity).toBe(100);
  });

  it('filters by category_id', async () => {
    mockPrisma.item.findMany.mockResolvedValue([]);
    mockPrisma.item.count.mockResolvedValue(0);

    const request = createMockRequest('/api/items', {
      searchParams: { category_id: TEST_IDS.category },
    });
    await getItems(request, { params: createMockParams({}) });

    expect(mockPrisma.item.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ categoryId: TEST_IDS.category }),
      })
    );
  });
});

// ─── POST /api/items ─────────────────────────────────────────────────────────

describe('POST /api/items', () => {
  const validItemBody = {
    plu_code: 'PLU002',
    name: 'Sprite',
    category_id: TEST_IDS.category,
    price: 200,
    cost_price: 150,
    stock_quantity: 50,
  };

  it('creates item successfully', async () => {
    mockPrisma.item.findFirst.mockResolvedValue(null); // No dup PLU
    mockPrisma.category.findFirst.mockResolvedValue({ id: TEST_IDS.category }); // Category exists
    mockPrisma.item.create.mockResolvedValue({ id: 'new-id', pluCode: 'PLU002', name: 'Sprite' });

    const request = createMockRequest('/api/items', { method: 'POST', body: validItemBody });
    const response = await postItem(request, { params: createMockParams({}) });
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.success).toBe(true);
    expect(body.data.plu_code).toBe('PLU002');
  });

  it('rejects duplicate PLU code (409)', async () => {
    mockPrisma.item.findFirst.mockResolvedValueOnce({ id: 'existing', pluCode: 'PLU002' }); // PLU exists

    const request = createMockRequest('/api/items', { method: 'POST', body: validItemBody });
    const response = await postItem(request, { params: createMockParams({}) });

    expect(response.status).toBe(409);
    const body = await response.json();
    expect(body.message).toContain('PLU');
  });

  it('rejects when category not found (404)', async () => {
    mockPrisma.item.findFirst.mockResolvedValue(null); // No dup PLU
    mockPrisma.category.findFirst.mockResolvedValue(null); // No category

    const request = createMockRequest('/api/items', { method: 'POST', body: validItemBody });
    const response = await postItem(request, { params: createMockParams({}) });

    expect(response.status).toBe(404);
  });

  it('rejects invalid data (400)', async () => {
    const request = createMockRequest('/api/items', {
      method: 'POST',
      body: { plu_code: '', name: '', category_id: 'bad', price: -1, cost_price: -1 },
    });
    const response = await postItem(request, { params: createMockParams({}) });
    expect(response.status).toBe(400);
  });
});

// ─── GET /api/items/[id] ────────────────────────────────────────────────────

describe('GET /api/items/[id]', () => {
  it('returns item details', async () => {
    mockPrisma.item.findFirst.mockResolvedValue(mockItem);

    const request = createMockRequest(`/api/items/${TEST_IDS.item}`);
    const response = await getItem(request, { params: createMockParams({ id: TEST_IDS.item }) });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.id).toBe(TEST_IDS.item);
    expect(body.data.plu_code).toBe('PLU001');
  });

  it('returns 404 for non-existent item', async () => {
    mockPrisma.item.findFirst.mockResolvedValue(null);

    const request = createMockRequest(`/api/items/${TEST_IDS.item}`);
    const response = await getItem(request, { params: createMockParams({ id: TEST_IDS.item }) });
    expect(response.status).toBe(404);
  });
});

// ─── PUT /api/items/[id] ─────────────────────────────────────────────────────

describe('PUT /api/items/[id]', () => {
  it('updates item successfully', async () => {
    mockPrisma.item.findFirst.mockResolvedValue(mockItem);
    mockPrisma.item.update.mockResolvedValue({ id: TEST_IDS.item, name: 'Updated Cola' });

    const request = createMockRequest(`/api/items/${TEST_IDS.item}`, {
      method: 'PUT',
      body: { name: 'Updated Cola', price: 300 },
    });
    const response = await putItem(request, { params: createMockParams({ id: TEST_IDS.item }) });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
  });
});

// ─── DELETE /api/items/[id] ──────────────────────────────────────────────────

describe('DELETE /api/items/[id]', () => {
  it('soft-deletes item', async () => {
    mockPrisma.item.findFirst.mockResolvedValue(mockItem);
    mockPrisma.item.update.mockResolvedValue({});

    const request = createMockRequest(`/api/items/${TEST_IDS.item}`, { method: 'DELETE' });
    const response = await deleteItem(request, { params: createMockParams({ id: TEST_IDS.item }) });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(mockPrisma.item.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ deletedAt: expect.any(Date), isActive: false }),
      })
    );
  });
});
