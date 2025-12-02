import React from "react";
import ReactDOM from "react-dom/client";
import App from "@/App";
import "@/index.css";
import "@aws-amplify/ui-react/styles.css";
import "@aws-amplify/ui-react-liveness/styles.css";
import { Amplify } from "aws-amplify";

// Configure Amplify Auth with Cognito Identity Pool so FaceLivenessDetector can use default credentials.
const VITE_POOL = (import.meta as any).env.VITE_COGNITO_IDENTITY_POOL_ID || "";
const VITE_REGION = (import.meta as any).env.VITE_AWS_REGION || "us-east-1";
if (VITE_POOL) {
  Amplify.configure({
    Auth: {
      Cognito: {
        identityPoolId: VITE_POOL,
      },
    },
  });
}

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <App />,
);
