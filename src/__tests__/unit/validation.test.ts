/**
 * Unit Tests: lib/validation.ts
 * Tests all Zod schemas, sanitization, and validation helpers.
 */

import {
  sanitizeString,
  paginationSchema,
  loginSchema,
  changePasswordSchema,
  createUserSchema,
  createCategorySchema,
  updateCategorySchema,
  createItemSchema,
  createCustomerSchema,
  createBillSchema,
  returnBillSchema,
  cancelBillSchema,
  createPromotionSchema,
  stockMovementSchema,
  updateSettingsSchema,
  reportFilterSchema,
  uuidSchema,
  validateRequest,
  formatZodErrors,
} from '@/lib/validation';

// ─── sanitizeString ──────────────────────────────────────────────────────────

describe('sanitizeString', () => {
  it('escapes HTML special characters', () => {
    expect(sanitizeString('<script>alert("xss")</script>')).toBe(
      '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;'
    );
  });

  it('escapes ampersand', () => {
    expect(sanitizeString('Tom & Jerry')).toBe('Tom &amp; Jerry');
  });

  it('escapes single quotes', () => {
    expect(sanitizeString("it's")).toBe("it&#x27;s");
  });

  it('trims leading and trailing whitespace', () => {
    expect(sanitizeString('  hello  ')).toBe('hello');
  });

  it('handles empty string', () => {
    expect(sanitizeString('')).toBe('');
  });
});

// ─── uuidSchema ──────────────────────────────────────────────────────────────

describe('uuidSchema', () => {
  it('accepts valid UUID', () => {
    expect(uuidSchema.safeParse('550e8400-e29b-41d4-a716-446655440000').success).toBe(true);
  });

  it('rejects invalid UUID', () => {
    expect(uuidSchema.safeParse('not-a-uuid').success).toBe(false);
    expect(uuidSchema.safeParse('').success).toBe(false);
    expect(uuidSchema.safeParse('550e8400-e29b-41d4-a716').success).toBe(false);
  });
});

// ─── paginationSchema ────────────────────────────────────────────────────────

describe('paginationSchema', () => {
  it('provides sensible defaults', () => {
    const result = paginationSchema.parse({});
    expect(result.page).toBe(1);
    expect(result.limit).toBe(20);
    expect(result.sortOrder).toBe('desc');
  });

  it('coerces string numbers', () => {
    const result = paginationSchema.parse({ page: '3', limit: '50' });
    expect(result.page).toBe(3);
    expect(result.limit).toBe(50);
  });

  it('clamps limit to max 1000', () => {
    expect(() => paginationSchema.parse({ limit: '1001' })).toThrow();
  });

  it('rejects page < 1', () => {
    expect(() => paginationSchema.parse({ page: '0' })).toThrow();
  });

  it('accepts valid sort order', () => {
    const result = paginationSchema.parse({ sortOrder: 'asc' });
    expect(result.sortOrder).toBe('asc');
  });

  it('sanitizes search string', () => {
    const result = paginationSchema.parse({ search: '<script>xss</script>' });
    expect(result.search).toBe('&lt;script&gt;xss&lt;/script&gt;');
  });
});

// ─── loginSchema ─────────────────────────────────────────────────────────────

describe('loginSchema', () => {
  it('accepts valid credentials', () => {
    const result = loginSchema.safeParse({ username: 'admin', password: 'Test@12345678' });
    expect(result.success).toBe(true);
  });

  it('rejects empty username', () => {
    const result = loginSchema.safeParse({ username: '', password: 'pass' });
    expect(result.success).toBe(false);
  });

  it('rejects empty password', () => {
    const result = loginSchema.safeParse({ username: 'admin', password: '' });
    expect(result.success).toBe(false);
  });

  it('rejects password longer than 30 chars', () => {
    const result = loginSchema.safeParse({ username: 'admin', password: 'a'.repeat(31) });
    expect(result.success).toBe(false);
  });

  it('sanitizes username', () => {
    const result = loginSchema.parse({ username: '<b>admin</b>', password: 'pass123' });
    expect(result.username).toBe('&lt;b&gt;admin&lt;/b&gt;');
  });
});

// ─── changePasswordSchema ────────────────────────────────────────────────────

describe('changePasswordSchema', () => {
  it('accepts matching passwords with min length', () => {
    const result = changePasswordSchema.safeParse({
      current_password: 'OldPass@12345',
      new_password: 'NewPass@12345',
      confirm_password: 'NewPass@12345',
    });
    expect(result.success).toBe(true);
  });

  it('rejects mismatched passwords', () => {
    const result = changePasswordSchema.safeParse({
      current_password: 'OldPass@12345',
      new_password: 'NewPass@12345',
      confirm_password: 'Different@123',
    });
    expect(result.success).toBe(false);
  });

  it('rejects new password shorter than 12 chars', () => {
    const result = changePasswordSchema.safeParse({
      current_password: 'old',
      new_password: 'Short@1',
      confirm_password: 'Short@1',
    });
    expect(result.success).toBe(false);
  });
});

// ─── createUserSchema ────────────────────────────────────────────────────────

describe('createUserSchema', () => {
  const validUser = {
    username: 'johndoe',
    email: 'john@example.com',
    password: 'Secure@Pass12',
    role: 'cashier',
    first_name: 'John',
    last_name: 'Doe',
  };

  it('accepts valid user data', () => {
    const result = createUserSchema.safeParse(validUser);
    expect(result.success).toBe(true);
  });

  it('rejects invalid email formats', () => {
    expect(createUserSchema.safeParse({ ...validUser, email: 'not-email' }).success).toBe(false);
    expect(createUserSchema.safeParse({ ...validUser, email: '' }).success).toBe(false);
  });

  it('rejects invalid roles', () => {
    expect(createUserSchema.safeParse({ ...validUser, role: 'super_admin' }).success).toBe(false);
  });

  it('accepts valid roles', () => {
    for (const role of ['admin', 'cashier', 'supervisor']) {
      expect(createUserSchema.safeParse({ ...validUser, role }).success).toBe(true);
    }
  });

  it('lowercases email', () => {
    const result = createUserSchema.parse({ ...validUser, email: 'JOHN@EXAMPLE.COM' });
    expect(result.email).toBe('john@example.com');
  });

  it('rejects username shorter than 3 chars', () => {
    expect(createUserSchema.safeParse({ ...validUser, username: 'ab' }).success).toBe(false);
  });
});

// ─── createCategorySchema ────────────────────────────────────────────────────

describe('createCategorySchema / updateCategorySchema', () => {
  it('accepts valid category', () => {
    const result = createCategorySchema.safeParse({ name: 'Beverages', description: 'Drinks' });
    expect(result.success).toBe(true);
  });

  it('rejects empty name', () => {
    expect(createCategorySchema.safeParse({ name: '' }).success).toBe(false);
  });

  it('rejects description over 1000 chars', () => {
    expect(createCategorySchema.safeParse({ name: 'Test', description: 'x'.repeat(1001) }).success).toBe(false);
  });

  it('updateCategorySchema allows partial data', () => {
    expect(updateCategorySchema.safeParse({}).success).toBe(true);
    expect(updateCategorySchema.safeParse({ name: 'New Name' }).success).toBe(true);
  });
});

// ─── createItemSchema ────────────────────────────────────────────────────────

describe('createItemSchema', () => {
  const validItem = {
    plu_code: 'PLU001',
    name: 'Coca-Cola',
    category_id: '550e8400-e29b-41d4-a716-446655440000',
    price: 150,
    cost_price: 120,
  };

  it('accepts valid item', () => {
    expect(createItemSchema.safeParse(validItem).success).toBe(true);
  });

  it('provides defaults for optional fields', () => {
    const result = createItemSchema.parse(validItem);
    expect(result.unit).toBe('pcs');
    expect(result.stock_quantity).toBe(0);
    expect(result.has_discount).toBe(false);
    expect(result.discount_percentage).toBe(0);
  });

  it('rejects negative price', () => {
    expect(createItemSchema.safeParse({ ...validItem, price: -10 }).success).toBe(false);
  });

  it('rejects discount above 100%', () => {
    expect(createItemSchema.safeParse({ ...validItem, discount_percentage: 101 }).success).toBe(false);
  });

  it('rejects invalid category_id UUID', () => {
    expect(createItemSchema.safeParse({ ...validItem, category_id: 'bad-id' }).success).toBe(false);
  });

  it('coerces string numbers', () => {
    const result = createItemSchema.parse({ ...validItem, price: '200', cost_price: '150' });
    expect(result.price).toBe(200);
    expect(result.cost_price).toBe(150);
  });
});

// ─── createCustomerSchema ────────────────────────────────────────────────────

describe('createCustomerSchema', () => {
  it('accepts valid customer with all fields', () => {
    const result = createCustomerSchema.safeParse({
      name: 'Jane Doe',
      email: 'jane@example.com',
      phone: '+94771234567',
    });
    expect(result.success).toBe(true);
  });

  it('accepts customer with name only', () => {
    expect(createCustomerSchema.safeParse({ name: 'Walk-in' }).success).toBe(true);
  });

  it('rejects invalid phone number', () => {
    expect(createCustomerSchema.safeParse({ name: 'Test', phone: 'abc' }).success).toBe(false);
  });

  it('rejects invalid email', () => {
    expect(createCustomerSchema.safeParse({ name: 'Test', email: 'bad-email' }).success).toBe(false);
  });

  it('defaults loyalty_points to 0', () => {
    const result = createCustomerSchema.parse({ name: 'Test' });
    expect(result.loyalty_points).toBe(0);
  });
});

// ─── createBillSchema ────────────────────────────────────────────────────────

describe('createBillSchema', () => {
  const validBill = {
    customer_name: 'Customer',
    paid_amount: 1000,
    items: [
      { item_id: '550e8400-e29b-41d4-a716-446655440000', quantity: 2 },
    ],
  };

  it('accepts valid bill', () => {
    expect(createBillSchema.safeParse(validBill).success).toBe(true);
  });

  it('rejects bill with no items', () => {
    expect(createBillSchema.safeParse({ ...validBill, items: [] }).success).toBe(false);
  });

  it('rejects negative paid_amount', () => {
    expect(createBillSchema.safeParse({ ...validBill, paid_amount: -1 }).success).toBe(false);
  });

  it('rejects item with zero quantity', () => {
    const bill = {
      ...validBill,
      items: [{ item_id: '550e8400-e29b-41d4-a716-446655440000', quantity: 0 }],
    };
    expect(createBillSchema.safeParse(bill).success).toBe(false);
  });

  it('defaults customer_name to Customer', () => {
    const result = createBillSchema.parse({
      paid_amount: 500,
      items: [{ item_id: '550e8400-e29b-41d4-a716-446655440000', quantity: 1 }],
    });
    expect(result.customer_name).toBe('Customer');
  });

  it('defaults points_redeemed to 0', () => {
    const result = createBillSchema.parse(validBill);
    expect(result.points_redeemed).toBe(0);
  });
});

// ─── returnBillSchema / cancelBillSchema ─────────────────────────────────────

describe('returnBillSchema', () => {
  it('accepts valid return data', () => {
    const result = returnBillSchema.safeParse({
      reason: 'Defective product',
      authorizer_username: 'admin',
      authorizer_password: 'Admin@12345678',
    });
    expect(result.success).toBe(true);
  });

  it('rejects empty reason', () => {
    expect(returnBillSchema.safeParse({
      reason: '',
      authorizer_username: 'admin',
      authorizer_password: 'pass',
    }).success).toBe(false);
  });
});

describe('cancelBillSchema', () => {
  it('accepts valid cancel data', () => {
    const result = cancelBillSchema.safeParse({
      reason: 'Customer request',
      authorizer_username: 'supervisor',
      authorizer_password: 'Super@12345678',
    });
    expect(result.success).toBe(true);
  });
});

// ─── createPromotionSchema ───────────────────────────────────────────────────

describe('createPromotionSchema', () => {
  const validPromo = {
    name: 'Summer Sale',
    discount_type: 'percentage',
    discount_value: 10,
    start_date: '2026-01-01',
    end_date: '2026-12-31',
  };

  it('accepts valid promotion', () => {
    expect(createPromotionSchema.safeParse(validPromo).success).toBe(true);
  });

  it('accepts fixed discount type', () => {
    expect(createPromotionSchema.safeParse({ ...validPromo, discount_type: 'fixed' }).success).toBe(true);
  });

  it('rejects invalid discount type', () => {
    expect(createPromotionSchema.safeParse({ ...validPromo, discount_type: 'bogus' }).success).toBe(false);
  });

  it('transforms dates to Date objects', () => {
    const result = createPromotionSchema.parse(validPromo);
    expect(result.start_date).toBeInstanceOf(Date);
    expect(result.end_date).toBeInstanceOf(Date);
  });

  it('defaults is_active to true', () => {
    const result = createPromotionSchema.parse(validPromo);
    expect(result.is_active).toBe(true);
  });
});

// ─── stockMovementSchema ─────────────────────────────────────────────────────

describe('stockMovementSchema', () => {
  it('accepts valid movement', () => {
    const result = stockMovementSchema.safeParse({
      item_id: '550e8400-e29b-41d4-a716-446655440000',
      quantity: 10,
    });
    expect(result.success).toBe(true);
  });

  it('rejects zero quantity', () => {
    expect(stockMovementSchema.safeParse({
      item_id: '550e8400-e29b-41d4-a716-446655440000',
      quantity: 0,
    }).success).toBe(false);
  });

  it('rejects negative quantity', () => {
    expect(stockMovementSchema.safeParse({
      item_id: '550e8400-e29b-41d4-a716-446655440000',
      quantity: -5,
    }).success).toBe(false);
  });
});

// ─── updateSettingsSchema ────────────────────────────────────────────────────

describe('updateSettingsSchema', () => {
  it('accepts record of mixed types', () => {
    const result = updateSettingsSchema.safeParse({
      shop_name: 'My Shop',
      vat_rate: 15,
      email_enabled: true,
    });
    expect(result.success).toBe(true);
  });
});

// ─── reportFilterSchema ──────────────────────────────────────────────────────

describe('reportFilterSchema', () => {
  it('accepts all optional fields', () => {
    expect(reportFilterSchema.safeParse({}).success).toBe(true);
  });

  it('accepts valid status enum', () => {
    for (const status of ['pending', 'completed', 'returned', 'cancelled']) {
      expect(reportFilterSchema.safeParse({ status }).success).toBe(true);
    }
  });

  it('rejects invalid status', () => {
    expect(reportFilterSchema.safeParse({ status: 'invalid' }).success).toBe(false);
  });
});

// ─── validateRequest ─────────────────────────────────────────────────────────

describe('validateRequest', () => {
  it('returns success with parsed data on valid input', () => {
    const result = validateRequest(loginSchema, { username: 'admin', password: 'test123' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.username).toBeDefined();
    }
  });

  it('returns failure with ZodError on invalid input', () => {
    const result = validateRequest(loginSchema, { username: '', password: '' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors).toBeDefined();
    }
  });
});

// ─── formatZodErrors ─────────────────────────────────────────────────────────

describe('formatZodErrors', () => {
  it('groups errors by path', () => {
    const result = loginSchema.safeParse({ username: '', password: '' });
    if (!result.success) {
      const formatted = formatZodErrors(result.error);
      expect(typeof formatted).toBe('object');
      // Should have at least one path key
      expect(Object.keys(formatted).length).toBeGreaterThan(0);
    }
  });
});
