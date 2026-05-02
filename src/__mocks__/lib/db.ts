/**
 * Prisma Client Mock
 * Used by Jest to mock all database operations.
 * Each model provides jest.fn() stubs for common Prisma methods.
 */

function createModelMock() {
  return {
    findMany: jest.fn().mockResolvedValue([]),
    findFirst: jest.fn().mockResolvedValue(null),
    findUnique: jest.fn().mockResolvedValue(null),
    create: jest.fn().mockResolvedValue({}),
    update: jest.fn().mockResolvedValue({}),
    upsert: jest.fn().mockResolvedValue({}),
    delete: jest.fn().mockResolvedValue({}),
    deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
    count: jest.fn().mockResolvedValue(0),
    aggregate: jest.fn().mockResolvedValue({ _sum: {}, _count: 0, _avg: {} }),
    groupBy: jest.fn().mockResolvedValue([]),
  };
}

const mockPrisma = {
  user: createModelMock(),
  category: createModelMock(),
  item: { ...createModelMock(), fields: {} },
  promotion: createModelMock(),
  customer: createModelMock(),
  bill: createModelMock(),
  billItem: createModelMock(),
  stockMovement: createModelMock(),
  setting: createModelMock(),
  deviceProfile: createModelMock(),
  backup: createModelMock(),
  loginSession: createModelMock(),
  tokenBlacklist: createModelMock(),
  securityEvent: createModelMock(),
  auditLog: createModelMock(),
  systemLog: createModelMock(),
  systemState: createModelMock(),
  $transaction: jest.fn().mockImplementation(async (fn: any) => {
    // Pass a mock transaction client that mirrors the main mock
    const txClient = { ...mockPrisma };
    // If fn is a function, call it with txClient
    if (typeof fn === 'function') {
      return await fn(txClient);
    }
    // If fn is an array of promises, resolve them all
    return Promise.all(fn);
  }),
  $connect: jest.fn(),
  $disconnect: jest.fn(),
};

export default mockPrisma;
export { mockPrisma };
