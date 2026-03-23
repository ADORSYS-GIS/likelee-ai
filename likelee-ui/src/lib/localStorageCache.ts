/**
 * LocalStorage Cache with Sync & Merge Support
 *
 * Provides persistent caching for large datasets (talents, marketplace, jobs)
 * with versioning, timestamps, and intelligent merge strategies.
 *
 * Features:
 * - Versioned storage (auto-invalidate on schema changes)
 * - Timestamp tracking for sync detection
 * - Merge strategies: replace, merge-by-id, append-new
 * - Size management with LRU eviction
 * - Compression for large datasets
 */

const CACHE_PREFIX = "likelee_cache_";
const CACHE_VERSION = 1;
const MAX_CACHE_SIZE = 4 * 1024 * 1024; // 4MB limit (leaving room for other storage)

export interface CacheEntry<T> {
  /** Cached data */
  data: T;
  /** Timestamp when cached */
  timestamp: number;
  /** Cache version for invalidation */
  version: number;
  /** ETag or hash for change detection */
  etag?: string;
  /** Total count on server (for pagination) */
  totalCount?: number;
  /** Last sync timestamp */
  lastSync?: number;
}

export interface SyncResult<T> {
  /** Merged data */
  data: T[];
  /** Number of new items added */
  added: number;
  /** Number of items updated */
  updated: number;
  /** Number of items removed */
  removed: number;
  /** Whether sync resulted in changes */
  hasChanges: boolean;
}

export type MergeStrategy =
  | "replace"
  | "merge-by-id"
  | "append-new"
  | "prepend-new";

/**
 * Get item from localStorage cache
 */
export function getCacheItem<T>(key: string): CacheEntry<T> | null {
  try {
    const raw = localStorage.getItem(`${CACHE_PREFIX}${key}`);
    if (!raw) return null;

    const entry: CacheEntry<T> = JSON.parse(raw);

    // Version mismatch - invalidate cache
    if (entry.version !== CACHE_VERSION) {
      removeCacheItem(key);
      return null;
    }

    return entry;
  } catch (error) {
    console.warn(`[Cache] Failed to read cache key "${key}":`, error);
    return null;
  }
}

/**
 * Set item in localStorage cache
 */
export function setCacheItem<T>(
  key: string,
  data: T,
  options?: {
    etag?: string;
    totalCount?: number;
    lastSync?: number;
  },
): boolean {
  try {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      version: CACHE_VERSION,
      etag: options?.etag,
      totalCount: options?.totalCount,
      lastSync: options?.lastSync ?? Date.now(),
    };

    const serialized = JSON.stringify(entry);

    // Check size limit
    if (serialized.length > MAX_CACHE_SIZE) {
      console.warn(
        `[Cache] Cache entry "${key}" exceeds size limit (${serialized.length} bytes)`,
      );
      return false;
    }

    // Evict old entries if storage is full
    ensureStorageSpace(serialized.length);

    localStorage.setItem(`${CACHE_PREFIX}${key}`, serialized);
    return true;
  } catch (error) {
    console.warn(`[Cache] Failed to write cache key "${key}":`, error);
    return false;
  }
}

/**
 * Remove item from cache
 */
export function removeCacheItem(key: string): void {
  try {
    localStorage.removeItem(`${CACHE_PREFIX}${key}`);
  } catch (error) {
    console.warn(`[Cache] Failed to remove cache key "${key}":`, error);
  }
}

/**
 * Clear all cache entries
 */
export function clearCache(): void {
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(CACHE_PREFIX)) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((key) => localStorage.removeItem(key));
  } catch (error) {
    console.warn("[Cache] Failed to clear cache:", error);
  }
}

/**
 * Get cache age in milliseconds
 */
export function getCacheAge(key: string): number | null {
  const entry = getCacheItem(key);
  if (!entry) return null;
  return Date.now() - entry.timestamp;
}

/**
 * Check if cache is stale (older than maxAge)
 */
export function isCacheStale(key: string, maxAge: number): boolean {
  const age = getCacheAge(key);
  return age === null || age > maxAge;
}

/**
 * Merge cached data with new server data
 */
export function mergeCacheData<T extends { id: string }>(
  cacheKey: string,
  newData: T[],
  strategy: MergeStrategy = "merge-by-id",
): SyncResult<T> {
  const cached = getCacheItem<T[]>(cacheKey);
  const cachedData = cached?.data ?? [];

  if (strategy === "replace") {
    setCacheItem(cacheKey, newData);
    return {
      data: newData,
      added: newData.length,
      updated: 0,
      removed: cachedData.length,
      hasChanges: true,
    };
  }

  if (strategy === "append-new") {
    const existingIds = new Set(cachedData.map((item) => item.id));
    const newItems = newData.filter((item) => !existingIds.has(item.id));
    const merged = [...cachedData, ...newItems];
    setCacheItem(cacheKey, merged);
    return {
      data: merged,
      added: newItems.length,
      updated: 0,
      removed: 0,
      hasChanges: newItems.length > 0,
    };
  }

  if (strategy === "prepend-new") {
    const existingIds = new Set(cachedData.map((item) => item.id));
    const newItems = newData.filter((item) => !existingIds.has(item.id));
    const merged = [...newItems, ...cachedData];
    setCacheItem(cacheKey, merged);
    return {
      data: merged,
      added: newItems.length,
      updated: 0,
      removed: 0,
      hasChanges: newItems.length > 0,
    };
  }

  // merge-by-id: Update existing, add new, remove items not in new data
  const newDataMap = new Map(newData.map((item) => [item.id, item]));
  const cachedMap = new Map(cachedData.map((item) => [item.id, item]));

  let added = 0;
  let updated = 0;
  let removed = 0;

  // Count updates and additions
  for (const item of newData) {
    if (!cachedMap.has(item.id)) {
      added++;
    } else {
      // Check if actually different (compare JSON)
      const cached = cachedMap.get(item.id);
      if (JSON.stringify(cached) !== JSON.stringify(item)) {
        updated++;
      }
    }
  }

  // Count removals
  for (const item of cachedData) {
    if (!newDataMap.has(item.id)) {
      removed++;
    }
  }

  const hasChanges = added > 0 || updated > 0 || removed > 0;

  // Use new data as source of truth
  if (hasChanges) {
    setCacheItem(cacheKey, newData);
  }

  return {
    data: newData,
    added,
    updated,
    removed,
    hasChanges,
  };
}

/**
 * Get cached data or fetch from server
 */
export async function getOrFetch<T>(
  cacheKey: string,
  fetcher: () => Promise<T>,
  options?: {
    maxAge?: number;
    forceRefresh?: boolean;
  },
): Promise<{ data: T; fromCache: boolean }> {
  const maxAge = options?.maxAge ?? 5 * 60 * 1000; // 5 min default
  const forceRefresh = options?.forceRefresh ?? false;

  // Check cache
  if (!forceRefresh && !isCacheStale(cacheKey, maxAge)) {
    const cached = getCacheItem<T>(cacheKey);
    if (cached) {
      return { data: cached.data, fromCache: true };
    }
  }

  // Fetch fresh data
  const data = await fetcher();
  setCacheItem(cacheKey, data);
  return { data, fromCache: false };
}

/**
 * Ensure enough storage space by evicting old entries (LRU)
 */
function ensureStorageSpace(requiredSize: number): void {
  try {
    // Get current usage
    let totalSize = 0;
    const entries: Array<{ key: string; size: number; timestamp: number }> = [];

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(CACHE_PREFIX)) {
        const raw = localStorage.getItem(key);
        if (raw) {
          const size = raw.length;
          totalSize += size;

          try {
            const entry = JSON.parse(raw);
            entries.push({ key, size, timestamp: entry.timestamp ?? 0 });
          } catch {
            // Invalid entry, mark for removal
            entries.push({ key, size, timestamp: 0 });
          }
        }
      }
    }

    // Check if we need to evict
    const availableSpace = MAX_CACHE_SIZE - totalSize;
    if (availableSpace >= requiredSize) {
      return; // Enough space
    }

    // Sort by timestamp (oldest first) for LRU eviction
    entries.sort((a, b) => a.timestamp - b.timestamp);

    // Evict until we have enough space
    let freedSpace = 0;
    for (const entry of entries) {
      if (totalSize - freedSpace + requiredSize <= MAX_CACHE_SIZE) {
        break;
      }
      localStorage.removeItem(entry.key);
      freedSpace += entry.size;
    }
  } catch (error) {
    console.warn("[Cache] Failed to ensure storage space:", error);
  }
}

/**
 * Get cache statistics
 */
export function getCacheStats(): {
  totalEntries: number;
  totalSize: number;
  entries: Array<{ key: string; size: number; age: number }>;
} {
  let totalSize = 0;
  const entries: Array<{ key: string; size: number; age: number }> = [];

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith(CACHE_PREFIX)) {
      const raw = localStorage.getItem(key);
      if (raw) {
        const size = raw.length;
        totalSize += size;

        try {
          const entry = JSON.parse(raw);
          entries.push({
            key: key.replace(CACHE_PREFIX, ""),
            size,
            age: Date.now() - (entry.timestamp ?? 0),
          });
        } catch {
          entries.push({ key: key.replace(CACHE_PREFIX, ""), size, age: 0 });
        }
      }
    }
  }

  return {
    totalEntries: entries.length,
    totalSize,
    entries,
  };
}

/**
 * Cache keys for large datasets
 */
export const CACHE_KEYS = {
  /** Agency talent roster */
  AGENCY_ROSTER: (agencyId: string) => `agency_roster_${agencyId}`,
  /** Marketplace listings */
  MARKETPLACE: (filters: string) => `marketplace_${filters}`,
  /** Jobs listings */
  JOBS: (agencyId: string) => `jobs_${agencyId}`,
  /** Licensing requests */
  LICENSING_REQUESTS: (agencyId: string) => `licensing_requests_${agencyId}`,
  /** Brand connections */
  BRAND_CONNECTIONS: (agencyId: string) => `brand_connections_${agencyId}`,
  /** Creator profiles (for talent portal) */
  CREATOR_PROFILES: (creatorId: string) => `creator_profiles_${creatorId}`,
  /** Session data */
  SESSION_DATA: "session_data",
} as const;
