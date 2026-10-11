import type { OwnedPrayer, Prayer, PrayerType } from "../types";
import { API_URL } from "./config";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  if (!res.ok) {
    if (res.status === 404) throw new NotFoundError();
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Request failed with ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export class NotFoundError extends Error {}

export function listPrayers(params: {
  lat?: number;
  lng?: number;
  radiusKm?: number;
  participantToken?: string;
}): Promise<Prayer[]> {
  const qs = new URLSearchParams();
  if (params.lat !== undefined) qs.set("lat", String(params.lat));
  if (params.lng !== undefined) qs.set("lng", String(params.lng));
  if (params.radiusKm !== undefined) qs.set("radiusKm", String(params.radiusKm));
  if (params.participantToken) qs.set("participantToken", params.participantToken);
  return request<Prayer[]>(`/api/prayers?${qs.toString()}`);
}

export function getMyPrayer(seekerToken: string): Promise<OwnedPrayer> {
  return request<OwnedPrayer>(`/api/prayers/mine?seekerToken=${encodeURIComponent(seekerToken)}`);
}

export function createPrayer(input: {
  lat: number;
  lng: number;
  details: string;
  prayerType: PrayerType;
  seekerToken: string;
}): Promise<OwnedPrayer> {
  return request<OwnedPrayer>("/api/prayers", { method: "POST", body: JSON.stringify(input) });
}

export function updatePrayerDetails(
  id: string,
  seekerToken: string,
  details: string
): Promise<OwnedPrayer> {
  return request<OwnedPrayer>(`/api/prayers/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ seekerToken, details }),
  });
}

export function updatePrayerType(
  id: string,
  seekerToken: string,
  prayerType: PrayerType
): Promise<OwnedPrayer> {
  return request<OwnedPrayer>(`/api/prayers/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ seekerToken, prayerType }),
  });
}

export function adjustPresentCount(
  id: string,
  seekerToken: string,
  delta: number
): Promise<OwnedPrayer> {
  return request<OwnedPrayer>(`/api/prayers/${id}/present`, {
    method: "POST",
    body: JSON.stringify({ seekerToken, delta }),
  });
}

export function startPrayer(id: string, seekerToken: string): Promise<OwnedPrayer> {
  return request<OwnedPrayer>(`/api/prayers/${id}/start`, {
    method: "POST",
    body: JSON.stringify({ seekerToken }),
  });
}

export function deletePrayer(id: string, seekerToken: string): Promise<void> {
  return request<void>(`/api/prayers/${id}`, {
    method: "DELETE",
    body: JSON.stringify({ seekerToken }),
  });
}

export function toggleInterest(
  id: string,
  participantToken: string
): Promise<Prayer & { interested: boolean }> {
  return request(`/api/prayers/${id}/toggle-interest`, {
    method: "POST",
    body: JSON.stringify({ participantToken }),
  });
}
