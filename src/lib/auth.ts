import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import prisma from './db';
import { hashToken } from './two-factor';

const JWT_SECRET = process.env.JWT_SECRET || (() => { throw new Error('JWT_SECRET must be set in environment variables'); })();
const JWT_EXPIRATION = parseInt(process.env.JWT_EXPIRATION || '3600', 10);
const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS || '12', 10);

export interface JwtPayload {
    user_id: string;
    username: string;
    role: string;
    session_id?: string;
    iat?: number;
    exp?: number;
}

// Pending 2FA token payload (short-lived)
export interface Pending2FAPayload {
    user_id: string;
    username: string;
    role: string;
    pending_2fa: true;
    iat?: number;
    exp?: number;
}

// --- Password Hashing (OWASP A02) ---

export async function hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, BCRYPT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
}

// --- Password Policy (OWASP A07) ---

export function validatePasswordStrength(password: string): string[] {
    const errors: string[] = [];
    if (password.length < 12) errors.push('Password must be at least 12 characters');
    if (password.length > 30) errors.push('Password must not exceed 30 characters');
    if (!/[A-Z]/.test(password)) errors.push('Password must contain at least one uppercase letter');
    if (!/[a-z]/.test(password)) errors.push('Password must contain at least one lowercase letter');
    if (!/[0-9]/.test(password)) errors.push('Password must contain at least one number');
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
        errors.push('Password must contain at least one special character');
    }
    return errors;
}

// --- JWT Token Management ---

export function generateToken(payload: Omit<JwtPayload, 'iat' | 'exp'>): string {
    return jwt.sign(payload, JWT_SECRET, {
        expiresIn: JWT_EXPIRATION,
        algorithm: 'HS256',
    });
}

export function generatePending2FAToken(payload: Omit<Pending2FAPayload, 'iat' | 'exp'>): string {
    return jwt.sign(payload, JWT_SECRET, {
        expiresIn: 300, // 5 minutes for 2FA verification
        algorithm: 'HS256',
    });
}

export function validateToken(token: string): JwtPayload | null {
    try {
        const decoded = jwt.verify(token, JWT_SECRET, {
            algorithms: ['HS256'],
        }) as JwtPayload;
        // Reject pending 2FA tokens used as full auth tokens
        if ((decoded as unknown as Pending2FAPayload).pending_2fa) {
            return null;
        }
        return decoded;
    } catch {
        return null;
    }
}

export function validatePending2FAToken(token: string): Pending2FAPayload | null {
    try {
        const decoded = jwt.verify(token, JWT_SECRET, {
            algorithms: ['HS256'],
        }) as Pending2FAPayload;
        if (!decoded.pending_2fa) return null;
        return decoded;
    } catch {
        return null;
    }
}

// --- Token Extraction ---

export function getTokenFromRequest(request: Request): string | null {
    // 1. Check Authorization header
    const authHeader = request.headers.get('authorization');
    if (authHeader?.startsWith('Bearer ')) {
        return authHeader.substring(7);
    }

    // 2. Check URL query param (for file downloads)
    const url = new URL(request.url);
    const tokenParam = url.searchParams.get('token');
    if (tokenParam) {
        return tokenParam;
    }

    // 3. Check cookie
    const cookieHeader = request.headers.get('cookie');
    if (cookieHeader) {
        const match = cookieHeader.match(/auth_token=([^;]+)/);
        if (match) return match[1];
    }

    return null;
}

// --- Auth Cookie Management ---

export function setAuthCookie(token: string): string {
    const maxAge = JWT_EXPIRATION;
    const secure = process.env.NODE_ENV === 'production' ? 'Secure;' : '';
    return `auth_token=${token}; HttpOnly; ${secure} SameSite=Strict; Path=/; Max-Age=${maxAge}`;
}

export function clearAuthCookie(): string {
    return 'auth_token=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0';
}

// --- Token Blacklist Check ---

async function isTokenBlacklisted(token: string): Promise<boolean> {
    try {
        const tokenHash = hashToken(token);
        const blacklisted = await prisma.tokenBlacklist.findUnique({ where: { tokenHash } });
        return !!blacklisted;
    } catch {
        return false;
    }
}

export async function blacklistToken(token: string, userId: string, reason: string = 'logout'): Promise<void> {
    try {
        const tokenHash = hashToken(token);
        const decoded = jwt.decode(token) as JwtPayload | null;
        const expiresAt = decoded?.exp ? new Date(decoded.exp * 1000) : new Date(Date.now() + JWT_EXPIRATION * 1000);

        await prisma.tokenBlacklist.create({
            data: {
                tokenHash,
                userId,
                reason,
                expiresAt,
            }
        });
    } catch (error) {
        console.error('Token blacklist error:', error);
    }
}

// --- Session Validation ---

async function isSessionActive(sessionId: string): Promise<boolean> {
    try {
        const session = await prisma.loginSession.findUnique({ where: { id: sessionId } });
        if (!session) return false;
        return session.isActive && new Date(session.expiresAt) > new Date();
    } catch {
        return true; // Fail open
    }
}

// --- Auth Middleware Helper ---

export async function authenticateRequest(
    request: Request
): Promise<
    | { authenticated: false; response: Response }
    | { authenticated: true; user: JwtPayload; token: string; newCookie?: string }
> {
    const token = getTokenFromRequest(request);

    if (!token) {
        return {
            authenticated: false,
            response: Response.json(
                { success: false, message: 'Authentication required' },
                { status: 401 }
            ),
        };
    }

    // Check if token is blacklisted
    const blacklisted = await isTokenBlacklisted(token);
    if (blacklisted) {
        return {
            authenticated: false,
            response: Response.json(
                { success: false, message: 'Token has been revoked. Please login again.' },
                { status: 401 }
            ),
        };
    }

    const payload = validateToken(token);
    if (!payload) {
        return {
            authenticated: false,
            response: Response.json(
                { success: false, message: 'Invalid or expired token' },
                { status: 401 }
            ),
        };
    }

    // Validate session is still active
    if (payload.session_id) {
        const session = await prisma.loginSession.findUnique({
            where: { id: payload.session_id }
        });

        if (!session || !session.isActive || new Date(session.expiresAt) <= new Date()) {
            return {
                authenticated: false,
                response: Response.json(
                    { success: false, message: 'Session has been revoked or expired. Please login again.' },
                    { status: 401 }
                ),
            };
        }

        // --- IP Pinning Check (Optional) ---
        // On cloud platforms like Netlify, IPs can change between requests due to CDN routing.
        const requireIpPinning = process.env.REQUIRE_IP_PINNING === 'true';
        if (requireIpPinning) {
            const currentIp = request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
                request.headers.get('x-real-ip') || '127.0.0.1';

            if (session.ipAddress !== currentIp) {
                // Revoke immediately on IP mismatch
                await prisma.loginSession.update({
                    where: { id: payload.session_id },
                    data: { isActive: false, revokedAt: new Date(), revokeReason: 'ip_mismatch_revocation' }
                }).catch(() => { });

                return {
                    authenticated: false,
                    response: Response.json(
                        { success: false, message: 'Security alert: IP address change detected. Session revoked.' },
                        { status: 401 }
                    ),
                };
            }
        }

        // --- Token Rotation ---
        // If token is older than 30 minutes, rotate it
        const now = new Date();
        let rotatedCookie: string | undefined = undefined;
        let finalToken = token;

        const iat = payload.iat || 0;
        const ageSeconds = Math.floor(now.getTime() / 1000) - iat;

        if (ageSeconds > 1800) { // 30 minutes
            const newToken = generateToken({
                user_id: payload.user_id,
                username: payload.username,
                role: payload.role,
                session_id: payload.session_id,
            });
            finalToken = newToken;
            rotatedCookie = setAuthCookie(newToken);
        }

        // Throttle activity update to once per minute
        const lastUpdate = new Date(session.lastActivityAt);
        if (now.getTime() - lastUpdate.getTime() > 60000) {
            await prisma.loginSession.update({
                where: { id: payload.session_id },
                data: { lastActivityAt: now },
            }).catch(() => { });
        }

        return { authenticated: true, user: payload, token: finalToken, newCookie: rotatedCookie };
    }

    return { authenticated: true, user: payload, token };
}

// --- Role Check Helper ---

const ROLE_HIERARCHY: Record<string, number> = {
    cashier: 1,
    supervisor: 2,
    admin: 3,
    master_admin: 4,
};

export function checkRole(
    userRole: string,
    requiredRole: string
): boolean {
    const userLevel = ROLE_HIERARCHY[userRole] ?? 0;
    const requiredLevel = ROLE_HIERARCHY[requiredRole] ?? 0;
    return userLevel >= requiredLevel;
}

export function authorizeRole(
    userRole: string,
    requiredRole: string
): Response | null {
    if (!checkRole(userRole, requiredRole)) {
        return Response.json(
            { success: false, message: 'Insufficient permissions' },
            { status: 403 }
        );
    }
    return null;
}
