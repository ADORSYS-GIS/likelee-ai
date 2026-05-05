import React, { useState } from "react";

import { useAuth } from "@/auth/AuthProvider";
import type { Profile } from "@/auth/AuthProvider";
import { toast } from "@/components/ui/use-toast";
import { useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Eye, EyeOff } from "lucide-react";
import { getDashboardPath } from "@/auth/onboarding";
import { getBrandProfile, getAgencyProfile } from "@/api/functions";
//import Layout from "./Layout";

type UserRole = "brand" | "agency" | "creator";

// Helper to check if error is a 404 (profile not found)
function isNotFoundError(error: any): boolean {
  return error?.status === 404 || error?.data?.code === "profile_not_found";
}

export default function UpdatePassword() {
  const { t } = useTranslation("auth");
  const { supabase } = useAuth();
  const location = useLocation();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const withInviteAcceptIntent = (path: string) => {
    if (!path.startsWith("/invite/agency/")) return path;
    const [pathname, query = ""] = path.split("?");
    const params = new URLSearchParams(query);
    if (!params.get("intent")) {
      params.set("intent", "accept");
    }
    const q = params.toString();
    return q ? `${pathname}?${q}` : pathname;
  };

  return (
    <div className="max-w-md mx-auto px-6 py-16">
      <h1 className="text-2xl font-bold mb-4">
        {t("updatePassword.title", "Update your password")}
      </h1>
      <form
        className="space-y-4"
        onSubmit={async (e) => {
          e.preventDefault();
          if (password !== confirmPassword) {
            setError(
              t(
                "updatePassword.errors.passwordMismatch",
                "Passwords do not match",
              ),
            );
            return;
          }
          setError(null);
          setMessage(null);
          setLoading(true);
          try {
            const { error } = await supabase.auth.updateUser({ password });
            if (error) {
              throw error;
            }
            setMessage(t("updatePassword.toasts.passwordUpdated"));
            toast({
              title: t("common.success"),
              description: t("updatePassword.toasts.passwordUpdated"),
            });

            const params = new URLSearchParams(location.search);
            const next = params.get("next") || "";

            // If there's a next parameter, use it; otherwise redirect to appropriate dashboard
            let nextPath: string;
            if (next.startsWith("/")) {
              nextPath = withInviteAcceptIntent(next);
            } else {
              // Determine user role by checking which profile exists
              // Only treat 404 as "profile doesn't exist", other errors redirect to login
              let role: UserRole = "creator"; // default fallback

              try {
                // Try to fetch brand profile first
                await getBrandProfile();
                role = "brand";
              } catch (brandError: any) {
                // Only proceed to check agency if brand profile truly doesn't exist (404)
                if (isNotFoundError(brandError)) {
                  try {
                    await getAgencyProfile();
                    role = "agency";
                  } catch (agencyError: any) {
                    // If agency also returns 404, default to creator
                    // If it's another error (network, 500, etc), redirect to login for safety
                    if (!isNotFoundError(agencyError)) {
                      console.error("Failed to fetch profiles:", {
                        brandError,
                        agencyError,
                      });
                      nextPath = "/login";
                      setTimeout(() => navigate(nextPath), 700);
                      return;
                    }
                    role = "creator";
                  }
                } else {
                  // Brand profile fetch failed with non-404 error (network, 500, etc)
                  // Redirect to login for safety
                  console.error("Failed to fetch brand profile:", brandError);
                  nextPath = "/login";
                  setTimeout(() => navigate(nextPath), 700);
                  return;
                }
              }

              nextPath = getDashboardPath({
                role,
                id: "",
                email: "",
              } as Profile);
            }

            setTimeout(() => navigate(nextPath), 700);
          } catch (err: any) {
            const msg =
              err?.message ??
              t(
                "updatePassword.errors.updateFailed",
                "Failed to update password",
              );
            setError(msg);
            toast({
              title: t("common.error"),
              description: msg,
              variant: "destructive",
            });
          } finally {
            setLoading(false);
          }
        }}
      >
        <div>
          <label className="block text-sm font-medium mb-1">
            {t("updatePassword.newPasswordLabel", "New Password")}
          </label>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full border rounded px-3 py-2"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 px-3 flex items-center text-gray-500"
            >
              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">
            {t("updatePassword.confirmPasswordLabel", "Confirm New Password")}
          </label>
          <div className="relative">
            <input
              type={showConfirmPassword ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              className="w-full border rounded px-3 py-2"
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute inset-y-0 right-0 px-3 flex items-center text-gray-500"
            >
              {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>
        </div>
        {error && (
          <p className="text-amber-700 text-sm dark:text-amber-400">{error}</p>
        )}
        {message && <p className="text-green-600 text-sm">{message}</p>}
        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 rounded bg-black text-white disabled:opacity-50"
          >
            {loading
              ? t("updatePassword.updating", "Updating…")
              : t("updatePassword.updateButton", "Update Password")}
          </button>
        </div>
      </form>
    </div>
  );
}
