/**
 * IndexedDB Database for Large Dataset Caching
 *
 * Uses Dexie.js for a clean API over IndexedDB.
 * Stores: talents, jobs, marketplace, queryCache, syncMeta, mutations
 *
 * localStorage remains for: settings, preferences, session data
 */

import Dexie, { type Table } from 'dexie';

// ============================================
// Type Definitions
// ============================================

/** Cached talent/creator profile */
export interface CachedTalent {
  id: string;
  agency_id: string;
  stage_name?: string;
  full_legal_name?: string;
  profile_photo_url?: string;
  email?: string;
  status?: string;
  created_at?: string;
  updated_at?: string;
  [key: string]: unknown; // Allow additional fields
}

/** Cached job listing */
export interface CachedJob {
  id: string;
  agency_id?: string;
  title?: string;
  status?: string;
  created_at?: string;
  [key: string]: unknown;
}

/** Cached marketplace item */
export interface CachedMarketplaceItem {
  id: string;
  category?: string;
  status?: string;
  created_at?: string;
  [key: string]: unknown;
}

/** Generic query cache entry */
export interface CachedQuery {
  /** Composite key: JSON.stringify(queryKey) */
  id: string;
  /** Query key for lookup */
  queryKey: string;
  /** Agency ID for scoping */
  agencyId?: string;
  /** Cached data */
  data: unknown;
  /** Timestamp when cached */
  timestamp: number;
  /** ETag for change detection */
  etag?: string;
  /** Data version */
  version: number;
}

/** Sync metadata for each data type */
export interface SyncMeta {
  /** Key: store name or query key */
  key: string;
  /** Last successful sync */
  lastSync: number;
  /** ETag from last response */
  etag?: string;
  /** Data version */
  version: number;
  /** Total count on server */
  totalCount?: number;
}

/** Queued mutation for offline support */
export interface QueuedMutation {
  id?: number;
  /** HTTP method */
  type: 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  /** API endpoint */
  endpoint: string;
  /** Request payload */
  payload: unknown;
  /** When queued */
  timestamp: number;
  /** Status: pending, syncing, failed */
  status: 'pending' | 'syncing' | 'failed' | 'completed';
  /** Idempotency key for safe retries */
  idempotencyKey: string;
  /** Retry count */
  retryCount?: number;
  /** Error message if failed */
  error?: string;
}

// ============================================
// Database Class
// ============================================

export class LikeleeDatabase extends Dexie {
  // Table declarations
  talents!: Table<CachedTalent, string>;
  jobs!: Table<CachedJob, string>;
  marketplace!: Table<CachedMarketplaceItem, string>;
  queryCache!: Table<CachedQuery, string>;
  syncMeta!: Table<SyncMeta, string>;
  mutations!: Table<QueuedMutation, number>;

  constructor() {
    super('likelee_cache');
    
    this.version(1).stores({
      // Primary data stores (indexed for queries)
      talents: 'id, agency_id, stage_name, status, created_at, updated_at',
      jobs: 'id, agency_id, status, created_at',
      marketplace: 'id, category, status, created_at',
      
      // Query result cache
      queryCache: 'id, queryKey, agencyId, timestamp',
      
      // Sync metadata
      syncMeta: 'key',
      
      // Offline mutations queue (auto-increment id)
      mutations: '++id, type, endpoint, timestamp, status, idempotencyKey',
    });
  }
}

// ============================================
// Database Instance
// ============================================

export const db = new LikeleeDatabase();

// ============================================
// Cache Version (increment to invalidate all)
// ============================================

export const CACHE_VERSION = 1;

// ============================================
// Helper Functions
// ============================================

/**
 * Generate a cache key from query key
 */
export function getQueryCacheKey(queryKey: readonly unknown[], agencyId?: string): string {
  const keyStr = JSON.stringify(queryKey);
  return agencyId ? `${keyStr}:${agencyId}` : keyStr;
}

/**
 * Get cached query data
 */
export async function getCachedQuery<T>(
  queryKey: readonly unknown[],
  agencyId?: string,
  maxAge?: number
): Promise<T | null> {
  const id = getQueryCacheKey(queryKey, agencyId);
  
  try {
    const cached = await db.queryCache.get(id);
    
    if (!cached) return null;
    
    // Version mismatch
    if (cached.version !== CACHE_VERSION) {
      await db.queryCache.delete(id);
      return null;
    }
    
    // Age check
    if (maxAge && Date.now() - cached.timestamp > maxAge) {
      return null; // Stale, but don't delete (stale-while-revalidate)
    }
    
    return cached.data as T;
  } catch (error) {
    console.warn('[IndexedDB] Failed to get cached query:', error);
    return null;
  }
}

/**
 * Set cached query data
 */
export async function setCachedQuery<T>(
  queryKey: readonly unknown[],
  data: T,
  agencyId?: string,
  etag?: string
): Promise<void> {
  const id = getQueryCacheKey(queryKey, agencyId);
  
  try {
    await db.queryCache.put({
      id,
      queryKey: JSON.stringify(queryKey),
      agencyId,
      data,
      timestamp: Date.now(),
      etag,
      version: CACHE_VERSION,
    });
  } catch (error) {
    console.warn('[IndexedDB] Failed to set cached query:', error);
  }
}

/**
 * Clear all cached queries
 */
export async function clearQueryCache(): Promise<void> {
  try {
    await db.queryCache.clear();
  } catch (error) {
    console.warn('[IndexedDB] Failed to clear query cache:', error);
  }
}

/**
 * Clear all data (for logout)
 */
export async function clearAllData(): Promise<void> {
  try {
    await Promise.all([
      db.talents.clear(),
      db.jobs.clear(),
      db.marketplace.clear(),
      db.queryCache.clear(),
      db.syncMeta.clear(),
      db.mutations.clear(),
    ]);
  } catch (error) {
    console.warn('[IndexedDB] Failed to clear all data:', error);
  }
}

// ============================================
// Talent Operations
// ============================================

/**
 * Get all cached talents for an agency
 */
export async function getCachedTalents(agencyId: string): Promise<CachedTalent[]> {
  try {
    return await db.talents.where('agency_id').equals(agencyId).toArray();
  } catch (error) {
    console.warn('[IndexedDB] Failed to get cached talents:', error);
    return [];
  }
}

/**
 * Bulk put talents (for initial load or full refresh)
 */
export async function putTalents(talents: CachedTalent[]): Promise<void> {
  try {
    await db.talents.bulkPut(talents);
  } catch (error) {
    console.warn('[IndexedDB] Failed to put talents:', error);
  }
}

/**
 * Merge talents with existing (update existing, add new)
 */
export async function mergeTalents(newTalents: CachedTalent[], agencyId: string): Promise<{
  added: number;
  updated: number;
  removed: number;
}> {
  try {
    const existing = await getCachedTalents(agencyId);
    const existingIds = new Set(existing.map(t => t.id));
    const newIds = new Set(newTalents.map(t => t.id));
    
    // Count changes
    const added = newTalents.filter(t => !existingIds.has(t.id)).length;
    const removed = existing.filter(t => !newIds.has(t.id)).length;
    
    let updated = 0;
    for (const talent of newTalents) {
      if (existingIds.has(talent.id)) {
        const existingTalent = existing.find(t => t.id === talent.id);
        if (JSON.stringify(existingTalent) !== JSON.stringify(talent)) {
          updated++;
        }
      }
    }
    
    // Replace all talents for this agency
    await db.talents.where('agency_id').equals(agencyId).delete();
    await db.talents.bulkPut(newTalents);
    
    return { added, updated, removed };
  } catch (error) {
    console.warn('[IndexedDB] Failed to merge talents:', error);
    return { added: 0, updated: 0, removed: 0 };
  }
}

// ============================================
// Sync Meta Operations
// ============================================

/**
 * Get sync metadata
 */
export async function getSyncMeta(key: string): Promise<SyncMeta | undefined> {
  return db.syncMeta.get(key);
}

/**
 * Update sync metadata
 */
export async function updateSyncMeta(
  key: string,
  data: Partial<Omit<SyncMeta, 'key'>>
): Promise<void> {
  await db.syncMeta.put({
    key,
    lastSync: Date.now(),
    version: CACHE_VERSION,
    ...data,
  });
}

// ============================================
// Mutation Queue Operations
// ============================================

/**
 * Queue a mutation for offline support
 */
export async function queueMutation(
  mutation: Omit<QueuedMutation, 'id' | 'timestamp' | 'status' | 'retryCount'>
): Promise<number> {
  const id = await db.mutations.add({
    ...mutation,
    timestamp: Date.now(),
    status: 'pending',
    retryCount: 0,
  });
  return id as number;
}

/**
 * Get pending mutations
 */
export async function getPendingMutations(): Promise<QueuedMutation[]> {
  return db.mutations.where('status').equals('pending').toArray();
}

/**
 * Update mutation status
 */
export async function updateMutationStatus(
  id: number,
  status: QueuedMutation['status'],
  error?: string
): Promise<void> {
  await db.mutations.update(id, { status, error });
}

/**
 * Clear completed mutations
 */
export async function clearCompletedMutations(): Promise<void> {
  await db.mutations.where('status').equals('completed').delete();
}

// ============================================
// Database Stats
// ============================================

/**
 * Get database statistics
 */
export async function getDbStats(): Promise<{
  talents: number;
  jobs: number;
  marketplace: number;
  queryCache: number;
  pendingMutations: number;
}> {
  const [talents, jobs, marketplace, queryCache, pendingMutations] = await Promise.all([
    db.talents.count(),
    db.jobs.count(),
    db.marketplace.count(),
    db.queryCache.count(),
    db.mutations.where('status').equals('pending').count(),
  ]);
  
  return { talents, jobs, marketplace, queryCache, pendingMutations };
}
