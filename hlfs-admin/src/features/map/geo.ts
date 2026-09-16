import type { Feature, FeatureCollection, Point, Polygon, Position } from "geojson";
import polygonClipping from "polygon-clipping";

export const HOMELIFE_ZONE_KM = 10;

export function haversineKm(a: Position, b: Position): number {
  const earthKm = 6371;
  const toRad = (value: number) => (value * Math.PI) / 180;
  const dLat = toRad(b[1] - a[1]);
  const dLng = toRad(b[0] - a[0]);
  const lat1 = toRad(a[1]);
  const lat2 = toRad(b[1]);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * earthKm * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function circlePolygon(lng: number, lat: number, radiusKm: number, steps = 64): Polygon {
  const latDelta = radiusKm / 110.574;
  const lngDelta = radiusKm / (111.32 * Math.max(0.2, Math.cos((lat * Math.PI) / 180)));
  const ring: Position[] = [];
  for (let i = 0; i <= steps; i += 1) {
    const angle = (i / steps) * Math.PI * 2;
    ring.push([lng + Math.cos(angle) * lngDelta, lat + Math.sin(angle) * latDelta]);
  }
  return { type: "Polygon", coordinates: [ring] };
}

export function pointCoordinates(feature: Feature): Position | null {
  if (feature.geometry?.type !== "Point") return null;
  const [lng, lat] = (feature.geometry as Point).coordinates;
  if (!Number.isFinite(lng) || !Number.isFinite(lat)) return null;
  return [lng, lat];
}

export function homelifeZoneCollection(centers: FeatureCollection): FeatureCollection {
  const offices = centers.features.flatMap((feature) => {
    const coordinates = pointCoordinates(feature);
    if (!coordinates) return [];
    return [
      {
        id: String(feature.properties?.id ?? feature.id ?? ""),
        name: String(feature.properties?.name ?? "HomeLife office"),
        city: String(feature.properties?.city ?? ""),
        coordinates,
      },
    ];
  });

  return {
    type: "FeatureCollection",
    features: connectedOffices(offices).flatMap((group, index) => {
      const circles = group.map((office) =>
        circlePolygon(office.coordinates[0], office.coordinates[1], HOMELIFE_ZONE_KM),
      );
      const geometry = unionPolygons(circles);
      const first = group[0];
      const officeCount = group.length;
      return geometry.map((polygon, part) => ({
        type: "Feature" as const,
        id: `zone:${first.id || index}:${part}`,
        geometry: polygon,
        properties: {
          id: officeCount === 1 ? first.id : "",
          name: officeCount === 1 ? first.name : "HomeLife coverage",
          city: officeCount === 1 ? first.city : "",
          officeCount,
          radiusKm: HOMELIFE_ZONE_KM,
        },
      }));
    }),
  };
}

function connectedOffices(
  offices: { id: string; name: string; city: string; coordinates: Position }[],
) {
  const parent = offices.map((_, index) => index);
  const find = (index: number): number =>
    parent[index] === index ? index : (parent[index] = find(parent[index]));
  const linkKm = HOMELIFE_ZONE_KM * 2 + 0.05;
  for (let i = 0; i < offices.length; i += 1) {
    for (let j = i + 1; j < offices.length; j += 1) {
      if (haversineKm(offices[i].coordinates, offices[j].coordinates) <= linkKm) {
        const left = find(i);
        const right = find(j);
        if (left !== right) parent[left] = right;
      }
    }
  }
  const groups = new Map<number, typeof offices>();
  offices.forEach((office, index) => {
    const root = find(index);
    const group = groups.get(root) ?? [];
    group.push(office);
    groups.set(root, group);
  });
  return [...groups.values()];
}

function unionPolygons(polygons: Polygon[]): Polygon[] {
  if (!polygons.length) return [];
  if (polygons.length === 1) return polygons;
  try {
    const merged = polygonClipping.union(
      polygons[0].coordinates as polygonClipping.Polygon,
      ...polygons.slice(1).map((polygon) => polygon.coordinates as polygonClipping.Polygon),
    );
    return merged.map((coordinates) => ({ type: "Polygon" as const, coordinates }));
  } catch {
    return polygons;
  }
}

export function filterOutsideHomeLifeZones(
  points: FeatureCollection,
  centers: FeatureCollection,
): FeatureCollection {
  const homes = centers.features
    .map(pointCoordinates)
    .filter((item): item is Position => item !== null);
  return {
    type: "FeatureCollection",
    features: points.features.filter((feature) => {
      if (feature.properties?.brand === "homelife") return true;
      const coordinates = pointCoordinates(feature);
      if (!coordinates) return false;
      return homes.every((home) => haversineKm(coordinates, home) > HOMELIFE_ZONE_KM);
    }),
  };
}
