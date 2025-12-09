import React from "react";
import Layout from "./Layout";
import { useAuth } from "@/auth/AuthProvider";
import { toast } from "@/components/ui/use-toast";
import { useNavigate } from "react-router-dom";

export default function UpdatePassword() {
  const { supabase } = useAuth();
  const [password, setPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [message, setMessage] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);
  const navigate = useNavigate();

  return (
    <Layout currentPageName="Update Password">
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
              setMessage("Password updated successfully. You can now sign in.");
              toast({
                title: "Success",
                description: "Your password has been updated.",
              });
              setTimeout(() => navigate("/login"), 2000);
            } catch (err: any) {
              const msg = err?.message ?? "Failed to update password";
              setError(msg);
              toast({
                title: "Error",
                description: msg,
                variant: "destructive",
              });
            } finally {
              setLoading(false);
            }
          }}
        >
          <div>
            <label className="block text-sm font-medium mb-1">New Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full border rounded px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Confirm New Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              className="w-full border rounded px-3 py-2"
            />
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
    </Layout>
  );
}
