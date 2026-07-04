export async function checkRateLimit(
  userId: string,
  limit: number,
  windowHours: number
): Promise<{ success: boolean; limit: number; remaining: number; reset: number }> {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  const now = Date.now();

  if (!url || !token) {
    // Skip gracefully if Upstash is not configured
    return { success: true, limit, remaining: limit, reset: now };
  }

  const windowMs = windowHours * 60 * 60 * 1000;
  const currentWindowKey = `ratelimit:${userId}:${Math.floor(now / windowMs)}`;

  try {
    const res = await fetch(`${url}/incr/${currentWindowKey}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!res.ok) {
      console.warn('Upstash Redis request failed:', res.statusText);
      return { success: true, limit, remaining: limit, reset: now };
    }

    const data = await res.json();
    const count = parseInt(data.result, 10);

    if (count === 1) {
      // Set expiration for the key
      const secondsToExpire = Math.ceil(windowMs / 1000);
      await fetch(`${url}/expire/${currentWindowKey}/${secondsToExpire}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
    }

    const remaining = Math.max(0, limit - count);
    const success = count <= limit;

    return {
      success,
      limit,
      remaining,
      reset: Math.floor(now / windowMs + 1) * windowMs,
    };
  } catch (error) {
    console.warn('Rate limiting failed, skipping gracefully:', error);
    return { success: true, limit, remaining: limit, reset: now };
  }
}
