// Production-grade Security Utilities

const rateMap = new Map<string, { count: number; lastReset: number }>();

/**
 * IP-based Rate Limiter
 * @param ip Client IP
 * @param limit Max requests per window
 * @param windowMs Window duration in milliseconds
 */
export function rateLimit(ip: string, limit: number = 10, windowMs: number = 60000) {
    const now = Date.now();
    const record = rateMap.get(ip) || { count: 0, lastReset: now };

    // Reset if window has passed
    if (now - record.lastReset > windowMs) {
        record.count = 1;
        record.lastReset = now;
    } else {
        record.count++;
    }

    rateMap.set(ip, record);
    return record.count <= limit;
}

/**
 * XSS & HTML Sanitization
 * Removes script tags, style tags, and dangerous HTML attributes
 */
export function sanitizeString(str: any): string {
    if (typeof str !== 'string') return '';
    return str
        .replace(/<script\b[^>]*>([\s\S]*?)<\/script>/gim, "") // Remove scripts
        .replace(/<style\b[^>]*>([\s\S]*?)<\/style>/gim, "")   // Remove styles
        .replace(/<[^>]*>?/gm, '')                            // Remove all tags
        .replace(/["]/g, '&quot;')                            // Escape quotes
        .replace(/[']/g, '&#39;')
        .trim();
}

/**
 * Recursive Object Sanitization
 */
export function sanitizeObject(obj: any): any {
    if (typeof obj !== 'object' || obj === null) {
        return typeof obj === 'string' ? sanitizeString(obj) : obj;
    }
    const clean: any = Array.isArray(obj) ? [] : {};
    for (const key in obj) {
        clean[key] = sanitizeObject(obj[key]);
    }
    return clean;
}

/**
 * Basic Email Validation
 */
export function validateEmail(email: string): boolean {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}
