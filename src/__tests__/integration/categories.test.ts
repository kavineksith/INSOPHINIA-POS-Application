/**
 * Integration Tests: Categories API
 * Tests GET /api/categories and POST /api/categories
 * Tests GET/PUT/DELETE /api/categories/[id]
 */

jest.mock('@/lib/db');
jest.mock('@/lib/email');
jest.mock('@/lib/log-manager');

// Mock the auth module to bypass authentication in tests
jest.mock('@/lib/auth', () => ({
  ...jest.requireActual('@/lib/auth'),
  authenticateRequest: jest.fn().mockResolvedValue({
    authenticated: true,
    user: {
      user_id: '550e8400-e29b-41d4-a716-446655440000',
      username: 'testadmin',
      role: 'admin',
    },
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
import { GET as getCategories, POST as postCategory } from '@/app/api/categories/route';
import { GET as getCategory, PUT as putCategory, DELETE as deleteCategory } from '@/app/api/categories/[id]/route';
import { createMockRequest, createMockParams, TEST_IDS } from './helpers';

beforeEach(() => {
  jest.clearAllMocks();
});

// ─── GET /api/categories ─────────────────────────────────────────────────────

describe('GET /api/categories', () => {
  it('returns paginated list of categories', async () => {
    const mockCategories = [
      { id: TEST_IDS.category, name: 'Beverages', description: 'Drinks', isActive: true, createdAt: new Date(), updatedAt: new Date(), _count: { items: 5 } },
    ];
    mockPrisma.category.findMany.mockResolvedValue(mockCategories);
    mockPrisma.category.count.mockResolvedValue(1);

    const request = createMockRequest('/api/categories', { searchParams: { page: '1', limit: '10' } });
    const response = await getCategories(request, { params: createMockParams({}) });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data).toHaveLength(1);
    expect(body.data[0].name).toBe('Beverages');
    expect(body.data[0].item_count).toBe(5);
    expect(body.pagination).toBeDefined();
    expect(body.pagination.total).toBe(1);
  });

  it('applies search filter', async () => {
    mockPrisma.category.findMany.mockResolvedValue([]);
    mockPrisma.category.count.mockResolvedValue(0);

    const request = createMockRequest('/api/categories', { searchParams: { search: 'Bev' } });
    await getCategories(request, { params: createMockParams({}) });

    // Verify findMany was called with name filter
    expect(mockPrisma.category.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          name: expect.objectContaining({ contains: expect.any(String) }),
        }),
      })
    );
  });
});

// ─── POST /api/categories ────────────────────────────────────────────────────

describe('POST /api/categories', () => {
  it('creates a new category successfully', async () => {
    mockPrisma.category.findFirst.mockResolvedValue(null); // No duplicate
    mockPrisma.category.create.mockResolvedValue({
      id: TEST_IDS.category,
      name: 'Electronics',
      description: 'Gadgets and devices',
    });

    const request = createMockRequest('/api/categories', {
      method: 'POST',
      body: { name: 'Electronics', description: 'Gadgets and devices' },
    });
    const response = await postCategory(request, { params: createMockParams({}) });
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.success).toBe(true);
    expect(body.data.name).toBe('Electronics');
    expect(body.message).toContain('created');
  });

  it('rejects duplicate category name (409)', async () => {
    mockPrisma.category.findFirst.mockResolvedValue({ id: 'existing-id', name: 'Electronics' });

    const request = createMockRequest('/api/categories', {
      method: 'POST',
      body: { name: 'Electronics' },
    });
    const response = await postCategory(request, { params: createMockParams({}) });
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body.success).toBe(false);
    expect(body.message).toContain('already exists');
  });

  it('rejects invalid data (400)', async () => {
    const request = createMockRequest('/api/categories', {
      method: 'POST',
      body: { name: '' }, // empty name
    });
    const response = await postCategory(request, { params: createMockParams({}) });
    expect(response.status).toBe(400);
  });
});

// ─── GET /api/categories/[id] ────────────────────────────────────────────────

describe('GET /api/categories/[id]', () => {
  it('returns a single category', async () => {
    mockPrisma.category.findFirst.mockResolvedValue({
      id: TEST_IDS.category,
      name: 'Beverages',
      description: null,
      isActive: true,
      createdAt: new Date(),
    });

    const request = createMockRequest(`/api/categories/${TEST_IDS.category}`);
    const response = await getCategory(request, { params: createMockParams({ id: TEST_IDS.category }) });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.id).toBe(TEST_IDS.category);
  });

  it('returns 404 for non-existent category', async () => {
    mockPrisma.category.findFirst.mockResolvedValue(null);

    const request = createMockRequest(`/api/categories/${TEST_IDS.category}`);
    const response = await getCategory(request, { params: createMockParams({ id: TEST_IDS.category }) });

    expect(response.status).toBe(404);
  });

  it('returns 400 for invalid UUID', async () => {
    const request = createMockRequest('/api/categories/invalid-id');
    const response = await getCategory(request, { params: createMockParams({ id: 'invalid-id' }) });

    expect(response.status).toBe(400);
  });
});

// ─── PUT /api/categories/[id] ────────────────────────────────────────────────

describe('PUT /api/categories/[id]', () => {
  it('updates category successfully', async () => {
    mockPrisma.category.findFirst
      .mockResolvedValueOnce({ id: TEST_IDS.category, name: 'OldName' }) // existing check
      .mockResolvedValueOnce(null); // dup check
    mockPrisma.category.update.mockResolvedValue({
      id: TEST_IDS.category,
      name: 'NewName',
      description: 'Updated',
    });

    const request = createMockRequest(`/api/categories/${TEST_IDS.category}`, {
      method: 'PUT',
      body: { name: 'NewName', description: 'Updated' },
    });
    const response = await putCategory(request, { params: createMockParams({ id: TEST_IDS.category }) });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.name).toBe('NewName');
  });

  it('rejects duplicate name on update (409)', async () => {
    mockPrisma.category.findFirst
      .mockResolvedValueOnce({ id: TEST_IDS.category, name: 'OldName' })
      .mockResolvedValueOnce({ id: 'other-id', name: 'Existing' }); // dup found

    const request = createMockRequest(`/api/categories/${TEST_IDS.category}`, {
      method: 'PUT',
      body: { name: 'Existing' },
    });
    const response = await putCategory(request, { params: createMockParams({ id: TEST_IDS.category }) });

    expect(response.status).toBe(409);
  });
});

// ─── DELETE /api/categories/[id] ─────────────────────────────────────────────

describe('DELETE /api/categories/[id]', () => {
  it('soft-deletes category successfully', async () => {
    mockPrisma.category.findFirst.mockResolvedValue({ id: TEST_IDS.category, name: 'ToDelete' });
    mockPrisma.item.count.mockResolvedValue(0); // No active items
    mockPrisma.category.update.mockResolvedValue({});

    const request = createMockRequest(`/api/categories/${TEST_IDS.category}`, { method: 'DELETE' });
    const response = await deleteCategory(request, { params: createMockParams({ id: TEST_IDS.category }) });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(mockPrisma.category.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ deletedAt: expect.any(Date) }),
      })
    );
  });

  it('rejects deleting category with active items (400)', async () => {
    mockPrisma.category.findFirst.mockResolvedValue({ id: TEST_IDS.category });
    mockPrisma.item.count.mockResolvedValue(5); // Has items

    const request = createMockRequest(`/api/categories/${TEST_IDS.category}`, { method: 'DELETE' });
    const response = await deleteCategory(request, { params: createMockParams({ id: TEST_IDS.category }) });

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.message).toContain('active items');
  });
});
