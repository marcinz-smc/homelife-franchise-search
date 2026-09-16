import { applyCityAlias, normalizeName } from "../../utils/normalize";
import { fuzzyThreshold, levenshtein } from "../../utils/levenshtein";

export type MatchableMunicipality = {
  id: string;
  name: string;
  municipalStatus: string;
  geographicArea: string;
  normalizedName: string;
};

export type MunicipalityMatch = {
  municipalityId: string | null;
  matchStatus: "matched" | "unmatched" | "non_ontario";
  matchNote: string;
};

const STATUS_RANK: Record<string, number> = {
  "single tier": 0,
  "lower tier": 1,
  "upper tier": 2,
};

function rankStatus(status: string): number {
  return STATUS_RANK[normalizeName(status)] ?? 9;
}

export function pickPreferredMunicipality<T extends MatchableMunicipality>(
  candidates: T[],
): T | null {
  if (!candidates.length) return null;
  return [...candidates].sort((a, b) => {
    const statusDiff = rankStatus(a.municipalStatus) - rankStatus(b.municipalStatus);
    if (statusDiff !== 0) return statusDiff;
    return a.name.localeCompare(b.name);
  })[0];
}

export function matchOntarioCity(
  city: string,
  municipalities: MatchableMunicipality[],
): MunicipalityMatch {
  const normalized = applyCityAlias(normalizeName(city));
  if (!normalized) {
    return { municipalityId: null, matchStatus: "unmatched", matchNote: "Missing city" };
  }

  const exact = municipalities.filter((item) => item.normalizedName === normalized);
  const preferredExact = pickPreferredMunicipality(
    exact.filter((item) => rankStatus(item.municipalStatus) < 2),
  ) ?? pickPreferredMunicipality(exact);

  if (preferredExact) {
    return {
      municipalityId: preferredExact.id,
      matchStatus: "matched",
      matchNote: exact.length > 1 ? `Preferred ${preferredExact.municipalStatus}` : "",
    };
  }

  const searchable = municipalities.filter((item) => rankStatus(item.municipalStatus) < 2);
  const threshold = fuzzyThreshold(normalized.length);
  const fuzzyHits = searchable
    .map((item) => ({ item, distance: levenshtein(normalized, item.normalizedName) }))
    .filter(({ item, distance }) => {
      const allowed = fuzzyThreshold(Math.min(normalized.length, item.normalizedName.length));
      return distance > 0 && distance <= Math.min(threshold, allowed);
    })
    .sort((a, b) => a.distance - b.distance);

  if (fuzzyHits.length === 1 || (fuzzyHits[0] && fuzzyHits[0].distance < (fuzzyHits[1]?.distance ?? 99))) {
    const winner = fuzzyHits[0].item;
    return {
      municipalityId: winner.id,
      matchStatus: "matched",
      matchNote: `Fuzzy match to ${winner.name}`,
    };
  }

  if (fuzzyHits.length > 1) {
    return {
      municipalityId: null,
      matchStatus: "unmatched",
      matchNote: `Ambiguous near ${fuzzyHits
        .slice(0, 3)
        .map((hit) => hit.item.name)
        .join(", ")}`,
    };
  }

  return {
    municipalityId: null,
    matchStatus: "unmatched",
    matchNote: "No Ontario municipality match",
  };
}
