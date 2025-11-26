import { createClient, Base44Client } from "@base44/sdk";

interface ExtendedBase44Client extends Base44Client {
  get: <T>(url: string, config?: any) => Promise<T>;
  post: <T>(url: string, data?: any, config?: any) => Promise<T>;
}

export const base44 = createClient({
  appId: "68ed7158e33f31b30f653449",
  requiresAuth: false,
}) as ExtendedBase44Client;
