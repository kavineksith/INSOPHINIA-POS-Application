import { z } from 'zod';

// --- Sanitization (OWASP A03, A08) ---

export function sanitizeString(input: string): string {
    return input
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;')
        .trim();
}

// --- Regular Expressions ---
const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
// More robust phone regex: optional +, then 7-15 digits with optional separators
const phoneRegex = /^\+?(\d{1,4})?[-. ]?\(?\d{1,4}?\)?[-. ]?\d{1,4}[-. ]?\d{1,9}$/;
const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// --- Common Validators ---

export const uuidSchema = z.string().regex(uuidRegex, 'Invalid UUID format');

export const paginationSchema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(1000).default(20),
    search: z.string().transform(sanitizeString).optional(),
    sortBy: z.string().optional(),
    sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

// --- Auth Schemas ---

export const loginSchema = z.object({
    username: z.string().min(1, 'Username is required').max(100).transform(sanitizeString),
    password: z.string().min(1, 'Password is required').max(30),
});

export const changePasswordSchema = z.object({
    current_password: z.string().min(1, 'Current password is required'),
    new_password: z.string().min(12, 'Password must be 12-30 characters').max(30),
    confirm_password: z.string().min(1, 'Confirm password is required'),
}).refine(data => data.new_password === data.confirm_password, {
    message: 'Passwords do not match',
    path: ['confirm_password'],
});

// --- User Schemas ---

export const createUserSchema = z.object({
    username: z.string().min(3).max(100).transform(sanitizeString),
    email: z.string().regex(emailRegex, 'Invalid email format').max(255).transform(s => s.toLowerCase().trim()),
    password: z.string().min(12, 'Password must be 12-30 characters').max(30),
    role: z.enum(['admin', 'cashier', 'supervisor']),
    first_name: z.string().min(1).max(100).transform(sanitizeString),
    last_name: z.string().min(1).max(100).transform(sanitizeString),
});

export const updateUserSchema = z.object({
    username: z.string().min(3).max(100).transform(sanitizeString).optional(),
    email: z.string().regex(emailRegex, 'Invalid email format').max(255).transform(s => s.toLowerCase().trim()).optional(),
    role: z.enum(['admin', 'cashier', 'supervisor']).optional(),
    first_name: z.string().min(1).max(100).transform(sanitizeString).optional(),
    last_name: z.string().min(1).max(100).transform(sanitizeString).optional(),
    is_active: z.boolean().optional(),
    locked_until: z.string().datetime().nullable().optional(),
});

// --- Category Schemas ---

export const createCategorySchema = z.object({
    name: z.string().min(1).max(255).transform(sanitizeString),
    description: z.string().max(1000).transform(sanitizeString).optional(),
});

export const updateCategorySchema = createCategorySchema.partial();

// --- Item Schemas ---

export const createItemSchema = z.object({
    plu_code: z.string().min(1).max(50).transform(sanitizeString),
    name: z.string().min(1).max(255).transform(sanitizeString),
    description: z.string().max(1000).transform(sanitizeString).optional(),
    category_id: uuidSchema,
    barcode: z.string().max(100).transform(sanitizeString).optional().nullable(),
    qr_code: z.string().max(100).transform(sanitizeString).optional().nullable(),
    price: z.coerce.number().min(0),
    cost_price: z.coerce.number().min(0),
    unit: z.string().min(1).max(50).default('pcs'),
    stock_quantity: z.coerce.number().min(0).default(0),
    low_stock_threshold: z.coerce.number().min(0).default(10),
    has_discount: z.boolean().default(false),
    discount_percentage: z.coerce.number().min(0).max(100).default(0),
});

export const updateItemSchema = createItemSchema.partial();

// --- Customer Schemas ---

export const createCustomerSchema = z.object({
    name: z.string().min(1).max(255).transform(sanitizeString),
    email: z.string().regex(emailRegex, 'Invalid email format').max(255).transform(s => s.toLowerCase().trim()).optional().nullable(),
    phone: z.string().regex(phoneRegex, 'Invalid phone number format').optional().nullable(),
    loyalty_points: z.coerce.number().int().min(0).default(0),
});

export const updateCustomerSchema = createCustomerSchema.partial();

// --- Bill Schemas ---

export const createBillSchema = z.object({
    customer_id: uuidSchema.optional().nullable(),
    customer_name: z.string().min(1).max(255).transform(sanitizeString).default('Customer'),
    customer_email: z.string().regex(emailRegex, 'Invalid email format').max(255).optional().nullable(),
    customer_phone: z.string().regex(phoneRegex, 'Invalid phone number format').optional().nullable(),
    points_redeemed: z.coerce.number().int().min(0).optional().default(0),
    authorizer_username: z.string().optional().nullable(),
    authorizer_password: z.string().optional().nullable(),
    paid_amount: z.coerce.number().min(0),
    remarks: z.string().max(1000).transform(sanitizeString).optional().nullable(),
    items: z.array(z.object({
        item_id: uuidSchema,
        quantity: z.coerce.number().min(0.001),
        unit: z.string().optional(),
    })).min(1, 'At least one item is required'),
});

export const returnBillSchema = z.object({
    reason: z.string().min(1, 'Return reason is required').max(1000).transform(sanitizeString),
    authorizer_username: z.string().min(1, 'Authorizer username is required').transform(sanitizeString),
    authorizer_password: z.string().min(1, 'Authorizer password is required'),
});

export const cancelBillSchema = z.object({
    reason: z.string().min(1, 'Cancellation reason is required').max(1000).transform(sanitizeString),
    authorizer_username: z.string().min(1, 'Authorizer username is required').transform(sanitizeString),
    authorizer_password: z.string().min(1, 'Authorizer password is required'),
});

// --- Promotion Schemas ---

export const createPromotionSchema = z.object({
    name: z.string().min(1).max(255).transform(sanitizeString),
    description: z.string().max(1000).transform(sanitizeString).optional(),
    item_id: uuidSchema.optional().nullable(),
    category_id: uuidSchema.optional().nullable(),
    discount_type: z.enum(['percentage', 'fixed']),
    discount_value: z.coerce.number().min(0),
    start_date: z.string().transform(s => new Date(s)),
    end_date: z.string().transform(s => new Date(s)),
    is_active: z.boolean().default(true),
});

export const updatePromotionSchema = createPromotionSchema.partial();

// --- Inventory Schemas ---

export const stockMovementSchema = z.object({
    item_id: uuidSchema,
    quantity: z.coerce.number().min(0.001, 'Quantity must be greater than 0'),
    notes: z.string().max(1000).transform(sanitizeString).optional(),
});

// --- Settings Schema ---

export const updateSettingsSchema = z.record(z.string(), z.union([z.string(), z.number(), z.boolean()]));

// --- Report Filters ---

export const reportFilterSchema = z.object({
    start_date: z.string().optional(),
    end_date: z.string().optional(),
    staff_id: uuidSchema.optional(),
    status: z.enum(['pending', 'completed', 'returned', 'cancelled']).optional(),
});

// --- Validation Helper ---

export function validateRequest<T>(schema: z.ZodSchema<T>, data: unknown): { success: true; data: T } | { success: false; errors: z.ZodError } {
    const result = schema.safeParse(data);
    if (result.success) {
        return { success: true, data: result.data };
    }
    return { success: false, errors: result.error };
}

export function formatZodErrors(error: z.ZodError): Record<string, string[]> {
    const formatted: Record<string, string[]> = {};
    for (const issue of error.issues) {
        const path = issue.path.join('.');
        if (!formatted[path]) formatted[path] = [];
        formatted[path].push(issue.message);
    }
    return formatted;
}
