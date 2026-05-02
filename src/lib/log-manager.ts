/**
 * System Log Manager (DB-Only)
 * - SHA-512 hashing for sensitive fields (data masking)
 * - AES-256-GCM encryption for backups (upgraded from AES-128-CBC)
 * - Gzip compression for backup payloads
 * - 7-day backup retention cleanup (DB records only)
 * - 24-hour system log & security event cleanup
 */

import crypto from 'crypto';
import zlib from 'zlib';
import { promisify } from 'util';
import prisma from '@/lib/db';

const gzipAsync = promisify(zlib.gzip);
const gunzipAsync = promisify(zlib.gunzip);

// ---------------------------------------------------------------------------
// Constants & Config
// ---------------------------------------------------------------------------

// AES-256 requires a 32-byte key
const RAW_KEY = process.env.LOG_ENCRYPTION_KEY || "";
const AES256_KEY = Buffer.from(RAW_KEY.padEnd(32, '0').slice(0, 32), 'utf8');

// Legacy AES-128 key for backward compatibility (decryption only)
const AES128_KEY = Buffer.from(RAW_KEY.padEnd(16, '0').slice(0, 16), 'utf8');

// Fields that must be masked via SHA-512 before writing to any log/metadata
const SENSITIVE_FIELDS = [
    'email', 'password', 'phone', 'ip_address', 'ipAddress',
    'session_token', 'sessionToken', 'two_factor_secret', 'twoFactorSecret',
    'two_factor_backup_codes', 'twoFactorBackupCodes', 'token', 'cardNumber',
];

// ---------------------------------------------------------------------------
// SHA-512 Data Masking
// ---------------------------------------------------------------------------

/**
 * Hash a single value using SHA-512 (irreversible mask)
 */
export function sha512Hash(value: string): string {
    return crypto.createHash('sha512').update(value).digest('hex');
}

/**
 * Recursively mask sensitive fields in an object/string using SHA-512.
 * Safe to call on any metadata before storing or writing.
 */
export function maskSensitiveData(data: unknown): unknown {
    if (typeof data === 'string') {
        try {
            const parsed = JSON.parse(data);
            return JSON.stringify(maskSensitiveData(parsed));
        } catch {
            return data;
        }
    }

    if (Array.isArray(data)) {
        return data.map(maskSensitiveData);
    }

    if (data !== null && typeof data === 'object') {
        const masked: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
            if (SENSITIVE_FIELDS.includes(key) && typeof value === 'string' && value.length > 0) {
                masked[key] = `sha512:${sha512Hash(value)}`;
            } else {
                masked[key] = maskSensitiveData(value);
            }
        }
        return masked;
    }

    return data;
}

// ---------------------------------------------------------------------------
// AES-256-GCM Encryption / Decryption (used for backups)
// ---------------------------------------------------------------------------

/**
 * Encrypt a UTF-8 string using AES-256-GCM (authenticated encryption).
 * Returns: base64(iv + authTag + ciphertext)
 */
export function encryptAES256(plaintext: string): string {
    const iv = crypto.randomBytes(12); // GCM recommended 12-byte IV
    const cipher = crypto.createCipheriv('aes-256-gcm', AES256_KEY, iv);
    const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    const authTag = cipher.getAuthTag();
    // Concatenate: iv (12) + authTag (16) + ciphertext
    const combined = Buffer.concat([iv, authTag, encrypted]);
    return combined.toString('base64');
}

/**
 * Decrypt a base64 string encrypted with AES-256-GCM.
 */
export function decryptAES256(ciphertext: string): string {
    const combined = Buffer.from(ciphertext, 'base64');
    const iv = combined.subarray(0, 12);
    const authTag = combined.subarray(12, 28);
    const encrypted = combined.subarray(28);
    const decipher = crypto.createDecipheriv('aes-256-gcm', AES256_KEY, iv);
    decipher.setAuthTag(authTag);
    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
    return decrypted.toString('utf8');
}

// ---------------------------------------------------------------------------
// Legacy AES-128-CBC (backward compatibility — decryption only)
// ---------------------------------------------------------------------------

/**
 * @deprecated Use encryptAES256 for new backups
 */
export function encryptAES128(plaintext: string): string {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-128-cbc', AES128_KEY, iv);
    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return iv.toString('hex') + ':' + encrypted;
}

/**
 * Decrypt legacy AES-128-CBC backups
 */
export function decryptAES128(ciphertext: string): string {
    const [ivHex, encHex] = ciphertext.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const decipher = crypto.createDecipheriv('aes-128-cbc', AES128_KEY, iv);
    let decrypted = decipher.update(encHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
}

// ---------------------------------------------------------------------------
// Gzip Compression / Decompression
// ---------------------------------------------------------------------------

/**
 * Gzip compress a string or buffer, returns a Buffer.
 */
export async function gzipCompress(data: string | Buffer): Promise<Buffer> {
    const input = typeof data === 'string' ? Buffer.from(data, 'utf8') : data;
    return gzipAsync(input) as Promise<Buffer>;
}

/**
 * Gzip decompress a Buffer back to a string.
 */
export async function gzipDecompress(data: Buffer): Promise<string> {
    const result = await gunzipAsync(data);
    return result.toString('utf8');
}

// ---------------------------------------------------------------------------
// Core System Log (DB-Only)
// ---------------------------------------------------------------------------

export interface SystemLogEntry {
    level: 'info' | 'warn' | 'error' | 'critical';
    category: 'auth' | 'billing' | 'inventory' | 'users' | 'backup' | 'system' | 'security';
    action: string;
    message: string;
    metadata?: Record<string, unknown>;
    userId?: string;
    ipAddress?: string;
}

/**
 * Write a log entry to the database (system_logs table).
 * Sensitive fields are masked with SHA-512 before storage.
 */
export async function appendSystemLog(entry: SystemLogEntry): Promise<void> {
    try {
        // Mask sensitive metadata before storing
        const safeMeta = entry.metadata
            ? (maskSensitiveData(entry.metadata) as Record<string, unknown>)
            : undefined;
        const safeIp = entry.ipAddress ? `sha512:${sha512Hash(entry.ipAddress)}` : undefined;

        // Persist to DB only
        await (prisma as any).systemLog.create({
            data: {
                level: entry.level,
                category: entry.category,
                action: entry.action,
                message: entry.message,
                metadata: safeMeta ? JSON.stringify(safeMeta) : undefined,
                userId: entry.userId ?? undefined,
                ipAddress: safeIp,
            },
        });
    } catch (err) {
        // Never let logging errors break the main request
        console.error('[log-manager] appendSystemLog failed:', err);
    }
}

// ---------------------------------------------------------------------------
// DB Backup Cleanup (7-day retention)
// ---------------------------------------------------------------------------

/**
 * Delete backup records older than 7 days from the database.
 * Returns list of deleted filenames.
 */
export async function cleanupOldBackups(): Promise<string[]> {
    const deleted: string[] = [];
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 7);

    try {
        const old = await prisma.backup.findMany({
            where: { createdAt: { lt: cutoff } },
        });

        for (const b of old) {
            try {
                await prisma.backup.delete({ where: { id: b.id } });
                deleted.push(b.filename);
            } catch (e) {
                console.error('[log-manager] cleanup error for', b.filename, e);
            }
        }
    } catch (e) {
        console.error('[log-manager] cleanupOldBackups DB error:', e);
    }

    return deleted;
}

// ---------------------------------------------------------------------------
// 24-Hour System Log & Security Event Cleanup
// ---------------------------------------------------------------------------

/**
 * Delete SystemLog and SecurityEvent records older than 24 hours.
 * AuditLog records are NOT deleted (business-critical).
 * Returns { systemLogs: number, securityEvents: number }
 */
export async function cleanupOldLogs(): Promise<{ systemLogs: number; securityEvents: number }> {
    const cutoff = new Date();
    cutoff.setHours(cutoff.getHours() - 24);

    let systemLogs = 0;
    let securityEvents = 0;

    try {
        const sysResult = await (prisma as any).systemLog.deleteMany({
            where: { createdAt: { lt: cutoff } },
        });
        systemLogs = sysResult.count || 0;
    } catch (e) {
        console.error('[log-manager] cleanupOldLogs systemLog error:', e);
    }

    try {
        const secResult = await prisma.securityEvent.deleteMany({
            where: { createdAt: { lt: cutoff } },
        });
        securityEvents = secResult.count || 0;
    } catch (e) {
        console.error('[log-manager] cleanupOldLogs securityEvent error:', e);
    }

    return { systemLogs, securityEvents };
}
