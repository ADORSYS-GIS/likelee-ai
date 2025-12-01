import React from "react";
import Layout from "./Layout";
import { useAuth } from "@/auth/AuthProvider";
import { useNavigate, useLocation } from "react-router-dom";

export default function Register() {
  const { register, initialized, authenticated } = useAuth();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [name, setName] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const creatorType = React.useMemo(
    () => new URLSearchParams(location.search).get("type"),
    [location.search],
  );

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
    <Layout currentPageName="Register">
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
                await register(email, password, name);
                if (creatorType) {
                  navigate(
                    `/ReserveProfile?type=${encodeURIComponent(creatorType)}&mode=signup`,
                  );
                } else {
                  navigate("/CreatorDashboard");
                }
              } catch (err: any) {
                setError(err?.message ?? "Failed to register");
              } finally {
                setLoading(false);
              }
            }}
          >
            <div>
              <label className="block text-sm font-medium mb-1">
                Full name
              </label>
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
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full border rounded px-3 py-2"
              />
            </div>
            {error && <p className="text-red-600 text-sm">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 rounded bg-black text-white disabled:opacity-50"
            >
              {loading ? "Creating…" : "Create account"}
            </button>
          </form>
        )}
      </div>
    </Layout>
  );
}
