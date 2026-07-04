export function normalizeUrl(urlStr: string): string {
  try {
    const url = new URL(urlStr);
    let normalized = (url.protocol + '//' + url.hostname + url.pathname).toLowerCase();
    if (normalized.endsWith('/')) {
      normalized = normalized.slice(0, -1);
    }
    return normalized;
  } catch {
    let normalized = urlStr.trim().toLowerCase();
    const qIdx = normalized.indexOf('?');
    if (qIdx !== -1) {
      normalized = normalized.substring(0, qIdx);
    }
    const hIdx = normalized.indexOf('#');
    if (hIdx !== -1) {
      normalized = normalized.substring(0, hIdx);
    }
    if (normalized.endsWith('/')) {
      normalized = normalized.slice(0, -1);
    }
    return normalized;
  }
}

const cacheMap = new Map<string, any>();
const MAX_ENTRIES = 500;

export function has(url: string): boolean {
  return cacheMap.has(normalizeUrl(url));
}

export function get(url: string): any {
  const norm = normalizeUrl(url);
  if (!cacheMap.has(norm)) return undefined;
  const val = cacheMap.get(norm);
  cacheMap.delete(norm);
  cacheMap.set(norm, val);
  return val;
}

export function set(url: string, result: any): void {
  const norm = normalizeUrl(url);
  if (cacheMap.has(norm)) {
    cacheMap.delete(norm);
  } else if (cacheMap.size >= MAX_ENTRIES) {
    const oldestKey = cacheMap.keys().next().value;
    if (oldestKey !== undefined) {
      cacheMap.delete(oldestKey);
    }
  }
  cacheMap.set(norm, result);
}

export function clear(): void {
  cacheMap.clear();
}
