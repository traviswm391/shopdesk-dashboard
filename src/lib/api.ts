import { supabase } from "./supabase";
import type { Shop, Call, CallStats } from "@/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://shopdesk-backend-production.up.railway.app";

async function authHeaders(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Not authenticated");
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = await authHeaders();
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: { ...headers, ...(options.headers as Record<string, string> || {}) },
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(error.detail || `API error ${res.status}`);
  }
  return res.json();
}

export async function getMyShop(): Promise<Shop> {
  return apiFetch<Shop>("/api/shops/me");
}

export async function createShop(data: Partial<Shop>): Promise<Shop> {
  return apiFetch<Shop>("/api/shops/", { method: "POST", body: JSON.stringify(data) });
}

export async function updateShop(data: Partial<Shop>): Promise<Shop> {
  return apiFetch<Shop>("/api/shops/me", { method: "PATCH", body: JSON.stringify(data) });
}

export async function provisionShop(): Promise<{ status: string; phone_number: string; agent_id: string }> {
  return apiFetch("/api/shops/me/provision", { method: "POST" });
}

export async function getCalls(limit = 50, offset = 0): Promise<{ calls: Call[]; total: number }> {
  return apiFetch(`/api/calls/?limit=${limit}&offset=${offset}`);
}

export async function getCallStats(): Promise<CallStats> {
  return apiFetch("/api/calls/stats/summary");
}
