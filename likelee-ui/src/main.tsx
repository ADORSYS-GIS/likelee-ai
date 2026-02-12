import React from "react";
import ReactDOM from "react-dom/client";
import App from "@/App";
import "@/index.css";
import "./i18n";
import "@aws-amplify/ui-react/styles.css";
import "@aws-amplify/ui-react-liveness/styles.css";
import { Amplify } from "aws-amplify";

// Prevent UI flash on Supabase recovery callbacks: redirect before React mounts.
(() => {
  try {
    const href = window.location.href;
    const hash = window.location.hash || "";
    const isRecoveryHash = /\btype=recovery\b/i.test(hash);
    const hasAuthTokens = /\baccess_token=\b/i.test(hash) && /\brefresh_token=\b/i.test(hash);
    const isOnUpdatePassword = href.includes("/update-password");

    if ((isRecoveryHash || hasAuthTokens) && !isOnUpdatePassword) {
      const next = localStorage.getItem("likelee_invite_next") || "";
      const tsRaw = localStorage.getItem("likelee_invite_next_ts") || "0";
      const ts = Number(tsRaw);
      const fresh = ts && Date.now() - ts < 1000 * 60 * 30;
      const nextPath = fresh && next.startsWith("/") ? next : "/login";
      window.location.replace(
        `/update-password?next=${encodeURIComponent(nextPath)}${hash}`,
      );
    }
  } catch {
    // ignore
  }
})();

// Configure Amplify Auth with Cognito Identity Pool so FaceLivenessDetector can use default credentials.
const VITE_POOL = (import.meta as any).env.VITE_COGNITO_IDENTITY_POOL_ID || "";
const VITE_REGION = (import.meta as any).env.VITE_AWS_REGION || "us-east-1";
if (VITE_POOL) {
  Amplify.configure({
    Auth: {
      Cognito: {
        identityPoolId: VITE_POOL,
        allowGuestAccess: true,
      },
    },
  });
}

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <App />,
);
