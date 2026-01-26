import React, { useState } from "react";
import Layout from "./Layout";

import { useAuth } from "@/auth/AuthProvider";
import { toast } from "@/components/ui/use-toast";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Eye, EyeOff } from "lucide-react";

export default function UpdatePassword() {
  const { t } = useTranslation();
  const { supabase } = useAuth();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  return (
      <div className="max-w-md mx-auto px-6 py-16">
        <h1 className="text-2xl font-bold mb-4">Update your password</h1>
        <form
          className="space-y-4"
          onSubmit={async (e) => {
            e.preventDefault();
            if (password !== confirmPassword) {
              setError("Passwords do not match");
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
              setTimeout(() => navigate("/login"), 2000);
            } catch (err: any) {
              const msg = err?.message ?? "Failed to update password";
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
              New Password
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
              Confirm New Password
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
          {error && <p className="text-red-600 text-sm">{error}</p>}
          {message && <p className="text-green-600 text-sm">{message}</p>}
          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 rounded bg-black text-white disabled:opacity-50"
            >
              {loading ? "Updating…" : "Update Password"}
            </button>
          </div>
        </form>
      </div>
  );
}
