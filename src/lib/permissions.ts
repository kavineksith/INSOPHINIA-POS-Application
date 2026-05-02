/**
 * Role-Based Access Control (RBAC) Permissions Matrix
 * Defines what each role can do across the system.
 */

export type Permission =
    | 'view:dashboard'
    | 'view:items' | 'manage:items'
    | 'view:categories' | 'manage:categories'
    | 'view:inventory' | 'manage:inventory'
    | 'view:promotions' | 'manage:promotions'
    | 'view:customers' | 'manage:customers'
    | 'view:billing' | 'manage:billing'
    | 'view:reports' | 'export:reports'
    | 'view:users' | 'manage:users'
    | 'view:settings' | 'manage:settings'
    | 'view:security' | 'manage:security'
    | 'view:logs'
    | 'authorize:returns'
    | 'authorize:loyalty'
    | 'manage:system_lock';

export const ROLE_PERMISSIONS: Record<string, Permission[]> = {
    master_admin: [
        'view:dashboard',
        'view:items', 'manage:items',
        'view:categories', 'manage:categories',
        'view:inventory', 'manage:inventory',
        'view:promotions', 'manage:promotions',
        'view:customers', 'manage:customers',
        'view:billing', 'manage:billing',
        'view:reports', 'export:reports',
        'view:users', 'manage:users',
        'view:settings', 'manage:settings',
        'view:security', 'manage:security',
        'view:logs',
        'authorize:returns',
        'authorize:loyalty',
        'manage:system_lock'
    ],
    admin: [
        'view:dashboard',
        'view:items', 'manage:items',
        'view:categories', 'manage:categories',
        'view:inventory', 'manage:inventory',
        'view:promotions', 'manage:promotions',
        'view:customers', 'manage:customers',
        'view:billing', 'manage:billing',
        'view:reports', 'export:reports',
        'view:users', 'manage:users',
        'view:settings', 'manage:settings',
        'view:security', 'manage:security',
        'view:logs',
        'authorize:returns',
        'authorize:loyalty'
    ],
    supervisor: [
        'view:dashboard',
        'view:items', 'manage:items',
        'view:categories', 'manage:categories',
        'view:inventory', 'manage:inventory',
        'view:promotions', 'manage:promotions',
        'view:customers', 'manage:customers',
        'view:billing', 'manage:billing',
        'view:reports', 'export:reports',
        'authorize:returns',
        'authorize:loyalty'
    ],
    cashier: [
        'view:dashboard',
        'view:items',
        'view:categories',
        'view:inventory',
        'view:customers', 'manage:customers',
        'view:billing', 'manage:billing'
    ]
};

/**
 * Checks if a specific role has a specific permission
 */
export function hasPermission(role: string, permission: Permission): boolean {
    const permissions = ROLE_PERMISSIONS[role] || [];
    return permissions.includes(permission);
}

/**
 * Checks if a role has all of the required permissions
 */
export function hasAllPermissions(role: string, requiredPermissions: Permission[]): boolean {
    return requiredPermissions.every(p => hasPermission(role, p));
}

/**
 * Checks if a role has any of the listed permissions
 */
export function hasAnyPermission(role: string, requiredPermissions: Permission[]): boolean {
    return requiredPermissions.some(p => hasPermission(role, p));
}
