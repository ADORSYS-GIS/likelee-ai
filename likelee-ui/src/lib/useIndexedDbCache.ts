/**
 * IndexedDB Cache Sync Hooks
 *
 * React hooks for syncing large datasets with IndexedDB cache.
 * Provides background sync, merge strategies, and offline support.
 *
 * localStorage is used for: settings, preferences, session data
 * IndexedDB is used for: talents, jobs, marketplace, query cache
 */

import { useEffect, useRef, useCallback } from "react";
import {
  useQuery,
  useQueryClient,
  useMutation,
  type UseQueryOptions,
} from "@tanstack/react-query";
import {
  db,
  getCachedQuery,
  setCachedQuery,
  mergeTalents,
  getSyncMeta,
  updateSyncMeta,
  queueMutation,
  getPendingMutations,
  updateMutationStatus,
  type CachedTalent,
} from "./indexedDb";
import { registerBackgroundSync } from "./swRegistration";

interface UseIndexedDbQueryOptions<T> extends Omit<
  UseQueryOptions<T, Error, T>,
  "queryKey" | "queryFn"
> {
  /** Query key for React Query */
  queryKey: readonly unknown[];
  /** Fetch function */
  queryFn: () => Promise<T>;
  /** Agency ID for scoping */
  agencyId?: string;
  /** Max age before considering cache stale (ms) */
  maxAge?: number;
  /** Sync interval for background updates (ms) */
  syncInterval?: number;
  /** Whether to use cached data immediately while fetching */
  staleWhileRevalidate?: boolean;
  /** Enable offline support (queue mutations) */
  offlineSupport?: boolean;
}

/**
 * Hook for queries with IndexedDB persistence
 *
 * Features:
 * - Instant load from IndexedDB cache
 * - Background sync with server
 * - Stale-while-revalidate pattern
 * - Automatic sync interval
 */
export function useIndexedDbQuery<T>(options: UseIndexedDbQueryOptions<T>) {
  const {
    queryKey,
    queryFn,
    agencyId,
    maxAge = 5 * 60 * 1000, // 5 min
    syncInterval,
    staleWhileRevalidate = true,
    offlineSupport = false,
    ...queryOptions
  } = options;

  const queryClient = useQueryClient();
  const lastSyncRef = useRef<number>(0);

  const query = useQuery<T, Error, T, readonly unknown[]>({
    queryKey,
    queryFn: async () => {
      const data = await queryFn();

      // Cache to IndexedDB
      await setCachedQuery(queryKey, data, agencyId);
      lastSyncRef.current = Date.now();

      return data;
    },
    staleTime: maxAge,
    refetchOnWindowFocus: false,
    ...queryOptions,
  });

  // Load initial data from IndexedDB if not in React Query cache
  useEffect(() => {
    if (staleWhileRevalidate && !query.data) {
      getCachedQuery<T>(queryKey, agencyId, maxAge).then((cached) => {
        if (cached) {
          queryClient.setQueryData(queryKey, cached);
        }
      });
    }
  }, [
    queryKey,
    agencyId,
    maxAge,
    staleWhileRevalidate,
    query.data,
    queryClient,
  ]);

  // Background sync interval
  useEffect(() => {
    if (!syncInterval) return;

    const interval = setInterval(() => {
      query.refetch();
    }, syncInterval);

    return () => clearInterval(interval);
  }, [syncInterval, query]);

  // Sync status
  const getSyncStatus = useCallback(async () => {
    const key = JSON.stringify(queryKey);
    const meta = await getSyncMeta(key);

    return {
      lastSync: meta?.lastSync ?? lastSyncRef.current ?? null,
      isStale: meta ? Date.now() - meta.lastSync > maxAge : true,
      hasCachedData: !!query.data,
    };
  }, [queryKey, maxAge, query.data]);

  return {
    ...query,
    getSyncStatus,
    forceSync: () => query.refetch(),
  };
}

/**
 * Hook for syncing agency roster (talents) with IndexedDB
 *
 * Optimized for large datasets (100+ talents)
 */
export function useAgencyRosterIndexedDb(agencyId: string | undefined) {
  const queryKey = ["agency-roster", agencyId] as const;

  const query = useIndexedDbQuery<{ talents: CachedTalent[] }>({
    queryKey,
    queryFn: async () => {
      const { getAgencyRoster } = await import("@/api/functions");
      const resp = await getAgencyRoster();
      return { talents: (resp as any)?.talents || [] };
    },
    agencyId,
    maxAge: 5 * 60 * 1000, // 5 min
    syncInterval: 60 * 1000, // Sync every minute
    staleWhileRevalidate: true,
    enabled: !!agencyId,
  });

  // Merge talents into IndexedDB store
  const mergeToStore = useCallback(
    async (talents: CachedTalent[]) => {
      if (!agencyId) return { added: 0, updated: 0, removed: 0 };
      return mergeTalents(talents, agencyId);
    },
    [agencyId],
  );

  // Trigger background sync
  const triggerBackgroundSync = useCallback(async () => {
    await registerBackgroundSync("sync-talents");
  }, []);

  return {
    ...query,
    talents: query.data?.talents ?? [],
    mergeToStore,
    triggerBackgroundSync,
  };
}

/**
 * Hook for syncing jobs with IndexedDB
 */
export function useJobsIndexedDb(agencyId: string | undefined) {
  return useIndexedDbQuery<{ jobs: any[] }>({
    queryKey: ["agency-job-invites", agencyId] as const,
    queryFn: async () => {
      const { base44 } = await import("@/api/base44Client");
      const resp = await base44.get<{ jobs?: any[] }>("/api/jobs", {
        params: { limit: 100 },
      });
      return { jobs: resp?.jobs ?? [] };
    },
    agencyId,
    maxAge: 60 * 1000, // 1 min
    syncInterval: 30 * 1000, // Sync every 30 seconds
    staleWhileRevalidate: true,
    enabled: !!agencyId,
  });
}

/**
 * Hook for offline mutations with IndexedDB queue
 */
export function useOfflineMutation<
  TData = unknown,
  TVariables = unknown,
>(options: {
  mutationFn: (variables: TVariables) => Promise<TData>;
  endpoint: string;
  method: "POST" | "PUT" | "PATCH" | "DELETE";
  onSuccess?: (data: TData, variables: TVariables) => void;
  onError?: (error: Error, variables: TVariables) => void;
}) {
  const queryClient = useQueryClient();
  const { mutationFn, endpoint, method, onSuccess, onError } = options;

  const mutation = useMutation<TData, Error, TVariables>({
    mutationFn: async (variables) => {
      // Check if online
      if (navigator.onLine) {
        return mutationFn(variables);
      }

      // Queue for later if offline
      const idempotencyKey = `offline_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      await queueMutation({
        type: method,
        endpoint,
        payload: variables,
        idempotencyKey,
      });

      // Trigger background sync when back online
      registerBackgroundSync("sync-mutations");

      // Return placeholder
      return { queued: true, idempotencyKey } as TData;
    },
    onSuccess: (data, variables) => {
      onSuccess?.(data, variables);
    },
    onError: (error, variables) => {
      onError?.(error, variables);
    },
  });

  return mutation;
}

/**
 * Hook for cache invalidation with IndexedDB sync
 */
export function useIndexedDbInvalidation() {
  const queryClient = useQueryClient();

  const invalidateAndSync = useCallback(
    async <T>(
      queryKey: readonly unknown[],
      fetcher: () => Promise<T>,
      agencyId?: string,
    ) => {
      // Fetch fresh data
      const data = await fetcher();

      // Update IndexedDB
      await setCachedQuery(queryKey, data, agencyId);

      // Update React Query
      queryClient.setQueryData(queryKey, data);

      return data;
    },
    [queryClient],
  );

  const clearCache = useCallback(
    async (queryKey: readonly unknown[]) => {
      const keyStr = JSON.stringify(queryKey);

      // Clear from IndexedDB
      await db.queryCache.delete(keyStr);

      // Clear from React Query
      queryClient.removeQueries({ queryKey });
    },
    [queryClient],
  );

  return {
    invalidateAndSync,
    clearCache,
  };
}

/**
 * Hook for pending offline mutations
 */
export function usePendingMutations() {
  const [pending, setPending] = React.useState<
    ReturnType<typeof getPendingMutations> extends Promise<infer T> ? T : never
  >([]);

  useEffect(() => {
    getPendingMutations().then(setPending);

    // Refresh on online event
    const handleOnline = () => {
      getPendingMutations().then(setPending);
    };

    window.addEventListener("online", handleOnline);
    return () => window.removeEventListener("online", handleOnline);
  }, []);

  const retryMutation = useCallback(async (id: number) => {
    await updateMutationStatus(id, "pending");
    await registerBackgroundSync("sync-mutations");
  }, []);

  return { pending, retryMutation };
}

// Need to import React for useState
import React from "react";

/**
 * Prefetch and cache data to IndexedDB
 */
export async function prefetchToIndexedDb<T>(
  queryClient: ReturnType<typeof useQueryClient>,
  queryKey: readonly unknown[],
  fetcher: () => Promise<T>,
  agencyId?: string,
) {
  return queryClient.prefetchQuery({
    queryKey,
    queryFn: async () => {
      const data = await fetcher();
      await setCachedQuery(queryKey, data, agencyId);
      return data;
    },
  });
}
