/**
 * React Query Persister for IndexedDB
 *
 * Persists React Query cache to IndexedDB for offline support
 * and faster initial loads for large datasets.
 *
 * Usage:
 * ```tsx
 * import { createPersistedQueryClient } from '@/lib/queryClient';
 * // Already integrated in App.tsx
 * ```
 */

import type { QueryClient } from "@tanstack/react-query";
import { db, getCachedQuery, setCachedQuery, CACHE_VERSION } from "./indexedDb";

const PERSIST_THROTTLE = 1000; // 1 second throttle for saves

/** Queries to persist to IndexedDB (large datasets) */
const INDEXED_DB_QUERIES = [
  "agency-roster",
  "agency-dashboard",
  "talentMe",
  "talentBookings",
  "talentAnalytics",
  "marketplace",
  "jobs",
  "talentLicensing",
  "talentLicenses",
  "prospects",
  "scouting",
];

/** Queries to persist to localStorage (small settings) */
const LOCAL_STORAGE_QUERIES = [
  "talentPortalSettings",
  "agency-payout-settings",
];

/** Queries to never persist */
const NEVER_PERSIST = [
  "voiceRecordings", // Large binary data
  "talentNotifications", // Real-time data
  "agency-brand-connection-requests", // Real-time polling
];

/**
 * Check if a query should be persisted to IndexedDB
 */
function shouldPersistToIndexedDb(queryKey: readonly unknown[]): boolean {
  const keyStr = JSON.stringify(queryKey).toLowerCase();

  if (NEVER_PERSIST.some((np) => keyStr.includes(np.toLowerCase()))) {
    return false;
  }

  return INDEXED_DB_QUERIES.some((pq) => keyStr.includes(pq.toLowerCase()));
}

/**
 * Check if a query should be persisted to localStorage
 */
function shouldPersistToLocalStorage(queryKey: readonly unknown[]): boolean {
  const keyStr = JSON.stringify(queryKey).toLowerCase();
  return LOCAL_STORAGE_QUERIES.some((pq) => keyStr.includes(pq.toLowerCase()));
}

/**
 * Throttled save queue
 */
let saveTimeout: ReturnType<typeof setTimeout> | null = null;
const pendingIndexedDbSaves: Map<
  string,
  { data: unknown; agencyId?: string; timestamp: number }
> = new Map();
const pendingLocalStorageSaves: Map<
  string,
  { data: unknown; timestamp: number }
> = new Map();

function scheduleSave() {
  if (saveTimeout) return;

  saveTimeout = setTimeout(() => {
    saveTimeout = null;
    flushPendingSaves();
  }, PERSIST_THROTTLE);
}

async function flushPendingSaves() {
  // Flush IndexedDB saves
  if (pendingIndexedDbSaves.size > 0) {
    const saves = Array.from(pendingIndexedDbSaves.entries());
    pendingIndexedDbSaves.clear();

    for (const [keyStr, value] of saves) {
      try {
        const queryKey = JSON.parse(keyStr);
        await setCachedQuery(queryKey, value.data, value.agencyId);
      } catch (error) {
        console.warn("[IndexedDBPersister] Failed to save:", error);
      }
    }
  }

  // Flush localStorage saves
  if (pendingLocalStorageSaves.size > 0) {
    const saves = Array.from(pendingLocalStorageSaves.entries());
    pendingLocalStorageSaves.clear();

    for (const [keyStr, value] of saves) {
      try {
        localStorage.setItem(
          `likelee_query_${keyStr}`,
          JSON.stringify({
            data: value.data,
            timestamp: value.timestamp,
            version: CACHE_VERSION,
          }),
        );
      } catch (error) {
        console.warn("[LocalStoragePersister] Failed to save:", error);
      }
    }
  }
}

/**
 * Persist query client cache to IndexedDB + localStorage
 */
export function persistQueryClient(queryClient: QueryClient): () => void {
  // Load persisted cache on init
  loadPersistedCache(queryClient);

  // Subscribe to cache changes
  const unsubscribe = queryClient.getQueryCache().subscribe((event) => {
    if (event.type === "updated" || event.type === "added") {
      const query = event.query;
      const queryKey = query.queryKey;
      const data = query.state.data;

      if (data === undefined) return;

      const keyStr = JSON.stringify(queryKey);

      // Check where to persist
      if (shouldPersistToIndexedDb(queryKey)) {
        // Extract agencyId from query key if present
        const agencyId =
          typeof queryKey[1] === "string" ? queryKey[1] : undefined;
        pendingIndexedDbSaves.set(keyStr, {
          data,
          agencyId,
          timestamp: Date.now(),
        });
        scheduleSave();
      } else if (shouldPersistToLocalStorage(queryKey)) {
        pendingLocalStorageSaves.set(keyStr, {
          data,
          timestamp: Date.now(),
        });
        scheduleSave();
      }
    }

    if (event.type === "removed") {
      const queryKey = event.query.queryKey;
      const keyStr = JSON.stringify(queryKey);
      pendingIndexedDbSaves.delete(keyStr);
      pendingLocalStorageSaves.delete(keyStr);
    }
  });

  // Save on page unload
  const handleBeforeUnload = () => {
    flushPendingSaves();
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
    flushPendingSaves();
  };
}

/**
 * Load persisted cache into query client
 */
async function loadPersistedCache(queryClient: QueryClient): Promise<void> {
  const maxAge = 30 * 60 * 1000; // 30 minutes max age
  const now = Date.now();

  // Load from IndexedDB
  try {
    const cachedQueries = await db.queryCache.toArray();

    for (const cached of cachedQueries) {
      // Skip if too old
      if (now - cached.timestamp > maxAge) continue;

      // Version mismatch
      if (cached.version !== CACHE_VERSION) continue;

      try {
        const queryKey = JSON.parse(cached.queryKey);

        if (!shouldPersistToIndexedDb(queryKey)) continue;

        queryClient.setQueryData(queryKey, cached.data, {
          updatedAt: cached.timestamp,
        });
      } catch (error) {
        console.warn("[IndexedDBPersister] Failed to restore query:", error);
      }
    }
  } catch (error) {
    console.warn("[IndexedDBPersister] Failed to load from IndexedDB:", error);
  }

  // Load from localStorage
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key?.startsWith("likelee_query_")) continue;

      try {
        const raw = localStorage.getItem(key);
        if (!raw) continue;

        const cached = JSON.parse(raw);

        // Skip if too old
        if (now - cached.timestamp > maxAge) continue;

        // Version mismatch
        if (cached.version !== CACHE_VERSION) continue;

        const queryKeyStr = key.replace("likelee_query_", "");
        const queryKey = JSON.parse(queryKeyStr);

        if (!shouldPersistToLocalStorage(queryKey)) continue;

        queryClient.setQueryData(queryKey, cached.data, {
          updatedAt: cached.timestamp,
        });
      } catch (error) {
        // Invalid entry, skip
      }
    }
  } catch (error) {
    console.warn(
      "[LocalStoragePersister] Failed to load from localStorage:",
      error,
    );
  }
}

/**
 * Clear all persisted cache
 */
export async function clearPersistedCache(): Promise<void> {
  pendingIndexedDbSaves.clear();
  pendingLocalStorageSaves.clear();

  await db.queryCache.clear();

  // Clear localStorage query cache
  const keysToRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith("likelee_query_")) {
      keysToRemove.push(key);
    }
  }
  keysToRemove.forEach((key) => localStorage.removeItem(key));
}

/**
 * Get cache statistics
 */
export async function getCacheStats(): Promise<{
  indexedDb: {
    queries: number;
    talents: number;
    jobs: number;
    marketplace: number;
  };
  localStorage: number;
}> {
  const [queries, talents, jobs, marketplace] = await Promise.all([
    db.queryCache.count(),
    db.talents.count(),
    db.jobs.count(),
    db.marketplace.count(),
  ]);

  let localStorageCount = 0;
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith("likelee_query_")) {
      localStorageCount++;
    }
  }

  return {
    indexedDb: { queries, talents, jobs, marketplace },
    localStorage: localStorageCount,
  };
}
