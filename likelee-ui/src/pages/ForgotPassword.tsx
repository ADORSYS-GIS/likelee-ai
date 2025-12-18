import React from "react";

import { useAuth } from "@/auth/AuthProvider";
import { toast } from "@/components/ui/use-toast";
import { useNavigate } from "react-router-dom";

export default function ForgotPassword() {
  const { supabase } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [message, setMessage] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  return (
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
            const { error } = await supabase.auth.resetPasswordForEmail(
              email,
              {
                redirectTo: `${window.location.origin}/update-password`,
              },
            );

            if (error) {
              // Check for a specific error message to provide a better user experience
              if (error.message.includes("user not found")) {
                // To avoid leaking user existence, show a generic success message
                // This is a security best practice
                setMessage(
                  "If an account exists for this email, a password reset link has been sent.",
                );
              } else {
                // For other errors, throw them to be caught by the catch block
                throw error;
              }
            } else {
              setMessage(
                "If an account exists for this email, a password reset link has been sent.",
              );
            }
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
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="text-sm text-cyan-600 hover:underline"
          >
            Back to Sign In
          </button>
        </div>
      </form>
    </div>
  );
}

