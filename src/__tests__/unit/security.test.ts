/**
 * Unit Tests: lib/security.ts + lib/csrf.ts
 * Tests security headers, IP extraction, content-type validation, body size, rate-limit response, CSRF.
 */

import {
  getSecurityHeaders,
  getClientIp,
  validateContentType,
  validateBodySize,
  rateLimitResponse,
} from '@/lib/security';

import { generateCsrfToken, validateCsrfToken } from '@/lib/csrf';

// ─── getSecurityHeaders ──────────────────────────────────────────────────────

describe('getSecurityHeaders', () => {
  const headers = getSecurityHeaders();

  it('includes X-Content-Type-Options: nosniff', () => {
    expect(headers['X-Content-Type-Options']).toBe('nosniff');
  });

  it('includes X-Frame-Options: DENY', () => {
    expect(headers['X-Frame-Options']).toBe('DENY');
  });

  it('includes X-XSS-Protection', () => {
    expect(headers['X-XSS-Protection']).toBe('1; mode=block');
  });

  it('includes Referrer-Policy', () => {
    expect(headers['Referrer-Policy']).toBe('strict-origin-when-cross-origin');
  });

  it('includes HSTS header', () => {
    expect(headers['Strict-Transport-Security']).toContain('max-age=');
    expect(headers['Strict-Transport-Security']).toContain('includeSubDomains');
  });

  it('includes Content-Security-Policy', () => {
    expect(headers['Content-Security-Policy']).toContain("default-src 'self'");
    expect(headers['Content-Security-Policy']).toContain("frame-ancestors 'none'");
  });

  it('includes Cross-Origin headers', () => {
    expect(headers['Cross-Origin-Opener-Policy']).toBe('same-origin');
    expect(headers['Cross-Origin-Resource-Policy']).toBe('same-origin');
  });

  it('includes Permissions-Policy', () => {
    expect(headers['Permissions-Policy']).toContain('camera=');
  });
});

// ─── getClientIp ─────────────────────────────────────────────────────────────

describe('getClientIp', () => {
  it('extracts first IP from x-forwarded-for', () => {
    const request = new Request('http://localhost/api', {
      headers: { 'x-forwarded-for': '192.168.1.100, 10.0.0.1' },
    });
    expect(getClientIp(request)).toBe('192.168.1.100');
  });

  it('falls back to x-real-ip', () => {
    const request = new Request('http://localhost/api', {
      headers: { 'x-real-ip': '10.0.0.50' },
    });
    expect(getClientIp(request)).toBe('10.0.0.50');
  });

  it('falls back to 127.0.0.1 when no IP headers', () => {
    const request = new Request('http://localhost/api');
    expect(getClientIp(request)).toBe('127.0.0.1');
  });
});

// ─── validateContentType ─────────────────────────────────────────────────────

describe('validateContentType', () => {
  it('returns true for matching content type', () => {
    const request = new Request('http://localhost/api', {
      headers: { 'content-type': 'application/json; charset=utf-8' },
    });
    expect(validateContentType(request)).toBe(true);
  });

  it('returns false for mismatched content type', () => {
    const request = new Request('http://localhost/api', {
      headers: { 'content-type': 'text/html' },
    });
    expect(validateContentType(request)).toBe(false);
  });

  it('returns false when content-type is absent', () => {
    const request = new Request('http://localhost/api');
    expect(validateContentType(request)).toBe(false);
  });

  it('supports custom expected content type', () => {
    const request = new Request('http://localhost/api', {
      headers: { 'content-type': 'multipart/form-data' },
    });
    expect(validateContentType(request, 'multipart/form-data')).toBe(true);
  });
});

// ─── validateBodySize ────────────────────────────────────────────────────────

describe('validateBodySize', () => {
  it('returns true when content-length is within limit', async () => {
    const request = new Request('http://localhost/api', {
      headers: { 'content-length': '1024' },
    });
    expect(await validateBodySize(request)).toBe(true);
  });

  it('returns false when content-length exceeds limit', async () => {
    const request = new Request('http://localhost/api', {
      headers: { 'content-length': '999999999' },
    });
    expect(await validateBodySize(request)).toBe(false);
  });

  it('returns true when content-length is absent', async () => {
    const request = new Request('http://localhost/api');
    expect(await validateBodySize(request)).toBe(true);
  });
});

// ─── rateLimitResponse ───────────────────────────────────────────────────────

describe('rateLimitResponse', () => {
  it('returns 429 status', () => {
    const response = rateLimitResponse();
    expect(response.status).toBe(429);
  });

  it('includes Retry-After header', () => {
    const response = rateLimitResponse();
    expect(response.headers.get('Retry-After')).toBe('60');
  });

  it('body contains rate limit message', async () => {
    const response = rateLimitResponse();
    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.message).toContain('Rate limit');
  });
});

// ─── CSRF Token ──────────────────────────────────────────────────────────────

describe('generateCsrfToken / validateCsrfToken', () => {
  it('generates a 64-character hex token', () => {
    const token = generateCsrfToken();
    expect(token.length).toBe(64);
    expect(/^[0-9a-f]+$/.test(token)).toBe(true);
  });

  it('generates unique tokens each call', () => {
    const t1 = generateCsrfToken();
    const t2 = generateCsrfToken();
    expect(t1).not.toBe(t2);
  });

  it('validates matching tokens', () => {
    const token = generateCsrfToken();
    expect(validateCsrfToken(token, token)).toBe(true);
  });

  it('rejects non-matching tokens', () => {
    const t1 = generateCsrfToken();
    const t2 = generateCsrfToken();
    expect(validateCsrfToken(t1, t2)).toBe(false);
  });

  it('rejects empty tokens', () => {
    expect(validateCsrfToken('', '')).toBe(false);
    expect(validateCsrfToken('', generateCsrfToken())).toBe(false);
  });

  it('rejects tokens of different lengths', () => {
    expect(validateCsrfToken('short', generateCsrfToken())).toBe(false);
  });
});
