import { applyCityAlias, normalizeName } from "../../utils/normalize";

export type CityPoint = {
  id: string;
  normalizedName: string;
  coordinates?: [number, number];
};

export function pickCityPoint(city: string, catalog: CityPoint[]): CityPoint | null {
  const normalized = applyCityAlias(normalizeName(city));
  if (!normalized) return null;
  const located = catalog.filter((item) => item.coordinates?.length === 2);
  const exact = located.find((item) => item.normalizedName === normalized);
  if (exact) return exact;

  const prefixed = located.filter(
    (item) =>
      normalized.length >= 5 &&
      (item.normalizedName.startsWith(`${normalized} `) || item.normalizedName === normalized),
  );
  if (prefixed.length === 1) return prefixed[0];
  return null;
}
