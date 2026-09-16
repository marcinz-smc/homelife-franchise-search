import type { FeatureCollection } from "geojson";
import type {
  CoverageSummary,
  FilterFacets,
  ImportJob,
  Municipality,
  Office,
  RecoBrokerage,
  SearchHit,
} from "../types";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    credentials: "include",
    ...init,
    headers: {
      ...(init?.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
      ...init?.headers,
    },
  });

  const payload = (await response.json().catch(() => ({}))) as { error?: string } & T;
  if (!response.ok) {
    throw new Error(payload.error || `Request failed (${response.status})`);
  }
  return payload;
}

export const api = {
  me: () => request<{ user: { id: string; email: string; role: "admin" } }>("/api/auth/me"),
  login: (email: string, password: string) =>
    request<{ user: { id: string; email: string; role: "admin" } }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),
  logout: () => request<{ ok: boolean }>("/api/auth/logout", { method: "POST" }),
  filters: (params: URLSearchParams) => request<FilterFacets>(`/api/filters?${params}`),
  offices: (params: URLSearchParams) =>
    request<{ offices: Office[] }>(`/api/offices?${params}`),
  officeGeojson: (params: URLSearchParams) =>
    request<FeatureCollection>(`/api/offices/geojson?${params}`),
  mapPoints: (params: URLSearchParams) =>
    request<FeatureCollection>(`/api/map/points?${params}`),
  searchBrokerages: (params: URLSearchParams) =>
    request<{ results: SearchHit[] }>(`/api/map/search?${params}`),
  office: (id: string) => request<{ office: Office }>(`/api/offices/${id}`),
  reco: (id: string) => request<{ brokerage: RecoBrokerage }>(`/api/map/reco/${id}`),
  summary: () => request<CoverageSummary>("/api/coverage/summary"),
  municipalities: (params: URLSearchParams) =>
    request<{ items: Municipality[] }>(`/api/coverage/municipalities?${params}`),
  municipalityGeojson: (params: URLSearchParams) =>
    request<FeatureCollection>(`/api/coverage/municipalities/geojson?${params}`),
  unmatched: () =>
    request<{ offices: Pick<Office, "id" | "name" | "city" | "province" | "matchNote">[] }>(
      "/api/coverage/unmatched",
    ),
  importOffices: (file: File) => {
    const body = new FormData();
    body.append("file", file);
    return request<{ job: ImportJob }>("/api/admin/import/offices", { method: "POST", body });
  },
  importMunicipalities: (file: File) => {
    const body = new FormData();
    body.append("file", file);
    return request<{ job: ImportJob }>("/api/admin/import/municipalities", {
      method: "POST",
      body,
    });
  },
  importReco: (file: File) => {
    const body = new FormData();
    body.append("file", file);
    return request<{ job: ImportJob }>("/api/admin/import/reco", {
      method: "POST",
      body,
    });
  },
  importLeads: (files: File[]) => {
    const body = new FormData();
    for (const file of files) body.append("files", file);
    return request<{ job: ImportJob }>("/api/admin/import/leads", {
      method: "POST",
      body,
    });
  },
  importJobs: () => request<{ jobs: ImportJob[] }>("/api/admin/import/jobs"),
  unresolvedGeocodes: () =>
    request<{
      items: { id: string; name: string; region: string; geocodeStatus: string; geocodePlaceName: string }[];
    }>("/api/admin/geocode/unresolved"),
  retryGeocodes: () =>
    request<{ geocoded: number; geocodeFailed: number; attempted: number }>(
      "/api/admin/geocode/retry",
      { method: "POST" },
    ),
};

export function officeQuery(filters: {
  province: string;
  region: string;
  city: string;
  group: string;
  q: string;
  brand?: string;
}): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.province) params.set("province", filters.province);
  if (filters.region) params.set("region", filters.region);
  if (filters.city) params.set("city", filters.city);
  if (filters.group) params.set("group", filters.group);
  if (filters.q) params.set("q", filters.q);
  if (filters.brand && filters.brand !== "all") params.set("brand", filters.brand);
  return params;
}
