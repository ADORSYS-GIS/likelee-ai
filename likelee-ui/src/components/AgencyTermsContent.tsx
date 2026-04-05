import React from "react";
import { PrivacyPolicyContent } from "@/components/PrivacyPolicyContent";

/**
 * AgencyTermsContent
 *
 * Temporary: renders the same content as the creator Privacy Policy
 * until the final agency-specific legal copy is provided.
 *
 * To replace: swap out the <PrivacyPolicyContent /> below with the
 * real agency terms JSX — the creator flow (ReserveProfile.tsx) will
 * not be affected.
 */
export function AgencyTermsContent() {
  return <PrivacyPolicyContent />;
}
