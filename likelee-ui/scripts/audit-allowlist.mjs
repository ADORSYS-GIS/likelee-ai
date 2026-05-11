import { spawnSync } from "node:child_process";

const ALLOWED_ADVISORY_IDS = new Set([
  // Lodash vulnerabilities (existing)
  "GHSA-xxjr-mmjv-4gpg",
  "GHSA-r5fr-rjxr-66jc",
  "GHSA-f23m-r3pf-42rh",

  // Axios vulnerabilities (January 2025)
  "GHSA-w9j2-pvgh-6h63", // Authentication Bypass via Prototype Pollution
  "GHSA-pmwg-cvhr-8vh7", // Incomplete Fix for CVE-2025-62718
  "GHSA-3w6x-2g7m-8v23", // JSON Response Tampering via Prototype Pollution
  "GHSA-q8qp-cvcw-x6jj", // Prototype pollution read-side gadgets
  "GHSA-xhjh-pmcv-23jw", // Null Byte Injection via Reverse-Encoding
  "GHSA-445q-vr5w-6q77", // CRLF Injection in multipart/form-data
  "GHSA-m7pr-hjqh-92cm", // no_proxy bypass via IP alias
  "GHSA-62hf-57xw-28j9", // Unbounded recursion in toFormData
  "GHSA-5c9x-8gcm-mpgx", // HTTP adapter-streamed uploads bypass
  "GHSA-vf2m-468p-8v99", // HTTP adapter streamed responses bypass
  "GHSA-pf86-5x62-jrwf", // Prototype Pollution Gadgets
  "GHSA-6chq-wfr3-2hj9", // Header Injection via Prototype Pollution
  "GHSA-xx6v-rp6x-q39c", // XSRF Token Cross-Origin Leakage

  // UUID vulnerability (January 2025)
  "GHSA-w5hq-g745-h8pq", // Missing buffer bounds check in v3/v5/v6
]);

const ALLOWED_MODULES = new Set([
  "lodash",
  "axios",
  "uuid",
]);
const ALLOWED_TRANSITIVE = new Set([
  "@aws-amplify/analytics",
  "@aws-amplify/api",
  "@aws-amplify/api-graphql",
  "@aws-amplify/api-rest",
  "@aws-amplify/auth",
  "@aws-amplify/core",
  "@aws-amplify/datastore",
  "@aws-amplify/notifications",
  "@aws-amplify/storage",
  "@aws-amplify/ui",
  "@aws-amplify/ui-react",
  "@aws-amplify/ui-react-core",
  "@aws-amplify/ui-react-liveness",
  "@aws-sdk/client-firehose",
  "@aws-sdk/client-kinesis",
  "@aws-sdk/client-personalize-events",
  "@aws-sdk/client-rekognitionstreaming",
  "@aws-sdk/client-sso",
  "@aws-sdk/core",
  "@aws-sdk/credential-provider-env",
  "@aws-sdk/credential-provider-http",
  "@aws-sdk/credential-provider-ini",
  "@aws-sdk/credential-provider-login",
  "@aws-sdk/credential-provider-node",
  "@aws-sdk/credential-provider-process",
  "@aws-sdk/credential-provider-sso",
  "@aws-sdk/credential-provider-web-identity",
  "@aws-sdk/middleware-user-agent",
  "@aws-sdk/nested-clients",
  "@aws-sdk/token-providers",
  "@aws-sdk/util-user-agent-node",
  "@aws-sdk/xml-builder",
  "@base44/sdk",
  "aws-amplify",
  "fast-xml-parser",
  "postcss",
  "recharts",
  "uuid",
  "workbox-build",
]);

const result = spawnSync("npm", ["audit", "--json"], { encoding: "utf8" });
const rawOutput = `${result.stdout || ""}${result.stderr || ""}`.trim();

if (!rawOutput) {
  console.error("npm audit produced no output.");
  process.exit(1);
}

let data;
try {
  data = JSON.parse(rawOutput);
} catch (error) {
  console.error("Failed to parse npm audit output.");
  console.error(rawOutput);
  process.exit(1);
}

const vulnerabilities = data.vulnerabilities || {};
const disallowed = [];

const isAllowedVia = (via) => {
  if (!via) return false;
  if (typeof via === "string") {
    return ALLOWED_MODULES.has(via) || ALLOWED_TRANSITIVE.has(via);
  }
  const name = via.name || "";
  if (!ALLOWED_MODULES.has(name) && !ALLOWED_TRANSITIVE.has(name)) return false;
  if (via.source && ALLOWED_ADVISORY_IDS.has(via.source)) return true;
  if (typeof via.source === "number") return true;
  return false;
};

for (const [name, vuln] of Object.entries(vulnerabilities)) {
  const viaList = Array.isArray(vuln.via) ? vuln.via : [];
  const allAllowed = viaList.length > 0 && viaList.every(isAllowedVia);
  const allowedTransitive =
    !ALLOWED_MODULES.has(name) && viaList.length > 0 && allAllowed;

  if (!(allAllowed && (ALLOWED_MODULES.has(name) || allowedTransitive))) {
    disallowed.push({
      name,
      severity: vuln.severity,
      via: viaList,
    });
  }
}

if (disallowed.length > 0) {
  console.error("npm audit found disallowed vulnerabilities:");
  for (const vuln of disallowed) {
    const viaSummary = vuln.via
      .map((entry) => {
        if (typeof entry === "string") return entry;
        return `${entry.name || "unknown"}:${entry.source || "unknown"}`;
      })
      .join(", ");
    console.error(`- ${vuln.name} (${vuln.severity}) via ${viaSummary}`);
  }
  process.exit(1);
}

console.log("npm audit passed with allowlisted lodash advisories only.");
