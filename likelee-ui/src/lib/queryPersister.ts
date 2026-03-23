/**
 * React Query Persister for LocalStorage
 *
 * Persists React Query cache to localStorage for offline support
 * and faster initial loads. Uses the localStorageCache utility
 * for versioned, size-managed storage.
 *
 * Usage:
 * ```tsx
 * import { persistQueryClient } from '@/lib/queryPersister';
 *
 * const queryClient = createQueryClient();
 * persistQueryClient(queryClient);
 * ```
 */

import type { QueryClient } from "@tanstack/react-query";
import { getCacheItem, setCacheItem, CACHE_KEYS } from "./localStorageCache";

const PERSISTER_KEY = "react_query_cache";
const PERSIST_THROTTLE = 1000; // 1 second throttle for saves

/** Queries to persist (by key prefix) */
const PERSIST_QUERIES = [
  "agency-roster",
  "agency-dashboard",
  "talentMe",
  "talentBookings",
  "talentAnalytics",
  "marketplace",
  "jobs",
  "talentLicensing",
  "talentLicenses",
];

/** Queries to never persist */
const NEVER_PERSIST = [
  "studio", // Studio data changes frequently
  "voiceRecordings", // Large binary data
  "talentNotifications", // Real-time data
];

/**
 * Check if a query should be persisted
 */
function shouldPersistQuery(queryKey: readonly unknown[]): boolean {
  const keyStr = JSON.stringify(queryKey).toLowerCase();

  // Check never-persist list
  if (NEVER_PERSIST.some((np) => keyStr.includes(np.toLowerCase()))) {
    return false;
  }

  // Check persist list
  return PERSIST_QUERIES.some((pq) => keyStr.includes(pq.toLowerCase()));
}

/**
 * Throttled save function
 */
let saveTimeout: ReturnType<typeof setTimeout> | null = null;
let pendingData: Map<string, { data: unknown; timestamp: number }> = new Map();

function scheduleSave() {
  if (saveTimeout) return;

  saveTimeout = setTimeout(() => {
    saveTimeout = null;
    flushPendingData();
  }, PERSIST_THROTTLE);
}

function flushPendingData() {
  if (pendingData.size === 0) return;

  const data: Record<string, { data: unknown; timestamp: number }> = {};
  pendingData.forEach((value, key) => {
    data[key] = value;
  });
  pendingData.clear();

  try {
    setCacheItem(PERSISTER_KEY, data);
  } catch (error) {
    console.warn("[QueryPersister] Failed to persist cache:", error);
  }
}

/**
 * Persist query client cache to localStorage
 */
export function persistQueryClient(queryClient: QueryClient): () => void {
  // Load persisted cache on init
  loadPersistedCache(queryClient);

  // Subscribe to cache changes
  const unsubscribe = queryClient.getQueryCache().subscribe((event) => {
    if (event.type === "updated" || event.type === "added") {
      const query = event.query;
      const queryKey = query.queryKey;

      if (!shouldPersistQuery(queryKey)) return;

      const data = query.state.data;
      if (data === undefined) return;

      // Add to pending saves
      pendingData.set(JSON.stringify(queryKey), {
        data,
        timestamp: Date.now(),
      });

      scheduleSave();
    }

    if (event.type === "removed") {
      const queryKey = event.query.queryKey;
      const keyStr = JSON.stringify(queryKey);
      pendingData.delete(keyStr);
    }
  });

  // Save on page unload
  const handleBeforeUnload = () => {
    flushPendingData();
  };
  window.addEventListener("beforeunload", handleBeforeUnload);

  // Return cleanup function
  return () => {
    unsubscribe();
    window.removeEventListener("beforeunload", handleBeforeUnload);
    if (saveTimeout) {
      clearTimeout(saveTimeout);
      saveTimeout = null;
    }
    flushPendingData();
  };
}

/**
 * Load persisted cache into query client
 */
function loadPersistedCache(queryClient: QueryClient): void {
  const cached =
    getCacheItem<Record<string, { data: unknown; timestamp: number }>>(
      PERSISTER_KEY,
    );
  if (!cached) return;

  const data = cached.data;
  const maxAge = 30 * 60 * 1000; // 30 minutes max age for persisted cache
  const now = Date.now();

  Object.entries(data).forEach(([keyStr, value]) => {
    // Skip if too old
    if (now - value.timestamp > maxAge) return;

    try {
      const queryKey = JSON.parse(keyStr);

      if (!shouldPersistQuery(queryKey)) return;

      // Set query data with appropriate staleTime
      queryClient.setQueryData(queryKey, value.data, {
        updatedAt: value.timestamp,
      });
    } catch (error) {
      console.warn("[QueryPersister] Failed to restore query:", keyStr, error);
    }
  });
}

/**
 * Clear persisted cache
 */
export function clearPersistedCache(): void {
  pendingData.clear();
  setCacheItem(PERSISTER_KEY, {});
}

/**
 * Hook for syncing specific queries with localStorage
 */
export function useQuerySync<T extends { id: string }>(
  queryKey: readonly unknown[],
  cacheKey: string,
  options?: {
    mergeStrategy?: "replace" | "merge-by-id" | "append-new";
    maxAge?: number;
  },
): {
  syncToCache: (data: T[]) => void;
  syncFromCache: () => T[] | null;
  getCacheAge: () => number | null;
} {
  return {
    syncToCache: (data: T[]) => {
      setCacheItem(cacheKey, data);
    },
    syncFromCache: () => {
      const cached = getCacheItem<T[]>(cacheKey);
      return cached?.data ?? null;
    },
    getCacheAge: () => {
      const cached = getCacheItem<T[]>(cacheKey);
      return cached ? Date.now() - cached.timestamp : null;
    },
  };
}

/**
 * Get persisted data size
 */
export function getPersistedCacheSize(): number {
  const cached = getCacheItem<Record<string, unknown>>(PERSISTER_KEY);
  if (!cached) return 0;
  return JSON.stringify(cached.data).length;
}
