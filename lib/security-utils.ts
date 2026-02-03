// Basic Rate Limiter for Next.js API Routes (Objective 2)
// Note: In-memory storage is not shared across edge/serverless instances, 
// but provides per-instance protection which is a good baseline.

const rateMap = new Map<string, { count: number; lastReset: number }>();

export function rateLimit(ip: string, limit: number = 10, windowMs: number = 60000) {
    const now = Date.now();
    const record = rateMap.get(ip) || { count: 0, lastReset: now };

    if (now - record.lastReset > windowMs) {
        record.count = 1;
        record.lastReset = now;
    } else {
        record.count++;
    }

    rateMap.set(ip, record);
    return record.count <= limit;
}

// Simple Sanitization (Objective 4)
export function sanitizeString(str: string): string {
    if (!str) return '';
    return str
        .replace(/[<>]/g, '') // Basic tag removal
        .trim();
}
