import React from "react";
import ReactDOM from "react-dom/client";
import App from "@/App";
import "@/index.css";
import "./i18n";

// Prevent UI flash on Supabase recovery callbacks: redirect before React mounts.
(() => {
  try {
    const href = window.location.href;
    const hash = window.location.hash || "";
    const isRecoveryHash = /\btype=recovery\b/i.test(hash);
    const isOnUpdatePassword = href.includes("/update-password");

    if (isRecoveryHash && !isOnUpdatePassword) {
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

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <App />,
);
