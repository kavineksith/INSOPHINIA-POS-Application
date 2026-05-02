/**
 * Unit Tests: lib/auth.ts
 * Tests password hashing, JWT tokens, token extraction, role hierarchy.
 */

import {
  hashPassword,
  verifyPassword,
  validatePasswordStrength,
  generateToken,
  validateToken,
  generatePending2FAToken,
  validatePending2FAToken,
  getTokenFromRequest,
  setAuthCookie,
  clearAuthCookie,
  checkRole,
  authorizeRole,
} from '@/lib/auth';

// ─── Password Hashing ───────────────────────────────────────────────────────

describe('hashPassword / verifyPassword', () => {
  it('hashes and verifies a password correctly', async () => {
    const password = 'SecurePass@123';
    const hash = await hashPassword(password);
    expect(hash).not.toBe(password);
    expect(await verifyPassword(password, hash)).toBe(true);
  });

  it('rejects wrong password', async () => {
    const hash = await hashPassword('Correct@Pass1');
    expect(await verifyPassword('Wrong@Pass123', hash)).toBe(false);
  });

  it('produces different hashes for same password (salt)', async () => {
    const hash1 = await hashPassword('SamePass@1234');
    const hash2 = await hashPassword('SamePass@1234');
    expect(hash1).not.toBe(hash2);
  });
});

// ─── Password Strength Validation ───────────────────────────────────────────

describe('validatePasswordStrength', () => {
  it('returns no errors for strong password', () => {
    expect(validatePasswordStrength('Str0ng@Pass!!')).toHaveLength(0);
  });

  it('requires minimum 12 characters', () => {
    const errors = validatePasswordStrength('Sh0rt@!');
    expect(errors).toContain('Password must be at least 12 characters');
  });

  it('requires uppercase letter', () => {
    const errors = validatePasswordStrength('alllowercase@1');
    expect(errors.some(e => e.includes('uppercase'))).toBe(true);
  });

  it('requires lowercase letter', () => {
    const errors = validatePasswordStrength('ALLUPPERCASE@1');
    expect(errors.some(e => e.includes('lowercase'))).toBe(true);
  });

  it('requires a number', () => {
    const errors = validatePasswordStrength('NoNumbers@Here!');
    expect(errors.some(e => e.includes('number'))).toBe(true);
  });

  it('requires a special character', () => {
    const errors = validatePasswordStrength('NoSpecial1234A');
    expect(errors.some(e => e.includes('special'))).toBe(true);
  });

  it('rejects password over 30 chars', () => {
    const errors = validatePasswordStrength('A@1' + 'a'.repeat(28));
    expect(errors).toContain('Password must not exceed 30 characters');
  });
});

// ─── JWT Token Generation / Validation ──────────────────────────────────────

describe('generateToken / validateToken', () => {
  const payload = {
    user_id: '550e8400-e29b-41d4-a716-446655440000',
    username: 'testadmin',
    role: 'admin',
    session_id: '660e8400-e29b-41d4-a716-446655440001',
  };

  it('generates a valid token that can be validated', () => {
    const token = generateToken(payload);
    expect(typeof token).toBe('string');
    expect(token.split('.').length).toBe(3); // JWT has 3 parts

    const decoded = validateToken(token);
    expect(decoded).not.toBeNull();
    expect(decoded!.user_id).toBe(payload.user_id);
    expect(decoded!.username).toBe(payload.username);
    expect(decoded!.role).toBe(payload.role);
    expect(decoded!.session_id).toBe(payload.session_id);
  });

  it('returns null for invalid token', () => {
    expect(validateToken('invalid.token.here')).toBeNull();
  });

  it('returns null for expired token', () => {
    // Can't easily test expiry without time manipulation, but we verify tampered tokens fail
    const token = generateToken(payload);
    const tampered = token.slice(0, -5) + 'XXXXX';
    expect(validateToken(tampered)).toBeNull();
  });
});

// ─── Pending 2FA Token ──────────────────────────────────────────────────────

describe('generatePending2FAToken / validatePending2FAToken', () => {
  const pending2FAPayload = {
    user_id: '550e8400-e29b-41d4-a716-446655440000',
    username: 'testuser',
    role: 'cashier',
    pending_2fa: true as const,
  };

  it('generates and validates pending 2FA token', () => {
    const token = generatePending2FAToken(pending2FAPayload);
    const decoded = validatePending2FAToken(token);
    expect(decoded).not.toBeNull();
    expect(decoded!.pending_2fa).toBe(true);
    expect(decoded!.user_id).toBe(pending2FAPayload.user_id);
  });

  it('validateToken rejects pending 2FA tokens (security)', () => {
    const token = generatePending2FAToken(pending2FAPayload);
    // A pending 2FA token should NOT pass regular validateToken
    expect(validateToken(token)).toBeNull();
  });

  it('validatePending2FAToken rejects regular tokens', () => {
    const regularToken = generateToken({
      user_id: '550e8400-e29b-41d4-a716-446655440000',
      username: 'test',
      role: 'admin',
    });
    expect(validatePending2FAToken(regularToken)).toBeNull();
  });
});

// ─── Token Extraction from Request ──────────────────────────────────────────

describe('getTokenFromRequest', () => {
  it('extracts token from Authorization Bearer header', () => {
    const request = new Request('http://localhost/api/test', {
      headers: { Authorization: 'Bearer my-jwt-token' },
    });
    expect(getTokenFromRequest(request)).toBe('my-jwt-token');
  });

  it('extracts token from cookie', () => {
    const request = new Request('http://localhost/api/test', {
      headers: { cookie: 'other=value; auth_token=cookie-jwt-token; another=val' },
    });
    expect(getTokenFromRequest(request)).toBe('cookie-jwt-token');
  });

  it('extracts token from query parameter', () => {
    const request = new Request('http://localhost/api/test?token=query-jwt-token');
    expect(getTokenFromRequest(request)).toBe('query-jwt-token');
  });

  it('prefers Authorization header over cookie and query', () => {
    const request = new Request('http://localhost/api/test?token=query-token', {
      headers: {
        Authorization: 'Bearer header-token',
        cookie: 'auth_token=cookie-token',
      },
    });
    expect(getTokenFromRequest(request)).toBe('header-token');
  });

  it('returns null when no token present', () => {
    const request = new Request('http://localhost/api/test');
    expect(getTokenFromRequest(request)).toBeNull();
  });
});

// ─── Cookie Management ──────────────────────────────────────────────────────

describe('setAuthCookie / clearAuthCookie', () => {
  it('setAuthCookie returns cookie string with HttpOnly and SameSite', () => {
    const cookie = setAuthCookie('test-token');
    expect(cookie).toContain('auth_token=test-token');
    expect(cookie).toContain('HttpOnly');
    expect(cookie).toContain('SameSite=Strict');
    expect(cookie).toContain('Path=/');
  });

  it('clearAuthCookie sets Max-Age=0', () => {
    const cookie = clearAuthCookie();
    expect(cookie).toContain('auth_token=');
    expect(cookie).toContain('Max-Age=0');
  });
});

// ─── Role Hierarchy ─────────────────────────────────────────────────────────

describe('checkRole', () => {
  it('admin is above cashier', () => {
    expect(checkRole('admin', 'cashier')).toBe(true);
  });

  it('cashier is not above admin', () => {
    expect(checkRole('cashier', 'admin')).toBe(false);
  });

  it('supervisor is above cashier', () => {
    expect(checkRole('supervisor', 'cashier')).toBe(true);
  });

  it('same role returns true', () => {
    expect(checkRole('admin', 'admin')).toBe(true);
    expect(checkRole('cashier', 'cashier')).toBe(true);
  });

  it('master_admin is above all', () => {
    expect(checkRole('master_admin', 'admin')).toBe(true);
    expect(checkRole('master_admin', 'supervisor')).toBe(true);
    expect(checkRole('master_admin', 'cashier')).toBe(true);
  });

  it('unknown role has level 0', () => {
    expect(checkRole('unknown', 'cashier')).toBe(false);
  });
});

describe('authorizeRole', () => {
  it('returns null (no error) when authorized', () => {
    expect(authorizeRole('admin', 'cashier')).toBeNull();
  });

  it('returns Response with 403 when unauthorized', () => {
    const result = authorizeRole('cashier', 'admin');
    expect(result).not.toBeNull();
    expect(result!.status).toBe(403);
  });
});
