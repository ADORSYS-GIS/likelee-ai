import React from "react";
import Layout from "./Layout";
import { useAuth } from "@/auth/AuthProvider";
import { toast } from "@/components/ui/use-toast";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

export default function ForgotPassword() {
  const { t } = useTranslation();
  const { supabase } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [message, setMessage] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  return (
    <Layout currentPageName="Forgot Password">
      <div className="max-w-md mx-auto px-6 py-16">
        <h1 className="text-2xl font-bold mb-4">
          {t("forgotPasswordPage.title")}
        </h1>
        <p className="text-gray-600 mb-6">
          {t("forgotPasswordPage.instructions")}
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
                  setMessage(t("forgotPasswordPage.successMessage"));
                } else {
                  // For other errors, throw them to be caught by the catch block
                  throw error;
                }
              } else {
                setMessage(t("forgotPasswordPage.successMessage"));
              }
            } catch (err: any) {
              const msg =
                err?.message ?? t("forgotPasswordPage.errorMessage");
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
              {t("forgotPasswordPage.emailLabel")}
            </label>
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
              {loading
                ? t("forgotPasswordPage.submitButton.sending")
                : t("forgotPasswordPage.submitButton.default")}
            </button>
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="text-sm text-cyan-600 hover:underline"
            >
              {t("forgotPasswordPage.backToSignIn")}
            </button>
          </div>
        </form>
      </div>
    </Layout>
  );
}

