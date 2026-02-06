/**
 * 簡單的記憶體快取（TTL），用於 API 層減少對 Google Sheets 的重複請求。
 * 在 Vercel 上同一 instance 內可跨請求共用。
 */

const store = new Map<string, { value: unknown; expiresAt: number }>();

const DEFAULT_TTL_MS = 60 * 1000; // 60 秒

export function cacheGet<T>(key: string): T | null {
  const entry = store.get(key);
  if (!entry || Date.now() > entry.expiresAt) {
    if (entry) store.delete(key);
    return null;
  }
  return entry.value as T;
}

export function cacheSet(key: string, value: unknown, ttlMs: number = DEFAULT_TTL_MS): void {
  store.set(key, { value, expiresAt: Date.now() + ttlMs });
}

export function cacheDelete(key: string): void {
  store.delete(key);
}

/** 刪除所有以 prefix 開頭的 key（用於批次失效） */
export function cacheDeletePattern(prefix: string): void {
  for (const key of Array.from(store.keys())) {
    if (key.startsWith(prefix)) store.delete(key);
  }
}
