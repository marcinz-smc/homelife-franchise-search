import { describe, expect, it } from "vitest";
import { parseOfficesJson } from "../src/services/import/officeParser";

const sample = {
  id: "84719",
  slug: "homelife-247-realty-inc-mississauga",
  name: "HomeLife 247 Realty Inc., Brokerage*",
  city: "Mississauga",
  province: "Ontario",
  lat: 43.599,
  lng: -79.739,
};

describe("parseOfficesJson", () => {
  it("parses valid offices and GeoJSON coordinates", () => {
    const result = parseOfficesJson([sample]);
    expect(result.invalid).toEqual([]);
    expect(result.offices[0].externalId).toBe("84719");
    expect(result.offices[0].location.coordinates).toEqual([-79.739, 43.599]);
    expect(result.offices[0].matchStatus).toBe("unmatched");
  });

  it("marks non-Ontario offices out of municipality matching", () => {
    const result = parseOfficesJson([{ ...sample, id: "9", province: "Alberta" }]);
    expect(result.offices[0].province).toBe("Alberta");
    expect(result.offices[0].matchStatus).toBe("non_ontario");
  });

  it("collects invalid rows without throwing", () => {
    const result = parseOfficesJson([{ name: "Broken" }, sample]);
    expect(result.offices).toHaveLength(1);
    expect(result.invalid[0].row).toBe(1);
  });

  it("rejects a non-array payload", () => {
    expect(() => parseOfficesJson({ hello: true })).toThrow(/array/i);
  });
});
