import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Next.js Edge Middleware for auth protection + security headers (OWASP A01, A05)

const publicPaths = ['/login', '/verify-2fa', '/api/auth/login', '/api/auth/2fa/verify'];
const staticPaths = ['/_next', '/favicon.ico', '/icons', '/images', '/sw.js', '/manifest.json', '/swe-worker', '/insophinia_logo.png', '/insophinia_logo.ico'];

// CORS configuration
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS?.split(',').map(s => s.trim()) || [];

import { generateCsrfToken } from '@/lib/csrf';

export function proxy(request: NextRequest) {
    const { pathname } = request.nextUrl;
    const isApiRequest = pathname.startsWith('/api/');

    // Skip static assets
    if (staticPaths.some(p => pathname.startsWith(p))) {
        return NextResponse.next();
    }

    // Initialize CSRF token for non-API GET requests (initial page load)
    let csrfToken = request.cookies.get('csrf_token')?.value;

    const requestHeaders = new Headers(request.headers);
    const nonce = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2);
    requestHeaders.set('x-nonce', nonce);

    let response = NextResponse.next({
        request: {
            headers: requestHeaders,
        },
    });

    if (!csrfToken && request.method === 'GET' && !isApiRequest) {
        csrfToken = generateCsrfToken();
        // Set the cookie on the response
        response.cookies.set('csrf_token', csrfToken, {
            httpOnly: false, // Must be accessible by client-side JS to send in header
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            path: '/',
            maxAge: 3600 * 24 // 24 hours
        });
    }

    // Security headers (OWASP A05)
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('X-Frame-Options', 'DENY');
    response.headers.set('X-XSS-Protection', '1; mode=block');
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    response.headers.set('Permissions-Policy', 'camera=(self), microphone=(), geolocation=()');
    response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
    response.headers.set('Cross-Origin-Opener-Policy', 'same-origin');
    response.headers.set('Cross-Origin-Resource-Policy', 'same-origin');
    response.headers.set('X-DNS-Prefetch-Control', 'off');
    response.headers.set('X-Download-Options', 'noopen');
    response.headers.set('X-Permitted-Cross-Domain-Policies', 'none');

    // Content Security Policy
    response.headers.set('Content-Security-Policy', [
        "default-src 'self'",
        `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' 'unsafe-eval' https: http:`,
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
        "font-src 'self' https://fonts.gstatic.com",
        "img-src 'self' data: blob: https://*.googleusercontent.com https://www.transparenttextures.com",
        "connect-src 'self'",
        "worker-src 'self'",
        "frame-ancestors 'none'",
        "base-uri 'self'",
        "form-action 'self'",
        "upgrade-insecure-requests",
    ].join('; '));

    // CORS handling for API routes
    if (pathname.startsWith('/api/')) {
        const origin = request.headers.get('origin');

        if (origin && ALLOWED_ORIGINS.length > 0) {
            if (ALLOWED_ORIGINS.includes(origin) || ALLOWED_ORIGINS.includes('*')) {
                response.headers.set('Access-Control-Allow-Origin', origin);
                response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
                response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-CSRF-Token');
                response.headers.set('Access-Control-Max-Age', '86400');
                response.headers.set('Access-Control-Allow-Credentials', 'true');
            }
        }

        // Strict CSRF Check for state-changing requests (OWASP A01)
        if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(request.method)) {
            const csrfCookie = request.cookies.get('csrf_token')?.value;
            const csrfHeader = request.headers.get('x-csrf-token');

            // Must have both and they must match
            const isE2E = process.env.NODE_ENV !== 'production' && request.headers.get('user-agent')?.includes('Cypress');
            
            if (!isE2E && (!csrfCookie || !csrfHeader || csrfCookie !== csrfHeader)) {
                console.warn(`CSRF Mismatch: Cookie=${csrfCookie}, Header=${csrfHeader}`);
                return new NextResponse(JSON.stringify({ success: false, message: 'Invalid or missing CSRF token' }), {
                    status: 403,
                    headers: { 'Content-Type': 'application/json' }
                });
            }
        }

        // Handle preflight
        if (request.method === 'OPTIONS') {
            return new NextResponse(null, { status: 204, headers: response.headers });
        }
    }

    // Public paths don't need auth
    if (publicPaths.some(p => pathname === p || pathname.startsWith(p + '/'))) {
        return response;
    }

    // Check for auth token
    const token = request.cookies.get('auth_token')?.value;
    const authHeader = request.headers.get('authorization');

    // API routes: let the route handler check auth (more detailed error)
    if (pathname.startsWith('/api/')) {
        return response;
    }

    // Page routes: redirect to login if no token
    if (!token && !authHeader) {
        const loginUrl = new URL('/login', request.url);
        loginUrl.searchParams.set('redirect', pathname);
        return NextResponse.redirect(loginUrl);
    }

    return response;
}

export const config = {
    matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
