import IORedis from 'ioredis';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

// Shared Redis connection
export const redis = new IORedis(REDIS_URL, {
  maxRetriesPerRequest: null,
});

/**
 * Normalizes a URL to a domain for cache keys.
 */
export function normalizeDomain(urlStr: string): string {
  try {
    const hostname = new URL(urlStr).hostname.toLowerCase();
    return hostname.replace(/^www\./, '');
  } catch {
    return urlStr.toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0];
  }
}

/**
 * Checks if a domain has been recently processed.
 * @returns company_id if found, else null.
 */
export async function getCachedCompanyId(domain: string): Promise<string | null> {
  const norm = normalizeDomain(domain);
  return redis.get(`jobjet:company:${norm}`);
}

/**
 * Sets a domain as processed, with a 7-day TTL.
 */
export async function setCachedCompanyId(domain: string, companyId: string): Promise<void> {
  const norm = normalizeDomain(domain);
  // 7 days in seconds = 604800
  await redis.set(`jobjet:company:${norm}`, companyId, 'EX', 604800);
}
