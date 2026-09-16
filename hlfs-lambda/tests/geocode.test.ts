import { describe, expect, it } from "vitest";
import {
  buildAddressQuery,
  interpretAddressFeatures,
  interpretGeocodeFeatures,
} from "../src/services/import/geocode";

describe("interpretGeocodeFeatures", () => {
  it("accepts a confident Ontario result", () => {
    const result = interpretGeocodeFeatures("Ajax, Durham, Ontario, Canada", [
      {
        relevance: 0.96,
        place_name: "Ajax, Ontario, Canada",
        center: [-79.02, 43.85],
        context: [{ short_code: "CA-ON", text: "Ontario" }],
      },
    ]);
    expect(result.status).toBe("ok");
    expect(result.coordinates).toEqual([-79.02, 43.85]);
  });

  it("flags only low-confidence close results as ambiguous", () => {
    const result = interpretGeocodeFeatures("Hamilton, Hamilton, Ontario, Canada", [
      {
        relevance: 0.52,
        place_name: "Hamilton, Ontario, Canada",
        center: [-79.87, 43.26],
        context: [{ short_code: "CA-ON" }],
      },
      {
        relevance: 0.51,
        place_name: "Hamilton Township, Ontario, Canada",
        center: [-78.2, 44.05],
        context: [{ short_code: "CA-ON" }],
      },
    ]);
    expect(result.status).toBe("ambiguous");
  });

  it("accepts a clear top Ontario hit even when a neighbour is close", () => {
    const result = interpretGeocodeFeatures("Aurora, York, Ontario, Canada", [
      {
        relevance: 0.74,
        place_name: "Aurora, Ontario, Canada",
        center: [-79.43, 44.0],
        context: [{ short_code: "CA-ON" }],
      },
      {
        relevance: 0.7,
        place_name: "Aurora, something else, Ontario",
        center: [-79.5, 44.1],
        context: [{ short_code: "CA-ON" }],
      },
    ]);
    expect(result.status).toBe("ok");
  });

  it("builds a street query that stays in Ontario", () => {
    expect(buildAddressQuery("534 Estate Park Windsor, ON N8N 3C6 Canada", "Windsor")).toBe(
      "534 Estate Park Windsor, ON N8N 3C6, Canada",
    );
    expect(buildAddressQuery("200 Queen St", "Toronto")).toBe("200 Queen St, Toronto, Ontario, Canada");
  });

  it("places a RECO street on the matching Ontario address", () => {
    const result = interpretAddressFeatures("534 Estate Park, Windsor, Ontario, Canada", [
      {
        relevance: 0.86,
        place_name: "534 Estate Park, Windsor, Ontario N8N 3C6, Canada",
        center: [-82.92, 42.32],
        context: [{ short_code: "CA-ON", text: "Ontario" }],
      },
    ]);
    expect(result.status).toBe("ok");
    expect(result.coordinates).toEqual([-82.92, 42.32]);
  });

  it("fails when nothing is in Ontario", () => {
    const result = interpretGeocodeFeatures("Paris, France", [
      { relevance: 1, place_name: "Paris, France", center: [2.3, 48.8], context: [] },
    ]);
    expect(result.status).toBe("failed");
  });
});
