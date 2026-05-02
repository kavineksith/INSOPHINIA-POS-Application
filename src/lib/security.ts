import crypto from 'crypto';
import prisma from './db';
import { generateCsrfToken, validateCsrfToken } from './csrf';

export { generateCsrfToken, validateCsrfToken };
export type SecurityEventType =
    | 'LOGIN_SUCCESS'
    | 'LOGIN_FAILED'
    | 'LOGIN_LOCKED'
    | 'LOGOUT'
    | 'TWO_FACTOR_ENABLED'
    | 'TWO_FACTOR_DISABLED'
    | 'TWO_FACTOR_VERIFIED'
    | 'TWO_FACTOR_FAILED'
    | 'TWO_FACTOR_BACKUP_USED'
    | 'SESSION_REVOKED'
    | 'ALL_SESSIONS_REVOKED'
    | 'PASSWORD_CHANGED'
    | 'PASSWORD_RESET'
    | 'ACCOUNT_LOCKED'
    | 'ACCOUNT_UNLOCKED'
    | 'BRUTE_FORCE_DETECTED'
    | 'SUSPICIOUS_ACTIVITY'
    | 'NEW_DEVICE_LOGIN'
    | 'SESSION_EXPIRED'
    | 'IP_MISMATCH_REVOCATION';

export type SecuritySeverity = 'low' | 'medium' | 'high' | 'critical';

// --- Rate Limiting (OWASP A04) ---
// In-memory rate limiter for API routes

// In-memory component removed for distributed Prisma approach

const RATE_LIMIT_MAX = parseInt(process.env.RATE_LIMIT_MAX || '100', 10);
const RATE_LIMIT_WINDOW = parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10);

// Per-endpoint rate limit configs
const ENDPOINT_LIMITS: Record<string, { max: number; window: number }> = {
    'login': { max: 5, window: 15 * 60 * 1000 },       // 5 attempts / 15 min
    '2fa_verify': { max: 5, window: 5 * 60 * 1000 },   // 5 attempts / 5 min
    '2fa_setup': { max: 3, window: 10 * 60 * 1000 },   // 3 attempts / 10 min
    'password_change': { max: 3, window: 15 * 60 * 1000 }, // 3 attempts / 15 min
};

export async function checkRateLimit(
    identifier: string,
    endpoint?: string
): Promise<{ allowed: boolean; remaining: number; resetTime: number }> {
    const now = Date.now();
    const config = endpoint ? ENDPOINT_LIMITS[endpoint] : undefined;
    const maxAttempts = config?.max || RATE_LIMIT_MAX;
    const windowMs = config?.window || RATE_LIMIT_WINDOW;

    try {
        let eventTypeToCount = 'SUSPICIOUS_ACTIVITY';
        
        if (endpoint === 'login') eventTypeToCount = 'LOGIN_FAILED';
        if (endpoint === '2fa_verify') eventTypeToCount = 'TWO_FACTOR_FAILED';
        
        // Count failed attempts from this IP within the time window
        const failures = await prisma.securityEvent.count({
            where: {
                ipAddress: identifier,
                eventType: eventTypeToCount,
                createdAt: { gte: new Date(now - windowMs) }
            }
        });

        if (failures >= maxAttempts) {
            return { allowed: false, remaining: 0, resetTime: now + windowMs };
        }

        return { allowed: true, remaining: maxAttempts - failures - 1, resetTime: now + windowMs };
    } catch (e) {
        // Fallback to allow if DB fails (prevent lockouts during outages)
        return { allowed: true, remaining: 1, resetTime: now + windowMs };
    }
}

export function rateLimitResponse(): Response {
    return Response.json(
        { success: false, message: 'Rate limit exceeded. Please try again later.' },
        { status: 429, headers: { 'Retry-After': '60' } }
    );
}

// --- Database Cleanup Job ---
// Call this periodically (e.g., via cron or a background worker)
export async function cleanupOldSecurityEvents(daysToKeep: number = 30): Promise<void> {
    try {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

        // Delete high-volume rate limiting events (like failed logins) older than the cutoff
        const deleted = await prisma.securityEvent.deleteMany({
            where: {
                createdAt: { lt: cutoffDate }
            }
        });
        
        console.log(`[Security] Cleaned up ${deleted.count} old security events (older than ${daysToKeep} days)`);
    } catch (error) {
        console.error('[Security] Failed to run cleanup job:', error);
    }
}

// --- Security Headers (OWASP A05) ---

export function getSecurityHeaders(): Record<string, string> {
    return {
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'X-XSS-Protection': '1; mode=block',
        'Referrer-Policy': 'strict-origin-when-cross-origin',
        'Permissions-Policy': 'camera=(self), microphone=(), geolocation=()',
        'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
        'Cross-Origin-Opener-Policy': 'same-origin',
        'Cross-Origin-Resource-Policy': 'same-origin',
        'Content-Security-Policy': [
            "default-src 'self'",
            "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
            "font-src 'self' https://fonts.gstatic.com",
            "img-src 'self' data: blob:",
            "connect-src 'self'",
            "frame-ancestors 'none'",
            "base-uri 'self'",
            "form-action 'self'",
        ].join('; '),
    };
}

// --- CSRF Protection (moved to csrf.ts for Edge compatibility) ---

// --- Audit Logging (OWASP A09) — via MongoDB ---

export async function auditLog(params: {
    userId?: string;
    action: string;
    entity: string;
    entityId?: string;
    details?: string;
    ipAddress?: string;
    userAgent?: string;
}): Promise<void> {
    try {
        await prisma.auditLog.create({
            data: {
                userId: params.userId || null,
                action: params.action,
                entity: params.entity,
                entityId: params.entityId || null,
                details: params.details || null,
                ipAddress: params.ipAddress || null,
                userAgent: params.userAgent || null,
            }
        });
    } catch (error) {
        console.error('Audit log error:', error);
    }
}

// --- Security Event Logging ---

export async function logSecurityEvent(params: {
    userId?: string;
    eventType: SecurityEventType;
    ipAddress: string;
    userAgent?: string;
    details?: string;
    severity?: SecuritySeverity;
}): Promise<void> {
    try {
        await prisma.securityEvent.create({
            data: {
                userId: params.userId || null,
                eventType: params.eventType,
                ipAddress: params.ipAddress,
                userAgent: params.userAgent || '',
                details: params.details || null,
                severity: params.severity || 'low',
            }
        });
    } catch (error) {
        console.error('Security event log error:', error);
    }
}

// --- IP Address Extraction ---

export function getClientIp(request: Request): string {
    const forwarded = request.headers.get('x-forwarded-for');
    if (forwarded) {
        return forwarded.split(',')[0].trim();
    }
    return request.headers.get('x-real-ip') || '127.0.0.1';
}

// --- Content Type Validation (OWASP A08) ---

export function validateContentType(request: Request, expected: string = 'application/json'): boolean {
    const contentType = request.headers.get('content-type');
    return contentType?.includes(expected) ?? false;
}

// --- Request Body Size Validation ---

const MAX_BODY_SIZE = parseInt(process.env.MAX_REQUEST_BODY_SIZE || '1048576', 10); // 1MB default

export async function validateBodySize(request: Request): Promise<boolean> {
    const contentLength = request.headers.get('content-length');
    if (contentLength && parseInt(contentLength, 10) > MAX_BODY_SIZE) {
        return false;
    }
    return true;
}
