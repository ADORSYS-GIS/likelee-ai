import React from "react";

import { useAuth } from "@/auth/AuthProvider";
import { useNavigate, useLocation } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import { getFriendlyErrorMessage } from "@/utils/errorMapping";
import { supabase } from "@/lib/supabase";
import { EmailOtpDialog } from "@/components/auth/EmailOtpDialog";
import {
  normalizeEmail,
  resendSignupEmailOtp,
  verifyEmailOtpCode,
} from "@/lib/emailOtp";

export default function Register() {
  const { initialized, authenticated } = useAuth();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [name, setName] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [otpOpen, setOtpOpen] = React.useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const creatorType = React.useMemo(
    () => new URLSearchParams(location.search).get("type"),
    [location.search],
  );

  const requireSupabase = () => {
    if (!supabase) {
      throw new Error("Supabase not configured");
    }

    return supabase;
  };

  const handleVerifyOtp = async (code: string) => {
    const client = requireSupabase();
    await verifyEmailOtpCode(client, {
      email,
      token: code,
      purpose: "signup",
    });
    setOtpOpen(false);
  };

  const handleResendOtp = async () => {
    const client = requireSupabase();
    await resendSignupEmailOtp(client, email);
  };

  React.useEffect(() => {
    // If a creator type is supplied, delegate the entire flow to ReserveProfile (Step 1 handles signup)
    if (creatorType) {
      navigate(
        `/ReserveProfile?type=${encodeURIComponent(creatorType)}&mode=signup`,
        { replace: true },
      );
      return;
    }
    if (initialized && authenticated) {
      if (creatorType) {
        navigate(
          `/ReserveProfile?type=${encodeURIComponent(creatorType)}&mode=signup`,
          { replace: true },
        );
      } else {
        navigate("/CreatorDashboard", { replace: true });
      }
    }
  }, [initialized, authenticated, navigate, creatorType]);

  if (creatorType) {
    return null;
  }

  return (
    <div className="max-w-md mx-auto px-6 py-16">
      <h1 className="text-2xl font-bold mb-4">Create your account</h1>
      {!initialized ? (
        <p>Loading...</p>
      ) : authenticated ? (
        <p>You are already signed in.</p>
      ) : (
        <form
          className="space-y-4"
          onSubmit={async (e) => {
            e.preventDefault();
            setError(null);
            setLoading(true);
            try {
              const client = requireSupabase();
              const { data, error } = await client.auth.signUp({
                email: normalizeEmail(email),
                password,
                options: {
                  data: {
                    full_name: name || null,
                    role: "creator",
                  },
                },
              });
              if (error) {
                const lower = String(error.message || "").toLowerCase();
                if (
                  lower.includes("already registered") ||
                  lower.includes("already exists")
                ) {
                  await handleResendOtp();
                  setOtpOpen(true);
                  return;
                }
                throw error;
              }

              if (!data.session) {
                setOtpOpen(true);
              }
            } catch (err: any) {
              setError(getFriendlyErrorMessage(err));
            } finally {
              setLoading(false);
            }
          }}
        >
          <div>
            <label className="block text-sm font-medium mb-1">Full name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full border rounded px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full border rounded px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Password</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full border rounded px-3 py-2 pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
              >
                {showPassword ? (
                  <EyeOff className="w-5 h-5" />
                ) : (
                  <Eye className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>
          {error && <p className="text-amber-700 text-sm dark:text-amber-400">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 rounded bg-black text-white disabled:opacity-50"
          >
            {loading ? "Creating…" : "Create account"}
          </button>
        </form>
      )}
      <EmailOtpDialog
        open={otpOpen}
        onOpenChange={setOtpOpen}
        email={normalizeEmail(email)}
        title="Verify your email"
        description="Enter the 6-digit code from your inbox to finish creating your account without leaving this page."
        helperText="Use resend if the code takes a moment to arrive."
        verifyLabel="Create account"
        onVerify={handleVerifyOtp}
        onResend={handleResendOtp}
        theme={{
          headerClassName:
            "bg-gradient-to-r from-slate-900 to-black text-white",
          headerTitleClassName: "text-white",
          headerDescriptionClassName: "text-white/80",
          iconWrapperClassName: "border border-white/20 bg-white/10 text-white",
          infoClassName: "border-slate-200 bg-slate-50 text-slate-950",
          primaryButtonClassName: "bg-black text-white hover:bg-slate-800",
          activeSlotClassName: "border-black ring-black/20",
          resendButtonClassName: "text-slate-700 hover:text-slate-900",
        }}
      />
    </div>
  );
}
