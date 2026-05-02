/**
 * CSRF Protection Utilities - Edge Runtime Compatible
 * Using Web Crypto API instead of Node.js crypto
 */

export function generateCsrfToken(): string {
    const array = new Uint8Array(32);
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
        crypto.getRandomValues(array);
    } else {
        // Fallback for environments where crypto is not available (shouldn't happen in Edge)
        for (let i = 0; i < array.length; i++) {
            array[i] = Math.floor(Math.random() * 256);
        }
    }
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Timing-safe string comparison
 */
export function validateCsrfToken(token: string, storedToken: string): boolean {
    if (!token || !storedToken || token.length !== storedToken.length) return false;

    let result = 0;
    for (let i = 0; i < token.length; i++) {
        result |= token.charCodeAt(i) ^ storedToken.charCodeAt(i);
    }
    return result === 0;
}
