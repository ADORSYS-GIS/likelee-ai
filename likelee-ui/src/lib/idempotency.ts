/**
 * Idempotency Key Utilities
 *
 * Generate and manage idempotency keys for safe mutation retries.
 * When a request includes an Idempotency-Key header, the backend
 * caches the response for 24 hours and returns the same result
 * for duplicate requests.
 *
 * Use cases:
 * - Network timeouts where you're unsure if the request succeeded
 * - Retry button on failed mutations
 * - Double-click prevention on form submissions
 */

/**
 * Generate a UUID v4 idempotency key
 */
export function generateIdempotencyKey(): string {
  // Use crypto.randomUUID if available (modern browsers)
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  
  // Fallback: generate UUID v4 manually
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Create headers with idempotency key
 *
 * @param existingHeaders - Existing headers to merge with
 * @param key - Optional specific key (generates new one if not provided)
 * @returns Headers object with Idempotency-Key
 */
export function withIdempotencyKey(
  existingHeaders: Record<string, string> = {},
  key?: string
): Record<string, string> {
  const idempotencyKey = key ?? generateIdempotencyKey();
  return {
    ...existingHeaders,
    'Idempotency-Key': idempotencyKey,
  };
}

/**
 * Storage for pending idempotency keys
 * Used to track in-flight mutations and prevent double-submission
 */
const pendingKeys = new Map<string, Promise<unknown>>();

/**
 * Track a pending mutation with its idempotency key
 * Prevents duplicate submissions while a mutation is in flight
 *
 * @param key - Idempotency key
 * @param mutationPromise - The mutation promise to track
 * @returns The same promise (for chaining)
 */
export function trackPendingMutation<T>(
  key: string,
  mutationPromise: Promise<T>
): Promise<T> {
  pendingKeys.set(key, mutationPromise);
  
  // Auto-cleanup when resolved
  mutationPromise
    .finally(() => {
      pendingKeys.delete(key);
    })
    .catch(() => {
      // Error handled by caller
    });
  
  return mutationPromise;
}

/**
 * Check if an idempotency key has a pending mutation
 */
export function isPendingKey(key: string): boolean {
  return pendingKeys.has(key);
}

/**
 * Get the pending promise for an idempotency key
 * Useful for awaiting an in-flight request instead of creating a new one
 */
export function getPendingPromise<T>(key: string): Promise<T> | undefined {
  return pendingKeys.get(key) as Promise<T> | undefined;
}

/**
 * Clear all pending mutations (e.g., on logout)
 */
export function clearPendingMutations(): void {
  pendingKeys.clear();
}

/**
 * React hook for idempotent mutations
 *
 * Usage:
 * ```tsx
 * const { mutate, isPending, idempotencyKey } = useIdempotentMutation({
 *   mutationFn: (data) => base44.post('/api/resource', data),
 *   onSuccess: () => queryClient.invalidateQueries({ queryKey: ['resource'] }),
 * });
 * ```
 */
export function useIdempotentMutationOptions<TData = unknown, TVariables = unknown>(
  options: {
    mutationFn: (variables: TVariables, idempotencyKey: string) => Promise<TData>;
    onSuccess?: (data: TData, variables: TVariables) => void | Promise<void>;
    onError?: (error: Error, variables: TVariables) => void;
    onSettled?: (data: TData | undefined, error: Error | null, variables: TVariables) => void;
  }
) {
  const idempotencyKey = generateIdempotencyKey();
  
  return {
    mutationFn: async (variables: TVariables) => {
      // Check for pending mutation with same key
      if (isPendingKey(idempotencyKey)) {
        return getPendingPromise<TData>(idempotencyKey)!;
      }
      
      const promise = options.mutationFn(variables, idempotencyKey);
      return trackPendingMutation(idempotencyKey, promise);
    },
    onSuccess: options.onSuccess,
    onError: options.onError,
    onSettled: options.onSettled,
    meta: { idempotencyKey },
  };
}

/**
 * Helper to extract idempotency key from mutation context
 */
export function getIdempotencyKeyFromContext(
  context: unknown
): string | undefined {
  if (typeof context === 'object' && context !== null && 'meta' in context) {
    return (context as { meta?: { idempotencyKey?: string } }).meta?.idempotencyKey;
  }
  return undefined;
}
