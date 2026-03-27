export type KycSessionScope = "creator" | "agency" | "reserve-profile";

const getStorage = () => {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
};

const buildKycSessionStorageKey = (scope: KycSessionScope, userId: string) =>
  `likelee:${scope}:kyc-session-url:${userId}`;

export const loadStoredKycSessionUrl = (
  scope: KycSessionScope,
  userId?: string | null,
) => {
  if (!userId) return null;
  const storage = getStorage();
  if (!storage) return null;

  const rawValue = storage.getItem(buildKycSessionStorageKey(scope, userId));
  const value = rawValue?.trim();
  return value ? value : null;
};

export const storeKycSessionUrl = (
  scope: KycSessionScope,
  userId: string,
  sessionUrl: string,
) => {
  const storage = getStorage();
  if (!storage || !sessionUrl.trim()) return;

  storage.setItem(
    buildKycSessionStorageKey(scope, userId),
    sessionUrl.trim(),
  );
};

export const clearStoredKycSessionUrl = (
  scope: KycSessionScope,
  userId?: string | null,
) => {
  if (!userId) return;
  const storage = getStorage();
  if (!storage) return;

  storage.removeItem(buildKycSessionStorageKey(scope, userId));
};
