// API route helper - centralizes auth + rate limiting + error handling + system lockout

import { NextRequest } from 'next/server';
import { authenticateRequest, authorizeRole, JwtPayload } from './auth';
import { checkRateLimit, rateLimitResponse, getClientIp, auditLog, validateBodySize } from './security';
import { Permission, hasPermission } from './permissions';
import prisma from './db';

type RouteHandler = (
    request: NextRequest,
    context: { params: Promise<Record<string, string>>; user: JwtPayload; token: string }
) => Promise<Response>;

interface RouteOptions {
    requiredRole?: string;
    requiredPermission?: Permission;
    rateLimit?: boolean;
    auditAction?: string;
    auditEntity?: string;
    skipLockCheck?: boolean; // Allow system routes to bypass lock check
}

// Check system lock state + deadman switch
async function checkSystemLock(): Promise<{ locked: boolean; reason: string }> {
    try {
        const state = await (prisma as any).systemState.findFirst();
        if (!state) return { locked: false, reason: '' };

        // Check manual lock
        if (state.isLocked) {
            return { locked: true, reason: state.lockReason || 'System has been locked by administrator' };
        }

        // Check deadman switch
        const daysSinceCheckin = Math.floor(
            (Date.now() - new Date(state.lastCheckinAt).getTime()) / (1000 * 60 * 60 * 24)
        );
        if (daysSinceCheckin >= state.deadmanDays) {
            // Auto-lock
            await (prisma as any).systemState.update({
                where: { id: state.id },
                data: {
                    isLocked: true,
                    lockReason: `Deadman switch triggered: No master check-in for ${daysSinceCheckin} days (limit: ${state.deadmanDays})`,
                    lockedAt: new Date(),
                }
            });
            return { locked: true, reason: `System auto-locked: No master check-in for ${daysSinceCheckin} days` };
        }

        return { locked: false, reason: '' };
    } catch {
        // If table doesn't exist yet, don't block
        return { locked: false, reason: '' };
    }
}

export function protectedRoute(handler: RouteHandler, options: RouteOptions = {}) {
    return async (request: NextRequest, context: { params: Promise<Record<string, string>> }) => {
        try {
            // Request body size check
            const bodyValid = await validateBodySize(request);
            if (!bodyValid) {
                return Response.json(
                    { success: false, message: 'Request body too large' },
                    { status: 413 }
                );
            }

            // Rate limiting (OWASP A04)
            if (options.rateLimit !== false) {
                const clientIp = getClientIp(request);
                const rateLimitResult = await checkRateLimit(clientIp);
                if (!rateLimitResult.allowed) {
                    return rateLimitResponse();
                }
            }

            // Authentication (OWASP A01)
            const authResult = await authenticateRequest(request);
            if (!authResult.authenticated) {
                return authResult.response;
            }

            // System lockout check (after auth so we know the user's role)
            if (!options.skipLockCheck) {
                const lockState = await checkSystemLock();
                if (lockState.locked && authResult.user.role !== 'master_admin') {
                    return Response.json(
                        { success: false, message: lockState.reason, systemLocked: true },
                        { status: 503 }
                    );
                }
            }

            // Role authorization
            if (options.requiredRole) {
                const roleError = authorizeRole(authResult.user.role, options.requiredRole);
                if (roleError) return roleError;
            }

            // Permission authorization (OWASP A01)
            if (options.requiredPermission) {
                if (!hasPermission(authResult.user.role, options.requiredPermission)) {
                    return Response.json(
                        { success: false, message: 'Forbidden: Insufficient permissions for this action' },
                        { status: 403 }
                    );
                }
            }

            const response = await handler(request, {
                params: context.params,
                user: authResult.user,
                token: authResult.token,
            });

            // Apply rotated cookie if present
            if (authResult.newCookie) {
                response.headers.append('Set-Cookie', authResult.newCookie);
            }

            // Audit logging for write operations (OWASP A09)
            if (options.auditAction && ['POST', 'PUT', 'DELETE', 'PATCH'].includes(request.method)) {
                await auditLog({
                    userId: authResult.user.user_id,
                    action: options.auditAction,
                    entity: options.auditEntity || 'unknown',
                    ipAddress: getClientIp(request),
                    userAgent: request.headers.get('user-agent') || undefined,
                });
            }

            return response;
        } catch (error) {
            console.error('Route error:', error);

            // Handle Prisma specific errors gracefully
            // @ts-expect-error - Prisma type may not be available during initial build
            if (error?.code && typeof error.code === 'string' && error.code.startsWith('P2')) {
                // @ts-expect-error
                if (error.code === 'P2002') {
                    return Response.json({ success: false, message: 'A record with this data already exists (Duplicate entry)' }, { status: 409 });
                }
                // @ts-expect-error
                if (error.code === 'P2025') {
                    return Response.json({ success: false, message: 'Record not found to update or delete' }, { status: 404 });
                }
                return Response.json({ success: false, message: 'Database constraint violation occurred' }, { status: 400 });
            }

            // Handle relation or missing table errors
            // @ts-expect-error
            if (error?.message && error.message.includes('does not exist in the current database')) {
                return Response.json({ success: false, message: 'Database setup incomplete. Please run initial setup/migrations.' }, { status: 500 });
            }

            // Don't leak error details in production (OWASP A05)
            const message = process.env.NODE_ENV === 'development'
                ? (error as Error).message
                : 'An internal error occurred';
            return Response.json(
                { success: false, message },
                { status: 500 }
            );
        }
    };
}

// Public route with just rate limiting
export function publicRoute(handler: (request: NextRequest, context: { params: Promise<Record<string, string>> }) => Promise<Response>) {
    return async (request: NextRequest, context: { params: Promise<Record<string, string>> }) => {
        try {
            // Request body size check
            const bodyValid = await validateBodySize(request);
            if (!bodyValid) {
                return Response.json(
                    { success: false, message: 'Request body too large' },
                    { status: 413 }
                );
            }

            const clientIp = getClientIp(request);
            const rateLimitResult = await checkRateLimit(clientIp);
            if (!rateLimitResult.allowed) {
                return rateLimitResponse();
            }
            return await handler(request, context);
        } catch (error) {
            console.error('Route error:', error);

            // Handle Prisma specific errors gracefully
            // @ts-expect-error
            if (error?.code && typeof error.code === 'string' && error.code.startsWith('P2')) {
                // @ts-expect-error
                if (error.code === 'P2002') return Response.json({ success: false, message: 'Duplicate entry detected' }, { status: 409 });
                // @ts-expect-error
                if (error.code === 'P2025') return Response.json({ success: false, message: 'Record not found' }, { status: 404 });
                return Response.json({ success: false, message: 'Database error occurred' }, { status: 400 });
            }

            // Handle missing table errors
            // @ts-expect-error
            if (error?.message && error.message.includes('does not exist in the current database')) {
                return Response.json({ success: false, message: 'System initialization incomplete (missing database tables)' }, { status: 500 });
            }

            const message = process.env.NODE_ENV === 'development'
                ? (error as Error).message
                : 'An internal error occurred';
            return Response.json(
                { success: false, message },
                { status: 500 }
            );
        }
    };
}
