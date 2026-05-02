/**
 * Integration Tests: Helper utilities for API route testing.
 * Provides mock request builders and Prisma reset utilities.
 */

import { NextRequest } from 'next/server';

/**
 * Create a mock NextRequest for API route testing.
 */
export function createMockRequest(
  url: string,
  options: {
    method?: string;
    body?: Record<string, unknown>;
    headers?: Record<string, string>;
    searchParams?: Record<string, string>;
  } = {}
): NextRequest {
  const { method = 'GET', body, headers = {}, searchParams = {} } = options;

  const fullUrl = new URL(url, 'http://localhost:3000');
  for (const [key, value] of Object.entries(searchParams)) {
    fullUrl.searchParams.set(key, value);
  }

  const requestInit: RequestInit = {
    method,
    headers: {
      'content-type': 'application/json',
      authorization: 'Bearer mock-test-token',
      ...headers,
    },
  };

  if (body && ['POST', 'PUT', 'PATCH'].includes(method)) {
    requestInit.body = JSON.stringify(body);
  }

  return new NextRequest(fullUrl.toString(), requestInit);
}

/**
 * Create mock params promise for dynamic routes (e.g., [id])
 */
export function createMockParams(params: Record<string, string>): Promise<Record<string, string>> {
  return Promise.resolve(params);
}

/**
 * Standard test user payloads for different roles
 */
export const TEST_USERS = {
  admin: {
    user_id: '550e8400-e29b-41d4-a716-446655440000',
    username: 'testadmin',
    role: 'admin',
    session_id: '660e8400-e29b-41d4-a716-446655440001',
  },
  cashier: {
    user_id: '770e8400-e29b-41d4-a716-446655440002',
    username: 'testcashier',
    role: 'cashier',
    session_id: '880e8400-e29b-41d4-a716-446655440003',
  },
  supervisor: {
    user_id: '990e8400-e29b-41d4-a716-446655440004',
    username: 'testsupervisor',
    role: 'supervisor',
    session_id: 'aa0e8400-e29b-41d4-a716-446655440005',
  },
  master_admin: {
    user_id: 'bb0e8400-e29b-41d4-a716-446655440006',
    username: 'testmaster',
    role: 'master_admin',
    session_id: 'cc0e8400-e29b-41d4-a716-446655440007',
  },
};

/**
 * Standard UUID for test entities
 */
export const TEST_IDS = {
  category: 'dd0e8400-e29b-41d4-a716-446655440010',
  item: 'ee0e8400-e29b-41d4-a716-446655440011',
  customer: 'ff0e8400-e29b-41d4-a716-446655440012',
  bill: '110e8400-e29b-41d4-a716-446655440013',
  promotion: '220e8400-e29b-41d4-a716-446655440014',
  user: '330e8400-e29b-41d4-a716-446655440015',
};

/**
 * Reset all mocks on the given Prisma mock instance
 */
export function resetPrismaMocks(mockPrisma: any) {
  for (const key of Object.keys(mockPrisma)) {
    const model = mockPrisma[key];
    if (typeof model === 'object' && model !== null) {
      for (const method of Object.keys(model)) {
        if (typeof model[method]?.mockReset === 'function') {
          model[method].mockReset();
        }
      }
    }
  }
}
