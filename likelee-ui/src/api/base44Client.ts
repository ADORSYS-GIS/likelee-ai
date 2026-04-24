// Axios-free minimal client targeting our backend API base URL.
// It intentionally matches the subset used in src/functions.ts

type RequestConfig = {
  headers?: Record<string, string>;
  params?: Record<string, string | number | boolean | undefined>;
  /** Idempotency key for safe mutation retries (POST/PUT/PATCH/DELETE) */
  idempotencyKey?: string;
};

function extractErrorMessage(errorData: any): string {
  if (!errorData) return "Something went wrong. Please try again.";

  let body = errorData;
  if (typeof body === "string") {
    try {
      body = JSON.parse(body);
    } catch {
      return body;
    }
  }

  if (body?.status === "error") {
    const err = body?.error;
    if (typeof err === "string") {
      try {
        const parsed = JSON.parse(err);
        return (
          parsed?.error ||
          parsed?.message ||
          parsed?.details ||
          "Something went wrong. Please try again."
        );
      } catch {
        return err;
      }
    }
    if (typeof err === "object" && err) {
      return (
        err?.error ||
        err?.message ||
        err?.msg ||
        err?.error_description ||
        err?.details ||
        "Something went wrong. Please try again."
      );
    }
  }

  return (
    body?.error ||
    body?.message ||
    body?.msg ||
    body?.error_description ||
    body?.details ||
    "Something went wrong. Please try again."
  );
}

function normalizeErrorData(errorData: any): any {
  if (!errorData) return null;
  let body = errorData;
  if (typeof body === "string") {
    try {
      body = JSON.parse(body);
    } catch {
      return errorData;
    }
  }
  if (body?.status === "error" && typeof body?.error === "string") {
    try {
      const parsed = JSON.parse(body.error);
      return parsed;
    } catch {
      return body;
    }
  }
  return body;
}

function userFriendlyMessage(
  status: number,
  errorData: any,
  url?: string,
): string {
  const normalized = normalizeErrorData(errorData);
  const code = String(
    normalized?.code || normalized?.error_code || normalized?.error?.code || "",
  ).trim();
  const msg = extractErrorMessage(normalized);
  const lower = String(msg || "").toLowerCase();

  // Public package password protection uses 401 with a plaintext message
  // ("Password required" / "Invalid password"). Preserve that message to
  // support the password-unlock UX instead of collapsing into a generic 401.
  if (
    (status === 401 || status === 403) &&
    typeof url === "string" &&
    url.includes("/public/packages/") &&
    (lower.includes("password") || lower.includes("unlock"))
  ) {
    return msg || "Password required.";
  }

  if (status === 401 || status === 403 || lower.includes("not authorized")) {
    return "You’re not authorized to perform this action.";
  }
  if (code === "23505" || lower.includes("already exists")) {
    return "This record already exists.";
  }
  if (code === "23514" || lower.includes("violates check constraint")) {
    return "A validation error occurred. Please check your input and try again.";
  }
  if (code === "PGRST204") {
    return "Invalid data provided. Please check your input.";
  }
  if (status === 409) {
    return "This action conflicts with an existing record. Please refresh and try again.";
  }
  if (!msg || !String(msg).trim()) {
    return "Something went wrong. Please try again.";
  }
  return msg;
}

function throwBackendError(
  method: string,
  url: string,
  status: number,
  errorData: any,
): never {
  const msg = userFriendlyMessage(status, errorData, url);

  // Log the raw error for developers, but avoid noisy logs for expected public
  // password prompts (these are handled in the UI).
  const lower = String(msg || "").toLowerCase();
  const isExpectedPublicPassword401 =
    (status === 401 || status === 403) &&
    url.includes("/public/packages/") &&
    (lower.includes("password") || lower.includes("unlock"));
  if (!isExpectedPublicPassword401) {
    // eslint-disable-next-line no-console
    console.error(`[api] ${method} ${url} failed`, { status, errorData });
  }
  const err: any = new Error(msg);
  err.status = status;
  err.method = method;
  err.url = url;
  err.data = errorData;
  throw err;
}

function buildUrl(
  base: string,
  url: string,
  params?: RequestConfig["params"],
): string {
  // If base has a path (e.g. /api) and url starts with /, URL() constructor will drop the base path.
  // We need to treat 'url' as relative to 'base'.
  const normalizedBase = base.endsWith("/") ? base : `${base}/`;
  let normalizedUrl = url.startsWith("/") ? url.slice(1) : url;

  // Avoid accidental double-prefix like `${API_BASE}/api/...` when API_BASE already includes `/api/`.
  // Example: base = http://localhost:5173/api/ and url = /api/talent/me
  if (normalizedBase.endsWith("/api/") && normalizedUrl.startsWith("api/")) {
    normalizedUrl = normalizedUrl.slice("api/".length);
  }

  const u = new URL(normalizedUrl, normalizedBase);
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null) u.searchParams.set(k, String(v));
    });
  }
  return u.toString();
}

let RAW_BASE =
  (import.meta as any)?.env?.VITE_API_BASE_URL ||
  (typeof __API_BASE_URL__ !== "undefined" ? __API_BASE_URL__ : undefined);

if (!RAW_BASE) {
  const stored =
    typeof window !== "undefined"
      ? window.localStorage?.getItem("API_BASE_URL") || undefined
      : undefined;
  // Prefer a direct localhost backend in dev to avoid relying on dev-proxy behavior.
  // In production behind a reverse proxy, '/api' works out of the box.
  RAW_BASE =
    stored ||
    ((import.meta as any)?.env?.DEV ? "http://localhost:8787/api" : "/api");
  // eslint-disable-next-line no-console
  console.warn(
    `[api] VITE_API_BASE_URL not set; using ${RAW_BASE}. Set VITE_API_BASE_URL at build-time for explicit control.`,
  );
}

// Ensure absolute base URL by resolving relative values against the current origin
const API_BASE = (() => {
  try {
    const base = RAW_BASE || "/api";
    // Ensure base ends with a slash so that new URL(relative, base) works as expected
    const normalizedBase = base.endsWith("/") ? base : `${base}/`;
    if (normalizedBase.startsWith("http")) return normalizedBase;
    return new URL(normalizedBase, window.location.origin).toString();
  } catch {
    return new URL("/", window.location.origin).toString();
  }
})();

import { supabase } from "@/lib/supabase";

export const base44 = {
  async getRaw(url: string, config?: RequestConfig): Promise<Response> {
    const full = buildUrl(API_BASE, url, config?.params);

    // Get token from Supabase
    const {
      data: { session },
    } = supabase
      ? await supabase.auth.getSession()
      : { data: { session: null } };
    const token = session?.access_token;

    const headers = {
      ...(config?.headers || {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };

    return await fetch(full, { headers });
  },
  async get<T = any>(url: string, config?: RequestConfig): Promise<T> {
    const full = buildUrl(API_BASE, url, config?.params);

    // Get token from Supabase
    const {
      data: { session },
    } = supabase
      ? await supabase.auth.getSession()
      : { data: { session: null } };
    const token = session?.access_token;

    const headers = {
      ...(config?.headers || {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };

    const res = await fetch(full, { headers });
    if (!res.ok) {
      const txt = await res.text();
      let errorData: any = txt;
      try {
        errorData = JSON.parse(txt);
      } catch {
        // keep as text
      }
      throwBackendError("GET", url, res.status, errorData);
    }
    return (await res.json()) as T;
  },
  async post<T = any>(
    url: string,
    data?: any,
    config?: RequestConfig,
  ): Promise<T> {
    const full = buildUrl(API_BASE, url, config?.params);

    // Get token from Supabase
    const {
      data: { session },
    } = supabase
      ? await supabase.auth.getSession()
      : { data: { session: null } };
    const token = session?.access_token;

    const isForm = typeof FormData !== "undefined" && data instanceof FormData;
    const headers = {
      ...(isForm ? {} : { "Content-Type": "application/json" }),
      ...(config?.headers || {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(config?.idempotencyKey
        ? { "Idempotency-Key": config.idempotencyKey }
        : {}),
    };

    const body = isForm
      ? data
      : data !== undefined
        ? JSON.stringify(data)
        : undefined;
    const res = await fetch(full, { method: "POST", headers, body });
    if (!res.ok) {
      const txt = await res.text();
      let errorData: any = txt;
      try {
        errorData = JSON.parse(txt);
      } catch {
        // keep as text
      }
      throwBackendError("POST", url, res.status, errorData);
    }
    return (await res.json()) as T;
  },
  async put<T = any>(
    url: string,
    data?: any,
    config?: RequestConfig,
  ): Promise<T> {
    const full = buildUrl(API_BASE, url, config?.params);

    // Get token from Supabase
    const {
      data: { session },
    } = supabase
      ? await supabase.auth.getSession()
      : { data: { session: null } };
    const token = session?.access_token;

    const isForm = typeof FormData !== "undefined" && data instanceof FormData;
    const headers = {
      ...(isForm ? {} : { "Content-Type": "application/json" }),
      ...(config?.headers || {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(config?.idempotencyKey
        ? { "Idempotency-Key": config.idempotencyKey }
        : {}),
    };

    const body = isForm
      ? data
      : data !== undefined
        ? JSON.stringify(data)
        : undefined;
    const res = await fetch(full, { method: "PUT", headers, body });
    if (!res.ok) {
      const txt = await res.text();
      let errorData: any = txt;
      try {
        errorData = JSON.parse(txt);
      } catch {
        // keep as text
      }
      throwBackendError("PUT", url, res.status, errorData);
    }
    return (await res.json()) as T;
  },
  async patch<T = any>(
    url: string,
    data?: any,
    config?: RequestConfig,
  ): Promise<T> {
    const full = buildUrl(API_BASE, url, config?.params);

    const {
      data: { session },
    } = supabase
      ? await supabase.auth.getSession()
      : { data: { session: null } };
    const token = session?.access_token;

    const isForm = typeof FormData !== "undefined" && data instanceof FormData;
    const headers = {
      ...(isForm ? {} : { "Content-Type": "application/json" }),
      ...(config?.headers || {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(config?.idempotencyKey
        ? { "Idempotency-Key": config.idempotencyKey }
        : {}),
    };

    const body = isForm
      ? data
      : data !== undefined
        ? JSON.stringify(data)
        : undefined;
    const res = await fetch(full, { method: "PATCH", headers, body });
    if (!res.ok) {
      const txt = await res.text();
      let errorData: any = txt;
      try {
        errorData = JSON.parse(txt);
      } catch {
        // keep as text
      }
      throwBackendError("PATCH", url, res.status, errorData);
    }
    return (await res.json()) as T;
  },
  async delete<T = any>(
    url: string,
    config?: RequestConfig & { data?: any },
  ): Promise<T> {
    const full = buildUrl(API_BASE, url, config?.params);

    // Get token from Supabase
    const {
      data: { session },
    } = supabase
      ? await supabase.auth.getSession()
      : { data: { session: null } };
    const token = session?.access_token;

    const headers = {
      "Content-Type": "application/json",
      ...(config?.headers || {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(config?.idempotencyKey
        ? { "Idempotency-Key": config.idempotencyKey }
        : {}),
    };

    const body =
      config?.data !== undefined ? JSON.stringify(config.data) : undefined;

    const res = await fetch(full, { method: "DELETE", headers, body });
    if (!res.ok) {
      const txt = await res.text();
      let errorData: any = txt;
      try {
        errorData = JSON.parse(txt);
      } catch {
        // keep as text
      }
      throwBackendError("DELETE", url, res.status, errorData);
    }

    if (res.status === 204) {
      return {} as T;
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
