/**
 * Query Key Factory for React Query
 *
 * Standardized query key structure for consistent cache management.
 * Structure: [entity, subEntity?, id?, filters?]
 *
 * Benefits:
 * - Type-safe query keys
 * - Easy partial invalidation (invalidate all 'studio' queries)
 * - Consistent key structure across the app
 */

/**
 * User-related query keys
 */
export const userKeys = {
  /** Current authenticated user */
  me: ["user", "me"] as const,
  /** User profile by ID */
  profile: (id: string) => ["user", "profile", id] as const,
  /** User settings */
  settings: ["user", "settings"] as const,
  /** All users list (admin) */
  all: ["user", "all"] as const,
} as const;

/**
 * Studio-related query keys
 */
export const studioKeys = {
  /** Studio wallet balance */
  wallet: ["studio", "wallet"] as const,
  /** Studio presets/templates */
  presets: ["studio", "presets"] as const,
  /** Studio generations by type */
  generations: {
    /** All generations */
    all: ["studio", "generations"] as const,
    /** By generation type (image, video, image_to_video) */
    byType: (type: "image" | "video" | "image_to_video") =>
      ["studio", "generations", type] as const,
    /** Single generation by ID */
    detail: (id: string) => ["studio", "generations", id] as const,
  },
  /** Studio credits history */
  credits: ["studio", "credits"] as const,
} as const;

/**
 * Talent/Creator-related query keys
 */
export const talentKeys = {
  /** Talent portfolio by email */
  portfolio: (email: string) => ["talent", "portfolio", email] as const,
  /** Talent projects by email */
  projects: (email: string) => ["talent", "projects", email] as const,
  /** Job matches for talent */
  jobMatches: (email: string) => ["talent", "jobMatches", email] as const,
  /** Book-outs for talent */
  bookOuts: (talentId: string) => ["talent", "bookOuts", talentId] as const,
  /** Booking preferences */
  bookingPreferences: (talentId: string) =>
    ["talent", "bookingPreferences", talentId] as const,
  /** Licensing requests for talent */
  licensingRequests: (talentId: string) =>
    ["talent", "licensingRequests", talentId] as const,
  /** Notifications */
  notifications: (talentId: string) =>
    ["talent", "notifications", talentId] as const,
} as const;

/**
 * Agency-related query keys
 */
export const agencyKeys = {
  /** Agency dashboard data */
  dashboard: (agencyId: string) => ["agency", "dashboard", agencyId] as const,
  /** Agency roster (talent list) */
  roster: (agencyId: string) => ["agency", "roster", agencyId] as const,
  /** Agency clients/CRM */
  clients: {
    all: (agencyId: string) => ["agency", "clients", agencyId] as const,
    detail: (agencyId: string, clientId: string) =>
      ["agency", "clients", agencyId, clientId] as const,
  },
  /** Active licenses */
  licenses: (agencyId: string) => ["agency", "licenses", agencyId] as const,
  /** License templates */
  licenseTemplates: (agencyId: string) =>
    ["agency", "licenseTemplates", agencyId] as const,
  /** License submissions */
  licenseSubmissions: (agencyId: string) =>
    ["agency", "licenseSubmissions", agencyId] as const,
  /** Licensing requests */
  licensingRequests: (agencyId: string) =>
    ["agency", "licensingRequests", agencyId] as const,
  /** Brand connections */
  brandConnections: (agencyId: string) =>
    ["agency", "brandConnections", agencyId] as const,
  /** Agency payouts */
  payouts: (agencyId: string) => ["agency", "payouts", agencyId] as const,
} as const;

/**
 * Package-related query keys
 */
export const packageKeys = {
  /** All packages */
  all: ["packages"] as const,
  /** Packages by creator */
  byCreator: (creatorId: string) => ["packages", "creator", creatorId] as const,
  /** Single package detail */
  detail: (id: string) => ["packages", id] as const,
  /** Public package view (no auth) */
  public: (token: string) => ["packages", "public", token] as const,
  /** Package feedback */
  feedback: (packageId: string) => ["packages", packageId, "feedback"] as const,
} as const;

/**
 * Catalog-related query keys
 */
export const catalogKeys = {
  /** All catalogs */
  all: ["catalogs"] as const,
  /** Catalogs by agency */
  byAgency: (agencyId: string) => ["catalogs", "agency", agencyId] as const,
  /** Single catalog detail */
  detail: (id: string) => ["catalogs", id] as const,
  /** Public catalog view */
  public: (token: string) => ["catalogs", "public", token] as const,
} as const;

/**
 * Campaign-related query keys
 */
export const campaignKeys = {
  /** All campaigns */
  all: ["campaigns"] as const,
  /** Campaigns by brand */
  byBrand: (brandId: string) => ["campaigns", "brand", brandId] as const,
  /** Single campaign detail */
  detail: (id: string) => ["campaigns", id] as const,
  /** Campaign bookings */
  bookings: (campaignId: string) =>
    ["campaigns", campaignId, "bookings"] as const,
} as const;

/**
 * Booking-related query keys
 */
export const bookingKeys = {
  /** All bookings */
  all: ["bookings"] as const,
  /** Bookings by talent */
  byTalent: (talentId: string) => ["bookings", "talent", talentId] as const,
  /** Bookings by agency */
  byAgency: (agencyId: string) => ["bookings", "agency", agencyId] as const,
  /** Single booking detail */
  detail: (id: string) => ["bookings", id] as const,
  /** Booking deliverables */
  deliverables: (bookingId: string) =>
    ["bookings", bookingId, "deliverables"] as const,
} as const;

/**
 * Scouting-related query keys
 */
export const scoutingKeys = {
  /** Scouting events */
  events: ["scouting", "events"] as const,
  /** Scouting prospects */
  prospects: (eventId?: string) =>
    eventId
      ? (["scouting", "prospects", eventId] as const)
      : (["scouting", "prospects"] as const),
  /** Scouting trips */
  trips: ["scouting", "trips"] as const,
  /** Scouting offers */
  offers: ["scouting", "offers"] as const,
} as const;

/**
 * CRM-related query keys
 */
export const crmKeys = {
  /** All CRM contacts */
  contacts: (agencyId: string) => ["crm", "contacts", agencyId] as const,
  /** Single contact detail */
  contact: (agencyId: string, contactId: string) =>
    ["crm", "contacts", agencyId, contactId] as const,
  /** Communication logs */
  communications: (agencyId: string, clientId: string) =>
    ["crm", "communications", agencyId, clientId] as const,
} as const;

/**
 * Marketplace-related query keys
 */
export const marketplaceKeys = {
  /** Marketplace listings */
  all: ["marketplace"] as const,
  /** Filtered marketplace */
  filtered: (filters: Record<string, unknown>) =>
    ["marketplace", "filtered", filters] as const,
} as const;

/**
 * Combined query keys object for convenience
 */
export const queryKeys = {
  user: userKeys,
  studio: studioKeys,
  talent: talentKeys,
  agency: agencyKeys,
  packages: packageKeys,
  catalogs: catalogKeys,
  campaigns: campaignKeys,
  bookings: bookingKeys,
  scouting: scoutingKeys,
  crm: crmKeys,
  marketplace: marketplaceKeys,
} as const;

/**
 * Helper to invalidate all queries for an entity
 * Usage: queryClient.invalidateQueries({ queryKey: ['studio'] })
 */
export function getEntityRootKey(
  entity: keyof typeof queryKeys,
): readonly string[] {
  return [entity];
}
