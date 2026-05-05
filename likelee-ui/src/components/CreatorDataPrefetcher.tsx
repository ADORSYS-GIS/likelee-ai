import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import {
  getKycStatus,
  getCreatorBillingStatus,
  listTalentBookings,
  listTalentLicensingRequests,
  listTalentAssetRequests,
  listTalentLicenses,
  getTalentPayoutAccountStatus,
  getTalentPayoutBalance,
} from "@/api/functions";
import {
  listCreatorAgencyConnections,
  listCreatorAgencyInvites,
} from "@/api/creatorAgencyConnection";
import { useAuth } from "@/auth/AuthProvider";
import { creatorKeys, talentKeys } from "@/lib/queryKeys";
import { queryOptions } from "@/lib/queryClient";

export function CreatorDataPrefetcher() {
  const { profile, initialized, authenticated } = useAuth();
  const queryClient = useQueryClient();
  const hasPrefetched = useRef(false);

  useEffect(() => {
    if (!initialized || !authenticated || !profile) return;
    if (profile.role !== "talent") return;
    if (hasPrefetched.current) return;

    hasPrefetched.current = true;

    const creatorId = profile.id;
    if (!creatorId) return;

    const prefetchDashboardData = async () => {
      try {
        await queryClient.prefetchQuery({
          queryKey: creatorKeys.dashboard,
          queryFn: async () => {
            const resp = await base44.get<{
              creator?: any;
              agencies?: any[];
              invites?: any[];
              metrics?: any;
            }>("/dashboard");
            return resp || null;
          },
          ...queryOptions.moderate,
        });
      } catch (error) {
        console.error(
          "[CreatorDataPrefetcher] Failed to prefetch dashboard:",
          error,
        );
      }
    };

    const prefetchCreatorRates = async () => {
      try {
        await queryClient.prefetchQuery({
          queryKey: creatorKeys.rates,
          queryFn: async () => {
            const resp = await base44.get<{
              rates?: any[];
              custom_rates?: any[];
            }>("/creator-rates");
            return resp?.rates || [];
          },
          ...queryOptions.moderate,
        });
      } catch (error) {
        console.error(
          "[CreatorDataPrefetcher] Failed to prefetch rates:",
          error,
        );
      }
    };

    const prefetchBillingStatus = async () => {
      try {
        await queryClient.prefetchQuery({
          queryKey: creatorKeys.billing,
          queryFn: async () => {
            return getCreatorBillingStatus().catch(() => null);
          },
          ...queryOptions.session,
        });
      } catch (error) {
        console.error(
          "[CreatorDataPrefetcher] Failed to prefetch billing status:",
          error,
        );
      }
    };

    const prefetchBrandConnections = async () => {
      try {
        await Promise.all([
          queryClient.prefetchQuery({
            queryKey: creatorKeys.brandConnections.connections,
            queryFn: async () => {
              const resp = await listCreatorAgencyConnections();
              return Array.isArray(resp) ? resp : [];
            },
            ...queryOptions.moderate,
          }),
          queryClient.prefetchQuery({
            queryKey: creatorKeys.brandConnections.requests,
            queryFn: async () => {
              const resp = await listCreatorAgencyInvites();
              return Array.isArray(resp) ? resp : [];
            },
            ...queryOptions.frequent,
          }),
        ]);
      } catch (error) {
        console.error(
          "[CreatorDataPrefetcher] Failed to prefetch brand connections:",
          error,
        );
      }
    };

    const prefetchBrandOffers = async () => {
      try {
        await queryClient.prefetchQuery({
          queryKey: creatorKeys.brandOffers,
          queryFn: async () => {
            const resp = await base44.get<{
              offers?: any[];
              brand_requests?: any[];
            }>("/creator/brand-offers");
            return {
              offers: Array.isArray(resp?.offers) ? resp.offers : [],
              brandRequests: Array.isArray(resp?.brand_requests)
                ? resp.brand_requests
                : [],
            };
          },
          ...queryOptions.frequent,
        });
      } catch (error) {
        console.error(
          "[CreatorDataPrefetcher] Failed to prefetch brand offers:",
          error,
        );
      }
    };

    const prefetchJobInvites = async () => {
      try {
        await queryClient.prefetchQuery({
          queryKey: creatorKeys.jobInvites,
          queryFn: async () => {
            const resp = await base44.get<{ invites?: any[] }>(
              "/api/creator/job-invites",
            );
            return Array.isArray(resp?.invites) ? resp.invites : [];
          },
          ...queryOptions.frequent,
        });
      } catch (error) {
        console.error(
          "[CreatorDataPrefetcher] Failed to prefetch job invites:",
          error,
        );
      }
    };

    const prefetchAssetRequests = async () => {
      try {
        await queryClient.prefetchQuery({
          queryKey: creatorKeys.assetRequests,
          queryFn: async () => {
            const resp = await listTalentAssetRequests();
            return Array.isArray(resp?.requests) ? resp.requests : [];
          },
          ...queryOptions.frequent,
        });
      } catch (error) {
        console.error(
          "[CreatorDataPrefetcher] Failed to prefetch asset requests:",
          error,
        );
      }
    };

    const prefetchBookings = async () => {
      try {
        await queryClient.prefetchQuery({
          queryKey: creatorKeys.bookings,
          queryFn: async () => {
            const resp = await listTalentBookings();
            return Array.isArray(resp?.bookings) ? resp.bookings : [];
          },
          ...queryOptions.frequent,
        });
      } catch (error) {
        console.error(
          "[CreatorDataPrefetcher] Failed to prefetch bookings:",
          error,
        );
      }
    };

    const prefetchKycStatus = async () => {
      try {
        await queryClient.prefetchQuery({
          queryKey: creatorKeys.verification,
          queryFn: async () => {
            return getKycStatus().catch(() => ({ status: "not_started" }));
          },
          ...queryOptions.moderate,
        });
      } catch (error) {
        console.error(
          "[CreatorDataPrefetcher] Failed to prefetch KYC status:",
          error,
        );
      }
    };

    const prefetchPayoutData = async () => {
      try {
        await Promise.all([
          queryClient.prefetchQuery({
            queryKey: [...creatorKeys.billing, "payout-status"],
            queryFn: async () => {
              return getTalentPayoutAccountStatus().catch(() => null);
            },
            ...queryOptions.moderate,
          }),
          queryClient.prefetchQuery({
            queryKey: [...creatorKeys.billing, "payout-balance"],
            queryFn: async () => {
              return getTalentPayoutBalance().catch(() => null);
            },
            ...queryOptions.moderate,
          }),
        ]);
      } catch (error) {
        console.error(
          "[CreatorDataPrefetcher] Failed to prefetch payout data:",
          error,
        );
      }
    };

    const prefetchLicenses = async () => {
      try {
        await Promise.all([
          queryClient.prefetchQuery({
            queryKey: talentKeys.licensingRequests(creatorId),
            queryFn: async () => {
              const resp = await listTalentLicensingRequests();
              return Array.isArray(resp?.requests) ? resp.requests : [];
            },
            ...queryOptions.frequent,
          }),
          queryClient.prefetchQuery({
            queryKey: ["talent", "licenses", creatorId],
            queryFn: async () => {
              const resp = await listTalentLicenses();
              return Array.isArray(resp?.licenses) ? resp.licenses : [];
            },
            ...queryOptions.frequent,
          }),
        ]);
      } catch (error) {
        console.error(
          "[CreatorDataPrefetcher] Failed to prefetch licenses:",
          error,
        );
      }
    };

    const prefetchReferenceImages = async () => {
      try {
        await queryClient.prefetchQuery({
          queryKey: ["creator", "reference-images", creatorId],
          queryFn: async () => {
            const resp = await base44.get<{
              reference_images?: any[];
            }>("/reference-images");
            return Array.isArray(resp?.reference_images)
              ? resp.reference_images
              : [];
          },
          ...queryOptions.moderate,
        });
      } catch (error) {
        console.error(
          "[CreatorDataPrefetcher] Failed to prefetch reference images:",
          error,
        );
      }
    };

    const prefetchVoiceRecordings = async () => {
      try {
        await queryClient.prefetchQuery({
          queryKey: ["creator", "voice-recordings", creatorId],
          queryFn: async () => {
            const resp = await base44.get<{
              recordings?: any[];
            }>("/voice/recordings");
            return Array.isArray(resp?.recordings) ? resp.recordings : [];
          },
          ...queryOptions.moderate,
        });
      } catch (error) {
        console.error(
          "[CreatorDataPrefetcher] Failed to prefetch voice recordings:",
          error,
        );
      }
    };

    // Execute all prefetch operations
    prefetchDashboardData();
    prefetchCreatorRates();
    prefetchBillingStatus();
    prefetchBrandConnections();
    prefetchBrandOffers();
    prefetchJobInvites();
    prefetchAssetRequests();
    prefetchBookings();
    prefetchKycStatus();
    prefetchPayoutData();
    prefetchLicenses();
    prefetchReferenceImages();
    prefetchVoiceRecordings();
  }, [initialized, authenticated, profile, queryClient]);

  return null;
}
