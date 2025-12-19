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

let RAW_BASE = (import.meta as any)?.env?.VITE_API_BASE_URL as
  | string
  | undefined;
if (!RAW_BASE) {
  const stored =
    typeof window !== "undefined"
      ? window.localStorage?.getItem("API_BASE_URL") || undefined
      : undefined;
  // Default to '/api' so production behind a reverse proxy works out of the box
  RAW_BASE = stored || "/api";
  // eslint-disable-next-line no-console
  console.warn(
    `[api] VITE_API_BASE_URL not set; using ${RAW_BASE}. Set VITE_API_BASE_URL at build-time for explicit control.`,
  );
}

// Ensure absolute base URL by resolving relative values against the current origin
const API_BASE = (() => {
  try {
    if (RAW_BASE && RAW_BASE.startsWith("http")) return RAW_BASE;
    const abs = new URL(RAW_BASE || "/api", window.location.origin).toString();
    return abs;
  } catch {
    return new URL("/api", window.location.origin).toString();
  }
})();

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
  get entities() {
    return new Proxy(
      {},
      {
        get: (_target, entityName: string) => ({
          list: (sort?: string, limit?: number) =>
            base44.get(`/entities/${entityName}`, { params: { sort, limit } }),
          filter: (filter: any) =>
            base44.post(`/entities/${entityName}/filter`, filter),
          get: (id: string) => base44.get(`/entities/${entityName}/${id}`),
          create: (data: any) => base44.post(`/entities/${entityName}`, data),
          update: (id: string, data: any) =>
            base44.post(`/entities/${entityName}/${id}`, data),
          delete: (id: string) =>
            base44.post(`/entities/${entityName}/${id}/delete`),
        }),
      },
    ) as any;
  },
  get integrations() {
    return new Proxy(
      {},
      {
        get: (_target, integrationName: string) =>
          new Proxy(
            {},
            {
              get: (__target, methodName: string) => (data: any) =>
                base44.post(
                  `/integrations/${integrationName}/${methodName}`,
                  data,
                ),
            },
          ),
      },
    ) as any;
  },
  get auth() {
    return {
      login: (data: any) => base44.post("/auth/login", data),
      signup: (data: any) => base44.post("/auth/signup", data),
      me: () => base44.get("/auth/me"),
    } as any;
  },
};
