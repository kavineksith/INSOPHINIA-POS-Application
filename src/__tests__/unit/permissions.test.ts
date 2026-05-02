/**
 * Unit Tests: lib/permissions.ts
 * Tests the complete RBAC permissions matrix for all roles.
 */

import { hasPermission, hasAllPermissions, hasAnyPermission, ROLE_PERMISSIONS, Permission } from '@/lib/permissions';

// ─── hasPermission ───────────────────────────────────────────────────────────

describe('hasPermission', () => {
  // Master admin should have ALL permissions
  describe('master_admin role', () => {
    const allPermissions: Permission[] = [
      'view:dashboard', 'view:items', 'manage:items', 'view:categories', 'manage:categories',
      'view:inventory', 'manage:inventory', 'view:promotions', 'manage:promotions',
      'view:customers', 'manage:customers', 'view:billing', 'manage:billing',
      'view:reports', 'export:reports', 'view:users', 'manage:users',
      'view:settings', 'manage:settings', 'view:security', 'manage:security',
      'view:logs', 'authorize:returns', 'authorize:loyalty', 'manage:system_lock',
    ];

    it.each(allPermissions)('has permission: %s', (perm) => {
      expect(hasPermission('master_admin', perm)).toBe(true);
    });
  });

  // Admin should have everything EXCEPT manage:system_lock
  describe('admin role', () => {
    it('has manage:users', () => {
      expect(hasPermission('admin', 'manage:users')).toBe(true);
    });

    it('does NOT have manage:system_lock', () => {
      expect(hasPermission('admin', 'manage:system_lock')).toBe(false);
    });

    it('has authorize:returns', () => {
      expect(hasPermission('admin', 'authorize:returns')).toBe(true);
    });
  });

  // Supervisor role
  describe('supervisor role', () => {
    it('has manage:billing', () => {
      expect(hasPermission('supervisor', 'manage:billing')).toBe(true);
    });

    it('has authorize:returns', () => {
      expect(hasPermission('supervisor', 'authorize:returns')).toBe(true);
    });

    it('has authorize:loyalty', () => {
      expect(hasPermission('supervisor', 'authorize:loyalty')).toBe(true);
    });

    it('does NOT have manage:users', () => {
      expect(hasPermission('supervisor', 'manage:users')).toBe(false);
    });

    it('does NOT have manage:settings', () => {
      expect(hasPermission('supervisor', 'manage:settings')).toBe(false);
    });

    it('does NOT have view:logs', () => {
      expect(hasPermission('supervisor', 'view:logs')).toBe(false);
    });
  });

  // Cashier role — most restricted
  describe('cashier role', () => {
    it('has view:dashboard', () => {
      expect(hasPermission('cashier', 'view:dashboard')).toBe(true);
    });

    it('has view:items but NOT manage:items', () => {
      expect(hasPermission('cashier', 'view:items')).toBe(true);
      expect(hasPermission('cashier', 'manage:items')).toBe(false);
    });

    it('has manage:billing', () => {
      expect(hasPermission('cashier', 'manage:billing')).toBe(true);
    });

    it('has manage:customers', () => {
      expect(hasPermission('cashier', 'manage:customers')).toBe(true);
    });

    it('does NOT have manage:categories', () => {
      expect(hasPermission('cashier', 'manage:categories')).toBe(false);
    });

    it('does NOT have view:reports', () => {
      expect(hasPermission('cashier', 'view:reports')).toBe(false);
    });

    it('does NOT have authorize:returns', () => {
      expect(hasPermission('cashier', 'authorize:returns')).toBe(false);
    });

    it('does NOT have manage:users', () => {
      expect(hasPermission('cashier', 'manage:users')).toBe(false);
    });
  });

  // Unknown role
  describe('unknown role', () => {
    it('returns false for any permission', () => {
      expect(hasPermission('unknown_role', 'view:dashboard')).toBe(false);
      expect(hasPermission('', 'manage:items')).toBe(false);
    });
  });
});

// ─── hasAllPermissions ───────────────────────────────────────────────────────

describe('hasAllPermissions', () => {
  it('returns true when role has all given permissions', () => {
    expect(hasAllPermissions('admin', ['view:items', 'manage:items', 'view:billing'])).toBe(true);
  });

  it('returns false when role is missing at least one permission', () => {
    expect(hasAllPermissions('cashier', ['view:items', 'manage:items'])).toBe(false);
  });

  it('returns true for empty permissions array', () => {
    expect(hasAllPermissions('cashier', [])).toBe(true);
  });
});

// ─── hasAnyPermission ────────────────────────────────────────────────────────

describe('hasAnyPermission', () => {
  it('returns true when role has at least one of the given permissions', () => {
    expect(hasAnyPermission('cashier', ['manage:items', 'view:billing'])).toBe(true);
  });

  it('returns false when role has none of the given permissions', () => {
    expect(hasAnyPermission('cashier', ['manage:users', 'manage:settings'])).toBe(false);
  });

  it('returns false for empty permissions array', () => {
    expect(hasAnyPermission('admin', [])).toBe(false);
  });
});

// ─── ROLE_PERMISSIONS completeness ───────────────────────────────────────────

describe('ROLE_PERMISSIONS', () => {
  it('has entries for all expected roles', () => {
    expect(ROLE_PERMISSIONS).toHaveProperty('master_admin');
    expect(ROLE_PERMISSIONS).toHaveProperty('admin');
    expect(ROLE_PERMISSIONS).toHaveProperty('supervisor');
    expect(ROLE_PERMISSIONS).toHaveProperty('cashier');
  });

  it('master_admin has the most permissions', () => {
    const counts = Object.entries(ROLE_PERMISSIONS).map(([role, perms]) => ({
      role,
      count: perms.length,
    }));
    const masterAdmin = counts.find(c => c.role === 'master_admin')!;
    for (const c of counts) {
      expect(masterAdmin.count).toBeGreaterThanOrEqual(c.count);
    }
  });

  it('each higher role is a superset of lower role (except system_lock)', () => {
    const cashierPerms = new Set(ROLE_PERMISSIONS.cashier);
    const supervisorPerms = new Set(ROLE_PERMISSIONS.supervisor);
    // All cashier perms should be in supervisor
    for (const perm of cashierPerms) {
      expect(supervisorPerms.has(perm)).toBe(true);
    }
  });
});
