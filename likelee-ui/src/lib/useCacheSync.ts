/**
 * Cache Sync Hooks
 *
 * React hooks for syncing large datasets with localStorage cache.
 * Provides background sync, merge strategies, and optimistic updates.
 */

import { useEffect, useRef, useCallback } from 'react';
import { useQuery, useQueryClient, useMutation, type UseQueryOptions } from '@tanstack/react-query';
import {
  getCacheItem,
  setCacheItem,
  mergeCacheData,
  CACHE_KEYS,
  type MergeStrategy,
  type CacheEntry,
} from './localStorageCache';

interface UseCachedQueryOptions<T extends { id: string }> extends Omit<UseQueryOptions<T[], Error, T[]>, 'queryKey' | 'queryFn'> {
  /** Cache key for localStorage */
  cacheKey: string;
  /** Query key for React Query */
  queryKey: readonly unknown[];
  /** Fetch function */
  queryFn: () => Promise<T[]>;
  /** Merge strategy for syncing */
  mergeStrategy?: MergeStrategy;
  /** Max age before considering cache stale (ms) */
  maxAge?: number;
  /** Sync interval for background updates (ms) */
  syncInterval?: number;
  /** Whether to use cached data immediately while fetching */
  staleWhileRevalidate?: boolean;
}

/**
 * Hook for cached queries with localStorage persistence
 *
 * Features:
 * - Instant load from localStorage cache
 * - Background sync with server
 * - Merge strategies for data updates
 * - Automatic sync interval
 */
export function useCachedQuery<T extends { id: string }>(
  options: UseCachedQueryOptions<T>
) {
  const {
    cacheKey,
    queryKey,
    queryFn,
    mergeStrategy = 'merge-by-id',
    maxAge = 5 * 60 * 1000, // 5 min
    syncInterval,
    staleWhileRevalidate = true,
    ...queryOptions
  } = options;

  const queryClient = useQueryClient();
  const lastSyncRef = useRef<number>(0);

  // Get cached data for initial render
  const cachedData = getCacheItem<T[]>(cacheKey);
  const initialData = cachedData?.data;

  const query = useQuery<T[], Error, T[], readonly unknown[]>({
    queryKey,
    queryFn: async () => {
      const data = await queryFn();
      
      // Merge with cache and update
      const result = mergeCacheData(cacheKey, data, mergeStrategy);
      lastSyncRef.current = Date.now();
      
      return result.data;
    },
    initialData: staleWhileRevalidate ? initialData : undefined,
    staleTime: maxAge,
    refetchOnWindowFocus: false,
    ...queryOptions,
  });

  // Background sync interval
  useEffect(() => {
    if (!syncInterval) return;

    const interval = setInterval(() => {
      query.refetch();
    }, syncInterval);

    return () => clearInterval(interval);
  }, [syncInterval, query]);

  // Sync status
  const getSyncStatus = useCallback(() => {
    const cached = getCacheItem<T[]>(cacheKey);
    return {
      lastSync: cached?.lastSync ?? cached?.timestamp ?? null,
      cacheAge: cached ? Date.now() - cached.timestamp : null,
      isStale: cached ? Date.now() - cached.timestamp > maxAge : true,
      itemCount: cached?.data?.length ?? 0,
    };
  }, [cacheKey, maxAge]);

  return {
    ...query,
    getSyncStatus,
    forceSync: () => query.refetch(),
  };
}

/**
 * Hook for syncing agency roster (talents)
 *
 * Optimized for large datasets (100+ talents)
 */
export function useAgencyRosterCache(agencyId: string | undefined) {
  const cacheKey = agencyId ? CACHE_KEYS.AGENCY_ROSTER(agencyId) : '';
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return useCachedQuery<any>({
    cacheKey,
    queryKey: ['agency-roster', agencyId],
    queryFn: async () => {
      // This will be replaced with actual API call
      const { getAgencyRoster } = await import('@/api/functions');
      const resp = await getAgencyRoster();
      return (resp as any)?.talents ?? [];
    },
    mergeStrategy: 'merge-by-id',
    maxAge: 5 * 60 * 1000, // 5 min
    syncInterval: 60 * 1000, // Sync every minute
    staleWhileRevalidate: true,
    enabled: !!agencyId,
  });
}

/**
 * Hook for syncing marketplace data
 */
export function useMarketplaceCache(filters: Record<string, string | number | boolean> = {}) {
  const filtersKey = JSON.stringify(filters);
  const cacheKey = CACHE_KEYS.MARKETPLACE(filtersKey);
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return useCachedQuery<any>({
    cacheKey,
    queryKey: ['marketplace', filters],
    queryFn: async () => {
      // This will be replaced with actual API call
      const { base44 } = await import('@/api/base44Client');
      const resp = await base44.get<{ items?: any[] }>('/api/marketplace', { params: filters });
      return resp?.items ?? [];
    },
    mergeStrategy: 'merge-by-id',
    maxAge: 2 * 60 * 1000, // 2 min
    syncInterval: 30 * 1000, // Sync every 30 seconds
    staleWhileRevalidate: true,
  });
}

/**
 * Hook for syncing jobs data
 */
export function useJobsCache(agencyId: string | undefined) {
  const cacheKey = agencyId ? CACHE_KEYS.JOBS(agencyId) : '';
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return useCachedQuery<any>({
    cacheKey,
    queryKey: ['jobs', agencyId],
    queryFn: async () => {
      const { base44 } = await import('@/api/base44Client');
      const resp = await base44.get<{ jobs?: any[] }>('/api/jobs', { params: { limit: 100 } });
      return resp?.jobs ?? [];
    },
    mergeStrategy: 'merge-by-id',
    maxAge: 60 * 1000, // 1 min
    syncInterval: 30 * 1000, // Sync every 30 seconds
    staleWhileRevalidate: true,
    enabled: !!agencyId,
  });
}

/**
 * Hook for cache invalidation with merge support
 */
export function useCacheInvalidation() {
  const queryClient = useQueryClient();

  const invalidateAndSync = useCallback(
    async <T extends { id: string }>(
      queryKey: readonly unknown[],
      cacheKey: string,
      fetcher: () => Promise<T[]>,
      mergeStrategy: MergeStrategy = 'merge-by-id'
    ) => {
      // Fetch fresh data
      const newData = await fetcher();
      
      // Merge with cache
      const result = mergeCacheData(cacheKey, newData, mergeStrategy);
      
      // Update React Query cache
      queryClient.setQueryData(queryKey, result.data);
      
      return result;
    },
    [queryClient]
  );

  const clearCache = useCallback(
    (cacheKey: string, queryKey?: readonly unknown[]) => {
      // Clear localStorage
      setCacheItem(cacheKey, []);
      
      // Clear React Query if key provided
      if (queryKey) {
        queryClient.removeQueries({ queryKey });
      }
    },
    [queryClient]
  );

  return {
    invalidateAndSync,
    clearCache,
  };
}

/**
 * Hook for optimistic updates with cache sync
 */
export function useOptimisticCache<T extends { id: string }>(
  queryKey: readonly unknown[],
  cacheKey: string
) {
  const queryClient = useQueryClient();

  const optimisticUpdate = useCallback(
    (updater: (old: T[] | undefined) => T[]) => {
      // Get current data
      const oldData = queryClient.getQueryData<T[]>(queryKey);
      
      // Optimistically update
      const newData = updater(oldData);
      
      // Update React Query
      queryClient.setQueryData(queryKey, newData);
      
      // Update localStorage
      setCacheItem(cacheKey, newData);
      
      // Return rollback function
      return () => {
        if (oldData) {
          queryClient.setQueryData(queryKey, oldData);
          setCacheItem(cacheKey, oldData);
        }
      };
    },
    [queryClient, queryKey, cacheKey]
  );

  return { optimisticUpdate };
}

/**
 * Prefetch and cache data
 */
export function prefetchAndCache<T extends { id: string }>(
  queryClient: ReturnType<typeof useQueryClient>,
  queryKey: readonly unknown[],
  cacheKey: string,
  fetcher: () => Promise<T[]>
) {
  return queryClient.prefetchQuery({
    queryKey,
    queryFn: async () => {
      const data = await fetcher();
      setCacheItem(cacheKey, data);
      return data;
    },
  });
}
