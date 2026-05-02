/**
 * Global Jest setup file
 * Sets up environment variables and global mocks for all tests.
 * 
 * NOTE: This file runs via `setupFiles` (before the test framework installs),
 * so we cannot use beforeAll/afterAll here. Instead, we do one-time configuration.
 */

// Set test environment variables
Object.defineProperty(process.env, 'NODE_ENV', { value: 'test', writable: true });
process.env.JWT_SECRET = 'test-jwt-secret-for-unit-tests-only';
process.env.JWT_EXPIRATION = '3600';
process.env.BCRYPT_ROUNDS = '4'; // Lower rounds for faster tests
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test_db';
process.env.RATE_LIMIT_MAX = '1000'; // High limit for tests
process.env.MAX_REQUEST_BODY_SIZE = '1048576';
process.env.PASSWORD_EXPIRY_DAYS = '7';

// Polyfill crypto.getRandomValues for CSRF tests in Node.js environment
// (Node 19+ has globalThis.crypto, but older versions may not)
if (typeof globalThis.crypto === 'undefined') {
  const nodeCrypto = require('crypto');
  Object.defineProperty(globalThis, 'crypto', {
    value: {
      getRandomValues: (arr: Uint8Array) => nodeCrypto.randomFillSync(arr),
    },
  });
}

// Suppress noisy console.error output from route error handlers during tests.
// We store the original and override. Since setupFiles runs before test framework,
// we use a simple override instead of beforeAll/afterAll.
const originalConsoleError = console.error;
console.error = (...args: unknown[]) => {
  const message = typeof args[0] === 'string' ? args[0] : '';
  if (
    message.includes('Route error:') ||
    message.includes('Session creation error:') ||
    message.includes('Token blacklist error:') ||
    message.includes('Audit log error:') ||
    message.includes('Security event log error:') ||
    message.includes('Auto-email error:')
  ) {
    return;
  }
  originalConsoleError(...args);
};
