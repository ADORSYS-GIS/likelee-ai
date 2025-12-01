// Axios-free minimal client targeting our backend API base URL.
// It intentionally matches the subset used in src/api/functions.ts

type RequestConfig = {
  headers?: Record<string, string>;
  params?: Record<string, string | number | boolean | undefined>;
};

function buildUrl(
  base: string,
  url: string,
  params?: RequestConfig["params"],
): string {
  const u = new URL(url, base);
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null) u.searchParams.set(k, String(v));
    });
  }
  return u.toString();
}

let API_BASE = (import.meta as any)?.env?.VITE_API_BASE_URL as
  | string
  | undefined;
if (!API_BASE) {
  const stored =
    typeof window !== "undefined"
      ? window.localStorage?.getItem("API_BASE_URL") || undefined
      : undefined;
  API_BASE = stored || "http://localhost:8787"; // sensible dev default for likelee-server
  // eslint-disable-next-line no-console
  console.warn(
    `[api] VITE_API_BASE_URL not set; using ${API_BASE}. Set VITE_API_BASE_URL to avoid proxying to the Vite dev server.`,
  );
}

export const base44 = {
  async get<T = any>(url: string, config?: RequestConfig): Promise<T> {
    const full = buildUrl(API_BASE, url, config?.params);
    const res = await fetch(full, { headers: { ...(config?.headers || {}) } });
    if (!res.ok) throw new Error(`GET ${full} failed: ${res.status}`);
    return (await res.json()) as T;
  },
  async post<T = any>(
    url: string,
    data?: any,
    config?: RequestConfig,
  ): Promise<T> {
    const full = buildUrl(API_BASE, url, config?.params);
    const isForm = typeof FormData !== "undefined" && data instanceof FormData;
    const headers = isForm
      ? { ...(config?.headers || {}) }
      : { "Content-Type": "application/json", ...(config?.headers || {}) };
    const body = isForm
      ? data
      : data !== undefined
        ? JSON.stringify(data)
        : undefined;
    const res = await fetch(full, { method: "POST", headers, body });
    if (!res.ok) {
      const txt = await res.text();
      throw new Error(`POST ${full} failed: ${res.status} ${txt}`);
    }
    return (await res.json()) as T;
  },
};
