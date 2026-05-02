/**
 * Integration Tests: Customers API
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
import { GET as getCustomers, POST as postCustomer } from '@/app/api/customers/route';
import { GET as getCustomer, PUT as putCustomer, DELETE as deleteCustomer } from '@/app/api/customers/[id]/route';
import { createMockRequest, createMockParams, TEST_IDS } from './helpers';

beforeEach(() => jest.clearAllMocks());

const mockCustomer = {
  id: TEST_IDS.customer,
  name: 'Jane Doe',
  email: 'jane@example.com',
  phone: '+94771234567',
  loyaltyPoints: 150,
  createdAt: new Date(),
  updatedAt: new Date(),
};

// ─── GET /api/customers ──────────────────────────────────────────────────────

describe('GET /api/customers', () => {
  it('returns customer list', async () => {
    mockPrisma.customer.findMany.mockResolvedValue([mockCustomer]);
    mockPrisma.customer.count.mockResolvedValue(1);

    const request = createMockRequest('/api/customers');
    const response = await getCustomers(request, { params: createMockParams({}) });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toHaveLength(1);
    expect(body.data[0].name).toBe('Jane Doe');
    expect(body.data[0].loyalty_points).toBe(150);
  });
});

// ─── POST /api/customers ─────────────────────────────────────────────────────

describe('POST /api/customers', () => {
  it('creates customer successfully', async () => {
    mockPrisma.customer.create.mockResolvedValue({ id: 'new-id', name: 'New Customer' });

    const request = createMockRequest('/api/customers', {
      method: 'POST',
      body: { name: 'New Customer', email: 'new@example.com', phone: '+94777777777' },
    });
    const response = await postCustomer(request, { params: createMockParams({}) });
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.success).toBe(true);
  });

  it('handles duplicate email (P2002)', async () => {
    mockPrisma.customer.create.mockRejectedValue({ code: 'P2002', meta: { target: ['email'] } });

    const request = createMockRequest('/api/customers', {
      method: 'POST',
      body: { name: 'Dup', email: 'dup@example.com' },
    });
    const response = await postCustomer(request, { params: createMockParams({}) });

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.message).toContain('email');
  });

  it('handles duplicate phone (P2002)', async () => {
    mockPrisma.customer.create.mockRejectedValue({ code: 'P2002', meta: { target: ['phone'] } });

    const request = createMockRequest('/api/customers', {
      method: 'POST',
      body: { name: 'Dup', phone: '+94777777777' },
    });
    const response = await postCustomer(request, { params: createMockParams({}) });

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.message).toContain('phone');
  });
});

// ─── GET /api/customers/[id] ─────────────────────────────────────────────────

describe('GET /api/customers/[id]', () => {
  it('returns customer', async () => {
    mockPrisma.customer.findFirst.mockResolvedValue(mockCustomer);

    const request = createMockRequest(`/api/customers/${TEST_IDS.customer}`);
    const response = await getCustomer(request, { params: createMockParams({ id: TEST_IDS.customer }) });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.name).toBe('Jane Doe');
  });

  it('returns 404 for non-existent', async () => {
    mockPrisma.customer.findFirst.mockResolvedValue(null);

    const request = createMockRequest(`/api/customers/${TEST_IDS.customer}`);
    const response = await getCustomer(request, { params: createMockParams({ id: TEST_IDS.customer }) });
    expect(response.status).toBe(404);
  });
});

// ─── PUT /api/customers/[id] ─────────────────────────────────────────────────

describe('PUT /api/customers/[id]', () => {
  it('updates customer', async () => {
    mockPrisma.customer.findFirst.mockResolvedValue(mockCustomer);
    mockPrisma.customer.update.mockResolvedValue({ id: TEST_IDS.customer, name: 'Updated Jane' });

    const request = createMockRequest(`/api/customers/${TEST_IDS.customer}`, {
      method: 'PUT',
      body: { name: 'Updated Jane' },
    });
    const response = await putCustomer(request, { params: createMockParams({ id: TEST_IDS.customer }) });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
  });
});

// ─── DELETE /api/customers/[id] ──────────────────────────────────────────────

describe('DELETE /api/customers/[id]', () => {
  it('soft-deletes customer', async () => {
    mockPrisma.customer.findFirst.mockResolvedValue(mockCustomer);
    mockPrisma.customer.update.mockResolvedValue({});

    const request = createMockRequest(`/api/customers/${TEST_IDS.customer}`, { method: 'DELETE' });
    const response = await deleteCustomer(request, { params: createMockParams({ id: TEST_IDS.customer }) });

    expect(response.status).toBe(200);
    expect(mockPrisma.customer.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ deletedAt: expect.any(Date) }) })
    );
  });
});
