import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import {
  getBrandBillingStatus,
  getBrandSpendAnalytics,
  listBrandInvoices,
  getBrandBudgetSettings,
  getBrandLicensingRequests,
} from "@/api/functions";
import { listGenerations } from "@/api/studio";
import { useAuth } from "@/auth/AuthProvider";
import { brandKeys } from "@/lib/queryKeys";
import { queryOptions } from "@/lib/queryClient";

export function BrandDataPrefetcher() {
  const { profile, initialized, authenticated } = useAuth();
  const queryClient = useQueryClient();
  const hasPrefetched = useRef(false);

  useEffect(() => {
    if (!initialized || !authenticated || !profile) return;
    if (profile.role !== "brand") return;
    if (hasPrefetched.current) return;

    hasPrefetched.current = true;

    const prefetchBrandJobs = async () => {
      try {
        await queryClient.prefetchQuery({
          queryKey: brandKeys.jobs.all,
          queryFn: async () => {
            const res = await base44.get<{ jobs?: any[] }>("/api/jobs/my");
            return Array.isArray(res?.jobs) ? res.jobs : [];
          },
          ...queryOptions.moderate,
        });
      } catch (error) {
        console.error(
          "[BrandDataPrefetcher] Failed to prefetch jobs:",
          error,
        );
      }
    };

    const prefetchBrandInbox = async () => {
      try {
        await queryClient.prefetchQuery({
          queryKey: brandKeys.inbox.packages,
          queryFn: async () => {
            const response = await base44.get<{ packages?: any[] }>(
              "/api/brand/inbox/packages",
            );
            const pkgs = Array.isArray(response?.packages)
              ? response.packages
              : [];
            return {
              packages: pkgs,
              pendingCount: pkgs.filter(
                (p: any) => String(p?.status || "") === "sent",
              ).length,
            };
          },
          ...queryOptions.frequent,
        });
      } catch (error) {
        console.error(
          "[BrandDataPrefetcher] Failed to prefetch inbox:",
          error,
        );
      }
    };

    const prefetchCampaignMetrics = async () => {
      try {
        await queryClient.prefetchQuery({
          queryKey: brandKeys.campaignMetrics,
          queryFn: async () => {
            return base44.get<{
              active_projects_count?: number;
              pending_approvals_count?: number;
              action_needed?: boolean;
              avg_turnaround_hours?: number;
            }>("/api/brand/campaigns/metrics", {});
          },
          ...queryOptions.frequent,
        });
      } catch (error) {
        console.error(
          "[BrandDataPrefetcher] Failed to prefetch campaign metrics:",
          error,
        );
      }
    };

    const prefetchBrandAnalytics = async () => {
      try {
        await queryClient.prefetchQuery({
          queryKey: brandKeys.analytics,
          queryFn: async () => {
            return base44.get<{
              total_projects_ytd?: number;
              talent_performance?: any[];
            }>("/api/brand/analytics", {});
          },
          ...queryOptions.moderate,
        });
      } catch (error) {
        console.error(
          "[BrandDataPrefetcher] Failed to prefetch analytics:",
          error,
        );
      }
    };

    const prefetchActivityEvents = async () => {
      try {
        await queryClient.prefetchQuery({
          queryKey: brandKeys.activityEvents,
          queryFn: async () => {
            const res = await base44.get<{ events?: any[] }>(
              "/api/brand/activity-events",
              { params: { limit: 10 } },
            );
            return Array.isArray(res?.events) ? res.events : [];
          },
          ...queryOptions.frequent,
        });
      } catch (error) {
        console.error(
          "[BrandDataPrefetcher] Failed to prefetch activity events:",
          error,
        );
      }
    };

    const prefetchCampaignOffers = async () => {
      try {
        await queryClient.prefetchQuery({
          queryKey: brandKeys.offers.all,
          queryFn: async () => {
            const response = await base44.get<{ offers?: any[] }>(
              "/api/campaign-offers/my",
              { params: { limit: 120 } },
            );
            return Array.isArray(response?.offers) ? response.offers : [];
          },
          ...queryOptions.moderate,
        });
      } catch (error) {
        console.error(
          "[BrandDataPrefetcher] Failed to prefetch campaign offers:",
          error,
        );
      }
    };

    const prefetchLicensingRequests = async () => {
      try {
        await queryClient.prefetchQuery({
          queryKey: brandKeys.licensingRequests,
          queryFn: async () => {
            const resp = await getBrandLicensingRequests();
            return Array.isArray(resp) ? resp : resp?.requests || [];
          },
          ...queryOptions.frequent,
        });
      } catch (error) {
        console.error(
          "[BrandDataPrefetcher] Failed to prefetch licensing requests:",
          error,
        );
      }
    };

    const prefetchBillingData = async () => {
      try {
        await queryClient.prefetchQuery({
          queryKey: brandKeys.billing.status,
          queryFn: async () => {
            return getBrandBillingStatus().catch(() => null);
          },
          ...queryOptions.moderate,
        });
      } catch (error) {
        console.error(
          "[BrandDataPrefetcher] Failed to prefetch billing status:",
          error,
        );
      }
    };

    const prefetchSpendAnalytics = async () => {
      try {
        await queryClient.prefetchQuery({
          queryKey: brandKeys.billing.spend,
          queryFn: async () => {
            return getBrandSpendAnalytics().catch(() => null);
          },
          ...queryOptions.moderate,
        });
      } catch (error) {
        console.error(
          "[BrandDataPrefetcher] Failed to prefetch spend analytics:",
          error,
        );
      }
    };

    const prefetchInvoices = async () => {
      try {
        await queryClient.prefetchQuery({
          queryKey: brandKeys.billing.invoices,
          queryFn: async () => {
            const resp = await listBrandInvoices().catch(() => null);
            return Array.isArray(resp?.invoices) ? resp.invoices : [];
          },
          ...queryOptions.moderate,
        });
      } catch (error) {
        console.error(
          "[BrandDataPrefetcher] Failed to prefetch invoices:",
          error,
        );
      }
    };

    const prefetchBudgetSettings = async () => {
      try {
        await queryClient.prefetchQuery({
          queryKey: brandKeys.billing.budgetSettings,
          queryFn: async () => {
            return getBrandBudgetSettings().catch(() => null);
          },
          ...queryOptions.session,
        });
      } catch (error) {
        console.error(
          "[BrandDataPrefetcher] Failed to prefetch budget settings:",
          error,
        );
      }
    };

    const prefetchStudioData = async () => {
      try {
        await Promise.all([
          queryClient.prefetchQuery({
            queryKey: brandKeys.studio.generations,
            queryFn: async () => {
              return listGenerations({ limit: 100 }).catch(() => []);
            },
            ...queryOptions.moderate,
          }),
          queryClient.prefetchQuery({
            queryKey: brandKeys.studio.files,
            queryFn: async () => {
              const { listBrandStorageFilesPaged } = await import(
                "@/api/functions"
              );
              return listBrandStorageFilesPaged({ limit: 100 }).catch(
                () => [],
              );
            },
            ...queryOptions.moderate,
          }),
          queryClient.prefetchQuery({
            queryKey: brandKeys.studio.folders,
            queryFn: async () => {
              const { listBrandStorageFoldersPaged } = await import(
                "@/api/functions"
              );
              return listBrandStorageFoldersPaged().catch(() => []);
            },
            ...queryOptions.moderate,
          }),
        ]);
      } catch (error) {
        console.error(
          "[BrandDataPrefetcher] Failed to prefetch studio data:",
          error,
        );
      }
    };

    prefetchBrandJobs();
    prefetchBrandInbox();
    prefetchCampaignMetrics();
    prefetchBrandAnalytics();
    prefetchActivityEvents();
    prefetchCampaignOffers();
    prefetchLicensingRequests();
    prefetchBillingData();
    prefetchSpendAnalytics();
    prefetchInvoices();
    prefetchBudgetSettings();
    prefetchStudioData();
  }, [initialized, authenticated, profile, queryClient]);

  return null;
}
