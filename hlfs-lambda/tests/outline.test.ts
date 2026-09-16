import { describe, expect, it } from "vitest";
import { outlinePolygon } from "../src/utils/outline";

describe("outlinePolygon", () => {
  it("uses a bbox rectangle when available", () => {
    const polygon = outlinePolygon(-79.4, 43.7, "Single Tier", [-79.6, 43.5, -79.2, 43.9]);
    expect(polygon.coordinates[0]).toEqual([
      [-79.6, 43.5],
      [-79.2, 43.5],
      [-79.2, 43.9],
      [-79.6, 43.9],
      [-79.6, 43.5],
    ]);
  });

  it("falls back to an oval around the centroid", () => {
    const polygon = outlinePolygon(-79.4, 43.7, "Lower Tier");
    expect(polygon.coordinates[0]).toHaveLength(17);
    expect(polygon.coordinates[0][0]).toEqual(polygon.coordinates[0][16]);
  });
});
