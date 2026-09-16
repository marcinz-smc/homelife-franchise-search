import { describe, expect, it } from "vitest";
import type { FeatureCollection } from "geojson";
import {
  HOMELIFE_ZONE_KM,
  circlePolygon,
  filterOutsideHomeLifeZones,
  haversineKm,
  homelifeZoneCollection,
} from "./geo";

const toronto: FeatureCollection = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      geometry: { type: "Point", coordinates: [-79.3832, 43.6532] },
      properties: { id: "hl1", brand: "homelife", name: "HomeLife Toronto" },
    },
  ],
};

describe("homeLife zones", () => {
  it("measures about 10km for a known offset", () => {
    const km = haversineKm([-79.3832, 43.6532], [-79.3832, 43.7432]);
    expect(km).toBeGreaterThan(9.5);
    expect(km).toBeLessThan(10.5);
  });

  it("builds a closed 10km ring around an office", () => {
    const zones = homelifeZoneCollection(toronto);
    const ring = zones.features[0].geometry;
    expect(ring.type).toBe("Polygon");
    if (ring.type !== "Polygon") return;
    expect(ring.coordinates[0][0]).toEqual(ring.coordinates[0][ring.coordinates[0].length - 1]);
    expect(zones.features[0].properties?.radiusKm).toBe(HOMELIFE_ZONE_KM);
    const circle = circlePolygon(-79.3832, 43.6532, HOMELIFE_ZONE_KM);
    const north = circle.coordinates[0][16];
    expect(haversineKm([-79.3832, 43.6532], north)).toBeGreaterThan(9);
    expect(haversineKm([-79.3832, 43.6532], north)).toBeLessThan(11);
  });

  it("merges touching HomeLife zones into one outline", () => {
    const nearby: FeatureCollection = {
      type: "FeatureCollection",
      features: [
        toronto.features[0],
        {
          type: "Feature",
          geometry: { type: "Point", coordinates: [-79.3832, 43.7] },
          properties: { id: "hl2", name: "HomeLife North" },
        },
        {
          type: "Feature",
          geometry: { type: "Point", coordinates: [-114.07, 51.04] },
          properties: { id: "hl3", name: "HomeLife Calgary" },
        },
      ],
    };
    const zones = homelifeZoneCollection(nearby);
    expect(zones.features).toHaveLength(2);
    const gta = zones.features.find((feature) => feature.properties?.officeCount === 2);
    const calgary = zones.features.find((feature) => feature.properties?.id === "hl3");
    expect(gta?.properties?.name).toBe("HomeLife coverage");
    expect(calgary?.properties?.name).toBe("HomeLife Calgary");
  });

  it("keeps competitor pins only when they sit outside every HomeLife zone", () => {
    const points: FeatureCollection = {
      type: "FeatureCollection",
      features: [
        toronto.features[0],
        {
          type: "Feature",
          geometry: { type: "Point", coordinates: [-79.39, 43.66] },
          properties: { id: "near", brand: "other", name: "Inside" },
        },
        {
          type: "Feature",
          geometry: { type: "Point", coordinates: [-80.5, 43.65] },
          properties: { id: "far", brand: "other", name: "Outside" },
        },
      ],
    };
    const filtered = filterOutsideHomeLifeZones(points, toronto);
    expect(filtered.features.map((feature) => feature.properties?.id)).toEqual(["hl1", "far"]);
  });
});
