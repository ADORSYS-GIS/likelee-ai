import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import {
  getAgencyRoster,
  getAgencyDashboardOverview,
  getAgencyTalentPerformance,
  getAgencyRevenueBreakdown,
  getAgencyLicensingPipeline,
  getAgencyRecentActivity,
  getAgencyProfile,
  getAgencyLicensingRequests,
  getAgencyBrandLicenseRequests,
  getAgencyBrandConnections,
  getAgencyActiveLicenses,
  getAgencyActiveLicensesStats,
  getAgencyClients,
  getAgencyTalents,
  getAgencyPayoutsAccountStatus,
  getAgencyPayoutBalance,
  getAgencyPayoutHistory,
  getAgencyBillingStatus,
  listAgencyTalentInvites,
  listAgencyClients,
  listAgencyOfferPackages,
  getAgencyDigitals,
} from "@/api/functions";
import {
  listCreatorAgencyInvites,
  listCreatorAgencyConnections,
} from "@/api/creatorAgencyConnection";
import { useAuth } from "@/auth/AuthProvider";
import { agencyKeys } from "@/lib/queryKeys";
import { queryOptions } from "@/lib/queryClient";

export function AgencyDataPrefetcher() {
  const { profile, initialized, authenticated } = useAuth();
  const queryClient = useQueryClient();
  const hasPrefetched = useRef(false);

  useEffect(() => {
    if (!initialized || !authenticated || !profile) return;
    if (profile.role !== "agency") return;
    if (hasPrefetched.current) return;

    hasPrefetched.current = true;

    const agencyId = profile.id;
    if (!agencyId) return;

    const prefetchDashboardOverview = async () => {
      try {
        await queryClient.prefetchQuery({
          queryKey: agencyKeys.dashboard(agencyId),
          queryFn: async () => {
            const resp = await getAgencyDashboardOverview();
            return resp?.data || resp || null;
          },
          ...queryOptions.moderate,
        });
      } catch (error) {
        console.error(
          "[AgencyDataPrefetcher] Failed to prefetch dashboard overview:",
          error,
        );
      }
    };

    const prefetchAgencyRoster = async () => {
      try {
        await queryClient.prefetchQuery({
          queryKey: agencyKeys.roster(agencyId),
          queryFn: async () => {
            const resp = await getAgencyRoster();
            return Array.isArray(resp?.roster) ? resp.roster : [];
          },
          ...queryOptions.moderate,
        });
      } catch (error) {
        console.error(
          "[AgencyDataPrefetcher] Failed to prefetch roster:",
          error,
        );
      }
    };

    const prefetchAgencyClients = async () => {
      try {
        await queryClient.prefetchQuery({
          queryKey: agencyKeys.clients.all(agencyId),
          queryFn: async () => {
            const resp = await getAgencyClients();
            return Array.isArray(resp?.clients) ? resp.clients : [];
          },
          ...queryOptions.moderate,
        });
      } catch (error) {
        console.error(
          "[AgencyDataPrefetcher] Failed to prefetch clients:",
          error,
        );
      }
    };

    const prefetchAgencyTalents = async () => {
      try {
        await queryClient.prefetchQuery({
          queryKey: agencyKeys.roster(agencyId),
          queryFn: async () => {
            const resp = await getAgencyTalents({});
            return Array.isArray(resp?.talents) ? resp.talents : [];
          },
          ...queryOptions.moderate,
        });
      } catch (error) {
        console.error(
          "[AgencyDataPrefetcher] Failed to prefetch talents:",
          error,
        );
      }
    };

    const prefetchActiveLicenses = async () => {
      try {
        await Promise.all([
          queryClient.prefetchQuery({
            queryKey: agencyKeys.licenses(agencyId),
            queryFn: async () => {
              const resp = await getAgencyActiveLicenses();
              return Array.isArray(resp?.licenses) ? resp.licenses : [];
            },
            ...queryOptions.frequent,
          }),
          queryClient.prefetchQuery({
            queryKey: agencyKeys.licenses(agencyId),
            queryFn: async () => {
              const resp = await getAgencyActiveLicensesStats();
              return resp?.stats || resp || null;
            },
            ...queryOptions.frequent,
          }),
        ]);
      } catch (error) {
        console.error(
          "[AgencyDataPrefetcher] Failed to prefetch licenses:",
          error,
        );
      }
    };

    const prefetchLicensingRequests = async () => {
      try {
        await Promise.all([
          queryClient.prefetchQuery({
            queryKey: agencyKeys.licensingRequests(agencyId),
            queryFn: async () => {
              const resp = await getAgencyLicensingRequests();
              return Array.isArray(resp?.requests) ? resp.requests : [];
            },
            ...queryOptions.frequent,
          }),
          queryClient.prefetchQuery({
            queryKey: [...agencyKeys.licensingRequests(agencyId), "brand"],
            queryFn: async () => {
              const resp = await getAgencyBrandLicenseRequests();
              return Array.isArray(resp?.requests) ? resp.requests : [];
            },
            ...queryOptions.frequent,
          }),
        ]);
      } catch (error) {
        console.error(
          "[AgencyDataPrefetcher] Failed to prefetch licensing requests:",
          error,
        );
      }
    };

    const prefetchBrandConnections = async () => {
      try {
        await queryClient.prefetchQuery({
          queryKey: agencyKeys.brandConnections(agencyId),
          queryFn: async () => {
            const resp = await getAgencyBrandConnections();
            return Array.isArray(resp?.connections) ? resp.connections : [];
          },
          ...queryOptions.moderate,
        });
      } catch (error) {
        console.error(
          "[AgencyDataPrefetcher] Failed to prefetch brand connections:",
          error,
        );
      }
    };

    const prefetchPayoutData = async () => {
      try {
        await Promise.all([
          queryClient.prefetchQuery({
            queryKey: agencyKeys.payouts(agencyId),
            queryFn: async () => {
              return getAgencyPayoutsAccountStatus().catch(() => null);
            },
            ...queryOptions.moderate,
          }),
          queryClient.prefetchQuery({
            queryKey: [...agencyKeys.payouts(agencyId), "balance"],
            queryFn: async () => {
              return getAgencyPayoutBalance().catch(() => null);
            },
            ...queryOptions.moderate,
          }),
          queryClient.prefetchQuery({
            queryKey: [...agencyKeys.payouts(agencyId), "history"],
            queryFn: async () => {
              const resp = await getAgencyPayoutHistory().catch(() => null);
              return Array.isArray(resp?.history) ? resp.history : [];
            },
            ...queryOptions.moderate,
          }),
        ]);
      } catch (error) {
        console.error(
          "[AgencyDataPrefetcher] Failed to prefetch payout data:",
          error,
        );
      }
    };

    const prefetchBillingStatus = async () => {
      try {
        await queryClient.prefetchQuery({
          queryKey: ["agency", "billing", "status", agencyId],
          queryFn: async () => {
            return getAgencyBillingStatus().catch(() => null);
          },
          ...queryOptions.session,
        });
      } catch (error) {
        console.error(
          "[AgencyDataPrefetcher] Failed to prefetch billing status:",
          error,
        );
      }
    };

    const prefetchTalentInvites = async () => {
      try {
        await queryClient.prefetchQuery({
          queryKey: ["agency", "talent-invites", agencyId],
          queryFn: async () => {
            const resp = await listAgencyTalentInvites();
            return Array.isArray(resp?.invites) ? resp.invites : [];
          },
          ...queryOptions.moderate,
        });
      } catch (error) {
        console.error(
          "[AgencyDataPrefetcher] Failed to prefetch talent invites:",
          error,
        );
      }
    };

    const prefetchOfferPackages = async () => {
      try {
        await queryClient.prefetchQuery({
          queryKey: ["agency", "offer-packages", agencyId],
          queryFn: async () => {
            const resp = await listAgencyOfferPackages();
            return Array.isArray(resp?.packages) ? resp.packages : [];
          },
          ...queryOptions.moderate,
        });
      } catch (error) {
        console.error(
          "[AgencyDataPrefetcher] Failed to prefetch offer packages:",
          error,
        );
      }
    };

    const prefetchAgencyProfile = async () => {
      try {
        await queryClient.prefetchQuery({
          queryKey: ["agency", "profile", agencyId],
          queryFn: async () => {
            const resp = await getAgencyProfile();
            return resp?.data || resp || null;
          },
          ...queryOptions.session,
        });
      } catch (error) {
        console.error(
          "[AgencyDataPrefetcher] Failed to prefetch profile:",
          error,
        );
      }
    };

    const prefetchAnalyticsData = async () => {
      try {
        await Promise.all([
          queryClient.prefetchQuery({
            queryKey: ["agency", "analytics", "performance", agencyId],
            queryFn: async () => {
              const resp = await getAgencyTalentPerformance();
              return resp?.data || resp || null;
            },
            ...queryOptions.moderate,
          }),
          queryClient.prefetchQuery({
            queryKey: ["agency", "analytics", "revenue", agencyId],
            queryFn: async () => {
              const resp = await getAgencyRevenueBreakdown();
              return resp?.data || resp || null;
            },
            ...queryOptions.moderate,
          }),
          queryClient.prefetchQuery({
            queryKey: ["agency", "analytics", "pipeline", agencyId],
            queryFn: async () => {
              const resp = await getAgencyLicensingPipeline();
              return resp?.data || resp || null;
            },
            ...queryOptions.moderate,
          }),
        ]);
      } catch (error) {
        console.error(
          "[AgencyDataPrefetcher] Failed to prefetch analytics data:",
          error,
        );
      }
    };

    const prefetchDigitals = async () => {
      try {
        await queryClient.prefetchQuery({
          queryKey: ["agency", "digitals", agencyId],
          queryFn: async () => {
            const resp = await getAgencyDigitals();
            return Array.isArray(resp?.digitals) ? resp.digitals : [];
          },
          ...queryOptions.moderate,
        });
      } catch (error) {
        console.error(
          "[AgencyDataPrefetcher] Failed to prefetch digitals:",
          error,
        );
      }
    };

    const prefetchRecentActivity = async () => {
      try {
        await queryClient.prefetchQuery({
          queryKey: ["agency", "activity", agencyId],
          queryFn: async () => {
            const resp = await getAgencyRecentActivity();
            return Array.isArray(resp?.activity) ? resp.activity : [];
          },
          ...queryOptions.frequent,
        });
      } catch (error) {
        console.error(
          "[AgencyDataPrefetcher] Failed to prefetch recent activity:",
          error,
        );
      }
    };

    // Execute all prefetch operations
    prefetchDashboardOverview();
    prefetchAgencyRoster();
    prefetchAgencyClients();
    prefetchAgencyTalents();
    prefetchActiveLicenses();
    prefetchLicensingRequests();
    prefetchBrandConnections();
    prefetchPayoutData();
    prefetchBillingStatus();
    prefetchTalentInvites();
    prefetchOfferPackages();
    prefetchAgencyProfile();
    prefetchAnalyticsData();
    prefetchDigitals();
    prefetchRecentActivity();
  }, [initialized, authenticated, profile, queryClient]);

  return null;
}
