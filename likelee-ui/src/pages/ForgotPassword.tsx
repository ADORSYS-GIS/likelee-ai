import React from "react";
import Layout from "./Layout";
import { useAuth } from "@/auth/AuthProvider";
import { toast } from "@/components/ui/use-toast";
import { Link } from "react-router-dom";

export default function ForgotPassword() {
  const { supabase } = useAuth();
  const [email, setEmail] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [message, setMessage] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  return (
    <Layout currentPageName="Forgot Password">
      <div className="max-w-md mx-auto px-6 py-16">
        <h1 className="text-2xl font-bold mb-4">Reset your password</h1>
        <p className="text-gray-600 mb-6">
          Enter your email address and we will send you a link to reset your
          password.
        </p>
        <form
          className="space-y-4"
          onSubmit={async (e) => {
            e.preventDefault();
            setError(null);
            setMessage(null);
            setLoading(true);
            try {
              const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/update-password`,
              });
              if (error) {
                throw error;
              }
              setMessage("Password reset link sent. Please check your email.");
            } catch (err: any) {
              const msg = err?.message ?? "Failed to send reset link";
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
            <label className="block text-sm font-medium mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full border rounded px-3 py-2"
            />
          </div>
          {error && <p className="text-red-600 text-sm">{error}</p>}
          {message && <p className="text-green-600 text-sm">{message}</p>}
          <div className="flex items-center justify-between">
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 rounded bg-black text-white disabled:opacity-50"
            >
              {loading ? "Sending…" : "Send Reset Link"}
            </button>
            <Link to="/login" className="text-sm text-gray-600 hover:underline">
              Back to Sign In
            </Link>
          </div>
        </form>
      </div>
    </Layout>
  );
}
