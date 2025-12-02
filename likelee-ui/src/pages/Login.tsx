import React from "react";
import Layout from "./Layout";
import { useAuth } from "@/auth/AuthProvider";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { toast } from "@/components/ui/use-toast";

export default function Login() {
  const { login, initialized, authenticated } = useAuth();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const creatorType = React.useMemo(
    () => new URLSearchParams(location.search).get("type"),
    [location.search],
  );

  React.useEffect(() => {
    if (initialized && authenticated) {
      if (creatorType) {
        navigate(
          `/ReserveProfile?type=${encodeURIComponent(creatorType)}&mode=login`,
          { replace: true },
        );
      } else {
        navigate("/CreatorDashboard", { replace: true });
      }
    }
  }, [initialized, authenticated, navigate, creatorType]);

  return (
    <Layout currentPageName="Login">
      <div className="max-w-md mx-auto px-6 py-16">
        <h1 className="text-2xl font-bold mb-4">Sign in</h1>
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
                await login(email, password);
                if (creatorType) {
                  navigate(
                    `/ReserveProfile?type=${encodeURIComponent(creatorType)}&mode=login`,
                  );
                } else {
                  navigate("/CreatorDashboard");
                }
              } catch (err: any) {
                const msg = err?.message ?? "Failed to sign in";
                setError(msg);
                toast({
                  title: "Sign-in failed",
                  description: msg,
                  variant: "destructive",
                });
              } finally {
                setLoading(false);
              }
            }}
          >
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
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full border rounded px-3 py-2"
              />
            </div>
            {error && <p className="text-red-600 text-sm">{error}</p>}
            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 rounded bg-black text-white disabled:opacity-50"
              >
                {loading ? "Signing in…" : "Sign in"}
              </button>
              <button
                type="button"
                disabled={loading || !email}
                onClick={async () => {
                  setError(null);
                  setLoading(true);
                  try {
                    const { error } = await supabase.auth.signInWithOtp({
                      email: email.trim().toLowerCase(),
                      options: {
                        emailRedirectTo: `${window.location.origin}/Login`,
                      },
                    });
                    if (error) throw error;
                    toast({
                      title: "Magic link sent",
                      description: "Check your email to complete sign-in.",
                    });
                  } catch (err: any) {
                    const msg = err?.message ?? "Failed to send magic link";
                    setError(msg);
                    toast({
                      title: "Magic link error",
                      description: msg,
                      variant: "destructive",
                    });
                  } finally {
                    setLoading(false);
                  }
                }}
                className="px-4 py-2 rounded border border-black text-black disabled:opacity-50"
              >
                Send magic link
              </button>
            </div>
          </form>
        )}
      </div>
    </Layout>
  );
}
