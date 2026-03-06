export const CREATOR_OFFERS_STORAGE_KEY = "likelee_creator_offers_v1";

export type StoredCreatorOffer = {
  id: string;
  campaign_id: string;
  campaign_name: string;
  brand_name: string;
  creator_id: string;
  creator_name: string;
  creator_avatar_url?: string;
  status: "pending" | "accepted" | "declined";
  created_at: string;
  due_date?: string;
  brief: Record<string, any>;
  campaign_details: Record<string, any>;
  offer_amount?: string;
};

export function readStoredCreatorOffers(): StoredCreatorOffer[] {
  try {
    const raw = window.localStorage.getItem(CREATOR_OFFERS_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function writeStoredCreatorOffers(offers: StoredCreatorOffer[]) {
  try {
    window.localStorage.setItem(
      CREATOR_OFFERS_STORAGE_KEY,
      JSON.stringify(offers),
    );
  } catch {
    // best effort local persistence for demo flow
  }
}
