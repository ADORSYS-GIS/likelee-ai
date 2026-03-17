/**
 * React Query Configuration for Multi-Level Caching
 *
 * Cache Strategy:
 * - staleTime: Data is fresh for this duration (no refetch on mount/window focus)
 * - gcTime: Unused data is garbage collected after this duration
 * - refetchOnWindowFocus: Only refetch if data is stale
 * - refetchOnMount: Only refetch if data is stale
 *
 * Default TTLs align with backend cache:
 * - Session data: 30 min (matches L2 cache)
 * - Application data: 60 min (matches L3 cache)
 */

import { QueryClient } from '@tanstack/react-query';

// Default stale times (data is considered fresh)
export const STALE_TIME = {
  // Very short - for real-time data (e.g., job status)
  REALTIME: 5 * 1000, // 5 seconds
  
  // Short - for frequently changing data (e.g., notifications)
  SHORT: 30 * 1000, // 30 seconds
  
  // Medium - for session-scoped data (matches backend L2 cache)
  SESSION: 30 * 60 * 1000, // 30 minutes
  
  // Long - for application-scoped data (matches backend L3 cache)
  APPLICATION: 60 * 60 * 1000, // 1 hour
  
  // Very long - for rarely changing data (e.g., config)
  CONFIG: 24 * 60 * 60 * 1000, // 24 hours
  
  // Infinity - for static data that never changes
  STATIC: Infinity,
} as const;

// Garbage collection times (when to remove unused data)
export const GC_TIME = {
  // Default: keep for 5 minutes after becoming unused
  DEFAULT: 5 * 60 * 1000, // 5 minutes
  
  // Keep session data longer
  SESSION: 60 * 60 * 1000, // 1 hour
  
  // Keep application data even longer
  APPLICATION: 2 * 60 * 60 * 1000, // 2 hours
} as const;

/**
 * Create a configured QueryClient
 */
export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Data is fresh for 30 seconds by default
        staleTime: STALE_TIME.SHORT,
        
        // Keep unused data for 5 minutes
        gcTime: GC_TIME.DEFAULT,
        
        // Only refetch on window focus if data is stale
        refetchOnWindowFocus: true,
        
        // Only refetch on mount if data is stale
        refetchOnMount: true,
        
        // Don't retry on errors by default (let the UI handle it)
        retry: 1,
        
        // Retry delay with exponential backoff
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
        
        // Refetch on reconnect if stale
        refetchOnReconnect: true,
        
        // Don't refetch interval by default
        refetchInterval: false,
      },
      mutations: {
        // Retry mutations once on network errors
        retry: 1,
        
        // Network mode for offline support
        networkMode: 'online',
      },
    },
    queryCache: undefined,
    mutationCache: undefined,
  });
}

/**
 * Query options presets for common use cases
 */
export const queryOptions = {
  // Real-time data (job status, live updates)
  realtime: {
    staleTime: STALE_TIME.REALTIME,
    gcTime: GC_TIME.DEFAULT,
    refetchInterval: 5 * 1000, // Poll every 5 seconds
  },
  
  // Session-scoped data (user profile, settings)
  session: {
    staleTime: STALE_TIME.SESSION,
    gcTime: GC_TIME.SESSION,
  },
  
  // Application-scoped data (catalogs, templates)
  application: {
    staleTime: STALE_TIME.APPLICATION,
    gcTime: GC_TIME.APPLICATION,
  },
  
  // Configuration data (rarely changes)
  config: {
    staleTime: STALE_TIME.CONFIG,
    gcTime: GC_TIME.APPLICATION,
  },
  
  // Static data (never changes)
  static: {
    staleTime: STALE_TIME.STATIC,
    gcTime: GC_TIME.APPLICATION,
  },
  
  // No caching (always refetch)
  noCache: {
    staleTime: 0,
    gcTime: 0,
  },
} as const;
