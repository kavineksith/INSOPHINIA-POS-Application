import { generateSecret, generateURI, verifySync } from 'otplib';
import QRCode from 'qrcode';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';

// --- TOTP Configuration ---
// Options are now passed directly to the functional methods.
const TOTP_OPTIONS = {
    digits: 6,
    step: 30, // 30-second window
    window: 1, // Allow 1 step drift (±30s)
};

const ENCRYPTION_KEY = process.env.TWO_FACTOR_ENCRYPTION_KEY || '';
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

// --- AES-256-GCM Encryption for 2FA Secrets ---

function getEncryptionKey(): Buffer {
    if (!ENCRYPTION_KEY || ENCRYPTION_KEY.length < 32) {
        throw new Error('TWO_FACTOR_ENCRYPTION_KEY must be set (min 32 chars). Generate with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"');
    }
    // Use first 32 bytes of the key
    return Buffer.from(ENCRYPTION_KEY.slice(0, 64), 'hex');
}

export function encryptSecret(secret: string): string {
    const key = getEncryptionKey();
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    let encrypted = cipher.update(secret, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag();

    // Format: iv:authTag:encrypted
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

export function decryptSecret(encryptedData: string): string {
    const key = getEncryptionKey();
    const parts = encryptedData.split(':');
    if (parts.length !== 3) throw new Error('Invalid encrypted data format');

    const iv = Buffer.from(parts[0], 'hex');
    const authTag = Buffer.from(parts[1], 'hex');
    const encrypted = parts[2];

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
}

// --- TOTP Operations ---

export function generateTOTPSecret(): string {
    return generateSecret();
}

export async function generateQRCodeDataURL(
    secret: string,
    username: string,
    issuer: string = 'INSOPHINIA POS'
): Promise<string> {
    const otpauthUrl = generateURI({
        secret,
        label: username,
        issuer,
        ...TOTP_OPTIONS,
    });
    return QRCode.toDataURL(otpauthUrl, {
        width: 256,
        margin: 2,
        color: {
            dark: '#000000',
            light: '#ffffff',
        },
    });
}

export function verifyTOTPCode(token: string, secret: string): boolean {
    try {
        const result = verifySync({ token, secret, ...TOTP_OPTIONS });
        return result.valid;
    } catch {
        return false;
    }
}

// --- Backup Codes ---

export function generateBackupCodes(count: number = 8): string[] {
    const codes: string[] = [];
    for (let i = 0; i < count; i++) {
        // Generate 8-character alphanumeric codes
        const code = crypto.randomBytes(4).toString('hex').toUpperCase();
        codes.push(`${code.slice(0, 4)}-${code.slice(4, 8)}`);
    }
    return codes;
}

export async function hashBackupCodes(codes: string[]): Promise<string[]> {
    const hashed = await Promise.all(
        codes.map(code => bcrypt.hash(code.replace('-', '').toLowerCase(), 10))
    );
    return hashed;
}

export async function verifyBackupCode(
    inputCode: string,
    hashedCodes: string[]
): Promise<{ valid: boolean; remainingCodes: string[] }> {
    const normalizedInput = inputCode.replace('-', '').toLowerCase();

    for (let i = 0; i < hashedCodes.length; i++) {
        const isMatch = await bcrypt.compare(normalizedInput, hashedCodes[i]);
        if (isMatch) {
            // Remove used code
            const remaining = [...hashedCodes];
            remaining.splice(i, 1);
            return { valid: true, remainingCodes: remaining };
        }
    }

    return { valid: false, remainingCodes: hashedCodes };
}

// --- User-Agent Parsing (lightweight) ---

export function parseUserAgent(ua: string): { browser: string; os: string; device: string } {
    let browser = 'Unknown';
    let os = 'Unknown';
    let device = 'Desktop';

    // Browser detection
    if (ua.includes('Firefox/')) browser = 'Firefox';
    else if (ua.includes('Edg/')) browser = 'Microsoft Edge';
    else if (ua.includes('Chrome/')) browser = 'Chrome';
    else if (ua.includes('Safari/') && !ua.includes('Chrome')) browser = 'Safari';
    else if (ua.includes('Opera') || ua.includes('OPR/')) browser = 'Opera';

    // OS detection
    if (ua.includes('Windows NT 10')) os = 'Windows 10/11';
    else if (ua.includes('Windows')) os = 'Windows';
    else if (ua.includes('Mac OS X')) os = 'macOS';
    else if (ua.includes('Linux')) os = 'Linux';
    else if (ua.includes('Android')) os = 'Android';
    else if (ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS';

    // Device detection
    if (ua.includes('Mobile') || ua.includes('Android')) device = 'Mobile';
    else if (ua.includes('Tablet') || ua.includes('iPad')) device = 'Tablet';

    return { browser, os, device };
}

// --- Session Token Hashing ---

export function hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
}
