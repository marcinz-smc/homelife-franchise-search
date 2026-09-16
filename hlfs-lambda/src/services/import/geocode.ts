import { normalizeName } from "../../utils/normalize";

export type GeocodeResult = {
  status: "ok" | "ambiguous" | "failed";
  coordinates?: [number, number];
  bbox?: [number, number, number, number];
  confidence?: number;
  placeName?: string;
  query: string;
};

export type GeocodeFeature = {
  relevance?: number;
  place_name?: string;
  center?: [number, number];
  bbox?: [number, number, number, number];
  context?: { short_code?: string; text?: string }[];
};

export type GeocodeClient = (
  query: string,
) => Promise<{ features?: GeocodeFeature[] }>;

export function buildGeocodeQuery(name: string, region: string): string {
  return `${name}, ${region}, Ontario, Canada`;
}

function mentionsOntario(feature: GeocodeFeature): boolean {
  const haystack = [
    feature.place_name ?? "",
    ...(feature.context ?? []).flatMap((item) => [item.short_code ?? "", item.text ?? ""]),
  ]
    .join(" ")
    .toLowerCase();
  return haystack.includes("ontario") || haystack.includes("ca-on");
}

export function interpretGeocodeFeatures(
  query: string,
  features: GeocodeFeature[] | undefined,
): GeocodeResult {
  const usable = (features ?? []).filter(
    (feature) =>
      Array.isArray(feature.center) &&
      feature.center.length === 2 &&
      mentionsOntario(feature),
  );

  if (!usable.length) {
    return { status: "failed", query };
  }

  const [first, second] = usable;
  const firstRelevance = first.relevance ?? 0;
  const secondRelevance = second?.relevance ?? 0;

  if (firstRelevance < 0.4) {
    return { status: "failed", query, placeName: first.place_name, confidence: firstRelevance };
  }

  if (firstRelevance < 0.55 && second && firstRelevance - secondRelevance < 0.05) {
    return {
      status: "ambiguous",
      query,
      coordinates: first.center as [number, number],
      bbox: first.bbox,
      confidence: firstRelevance,
      placeName: first.place_name,
    };
  }

  return {
    status: "ok",
    query,
    coordinates: first.center as [number, number],
    bbox: first.bbox,
    confidence: firstRelevance,
    placeName: first.place_name,
  };
}

export function createMapboxGeocodeClient(
  token: string,
  types = "place,locality,district,region",
): GeocodeClient {
  return async (query: string) => {
    return requestMapboxGeocode(token, query, { types, proximity: [-84.7, 44.7] });
  };
}

export async function requestMapboxGeocode(
  token: string,
  query: string,
  options: { types: string; proximity?: [number, number]; autocomplete?: boolean } = {
    types: "address",
  },
): Promise<{ features?: GeocodeFeature[] }> {
  const url = new URL(
    `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json`,
  );
  url.searchParams.set("access_token", token);
  url.searchParams.set("country", "CA");
  url.searchParams.set("types", options.types);
  url.searchParams.set("limit", "5");
  url.searchParams.set("autocomplete", options.autocomplete === true ? "true" : "false");
  if (options.proximity) {
    url.searchParams.set("proximity", `${options.proximity[0]},${options.proximity[1]}`);
  }

  const response = await fetch(url);
  if (response.status === 429) {
    throw new Error("Mapbox geocoding failed with 429");
  }
  if (!response.ok) {
    throw new Error(`Mapbox geocoding failed with ${response.status}`);
  }
  return (await response.json()) as { features?: GeocodeFeature[] };
}

export function buildAddressQuery(address: string, searchCity = ""): string {
  let cleaned = address.replace(/,?\s*Canada\s*$/i, "").replace(/\s+/g, " ").trim();
  if (!cleaned) return searchCity ? `${searchCity}, Ontario, Canada` : "";
  if (searchCity && !normalizeIncludes(cleaned, searchCity)) {
    cleaned = `${cleaned}, ${searchCity}`;
  }
  if (!/\bON\b/i.test(cleaned) && !/ontario/i.test(cleaned)) {
    cleaned = `${cleaned}, Ontario`;
  }
  if (!/canada/i.test(cleaned)) {
    cleaned = `${cleaned}, Canada`;
  }
  return cleaned;
}

export function interpretAddressFeatures(
  query: string,
  features: GeocodeFeature[] | undefined,
): GeocodeResult {
  const usable = (features ?? []).filter(
    (feature) =>
      Array.isArray(feature.center) &&
      feature.center.length === 2 &&
      mentionsOntario(feature),
  );
  if (!usable.length) {
    return { status: "failed", query };
  }

  const wantedNumber = query.trim().match(/^(\d+[A-Za-z]?)/)?.[1];
  const ranked = [...usable].sort((a, b) => {
    const aMatch = wantedNumber && (a.place_name ?? "").startsWith(wantedNumber) ? 1 : 0;
    const bMatch = wantedNumber && (b.place_name ?? "").startsWith(wantedNumber) ? 1 : 0;
    if (aMatch !== bMatch) return bMatch - aMatch;
    return (b.relevance ?? 0) - (a.relevance ?? 0);
  });

  const first = ranked[0];
  const relevance = first.relevance ?? 0;
  if (relevance < 0.3 && !(wantedNumber && (first.place_name ?? "").startsWith(wantedNumber))) {
    return { status: "failed", query, placeName: first.place_name, confidence: relevance };
  }

  return {
    status: "ok",
    query,
    coordinates: first.center as [number, number],
    bbox: first.bbox,
    confidence: relevance,
    placeName: first.place_name,
  };
}

function normalizeIncludes(haystack: string, needle: string): boolean {
  return normalizeName(haystack).includes(normalizeName(needle));
}

export async function geocodeMunicipality(
  name: string,
  region: string,
  client: GeocodeClient,
): Promise<GeocodeResult> {
  const query = buildGeocodeQuery(name, region);
  const payload = await client(query);
  return interpretGeocodeFeatures(query, payload.features);
}

export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
