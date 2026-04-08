import React from "react";
import { useAuth } from "@/auth/AuthProvider";

export type TeamAccessContext = {
  organization_type: string;
  organization_id: string;
  organization_name: string;
  membership_role: string;
  permissions: string[];
};

async function parseApiResponse(resp: Response) {
  const raw = await resp.text();
  if (!raw.trim()) return {};

  try {
    return JSON.parse(raw);
  } catch {
    return {
      status: resp.ok ? "success" : "error",
      message: raw.trim(),
    };
  }
}

function getAccessCacheKey(organizationType: string) {
  return `team_access_context:${organizationType}`;
}

export function useTeamAccess(explicitOrganizationType?: "agency" | "brand") {
  const { token, profile, initialized, authenticated } = useAuth();
  const organizationType = React.useMemo(() => {
    const explicit = String(explicitOrganizationType || "")
      .trim()
      .toLowerCase();
    if (explicit === "agency" || explicit === "brand") return explicit;

    const fromProfile = String(
      (profile as any)?.organization_type || profile?.role || "",
    )
      .trim()
      .toLowerCase();
    return fromProfile === "agency" || fromProfile === "brand"
      ? fromProfile
      : "";
  }, [explicitOrganizationType, profile]);
  const [context, setContext] = React.useState<TeamAccessContext | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!initialized || !authenticated || !token || !organizationType) {
      setContext(null);
      setLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;
    const cachedRaw = window.sessionStorage.getItem(
      getAccessCacheKey(organizationType),
    );
    if (cachedRaw) {
      try {
        const cached = JSON.parse(cachedRaw) as TeamAccessContext;
        setContext(cached);
      } catch {
        window.sessionStorage.removeItem(getAccessCacheKey(organizationType));
      }
    }

    const load = async () => {
      try {
        setLoading(!cachedRaw);
        setError(null);
        const resp = await fetch(
          `/api/team/context?organization_type=${encodeURIComponent(organizationType)}&include_details=false`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        );
        const payload = await parseApiResponse(resp);
        if (!resp.ok) {
          throw new Error(
            payload?.message || payload?.error || "Failed to load team access.",
          );
        }
        if (!cancelled) {
          const nextContext = payload as TeamAccessContext;
          setContext(nextContext);
          window.sessionStorage.setItem(
            getAccessCacheKey(organizationType),
            JSON.stringify(nextContext),
          );
        }
      } catch (err: any) {
        if (!cancelled) {
          if (!cachedRaw) {
            setContext(null);
          }
          setError(err?.message || "Failed to load team access.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [authenticated, initialized, organizationType, token]);

  const hasPermission = React.useCallback(
    (permission: string) =>
      Boolean(context?.permissions?.includes(String(permission || "").trim())),
    [context?.permissions],
  );

  return {
    organizationType,
    context,
    loading,
    error,
    hasPermission,
  };
}
