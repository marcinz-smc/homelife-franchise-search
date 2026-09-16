import { describe, expect, it } from "vitest";
import { matchOntarioCity } from "../src/services/import/matchMunicipality";

const municipalities = [
  { id: "1", name: "Toronto", municipalStatus: "Single Tier", geographicArea: "Toronto", normalizedName: "toronto" },
  { id: "2", name: "Vaughan", municipalStatus: "Lower Tier", geographicArea: "York", normalizedName: "vaughan" },
  { id: "3", name: "Hamilton", municipalStatus: "Single Tier", geographicArea: "Hamilton", normalizedName: "hamilton" },
  { id: "4", name: "Hamilton", municipalStatus: "Lower Tier", geographicArea: "Northumberland", normalizedName: "hamilton" },
  { id: "5", name: "Ingersoll", municipalStatus: "Lower Tier", geographicArea: "Oxford", normalizedName: "ingersoll" },
  { id: "6", name: "Greater Sudbury", municipalStatus: "Single Tier", geographicArea: "Sudbury", normalizedName: "greater sudbury" },
  { id: "7", name: "York", municipalStatus: "Upper Tier", geographicArea: "York", normalizedName: "york" },
];

describe("matchOntarioCity", () => {
  it("prefers the single-tier city when names collide", () => {
    const match = matchOntarioCity("Hamilton", municipalities);
    expect(match.municipalityId).toBe("3");
    expect(match.matchStatus).toBe("matched");
  });

  it("applies neighborhood aliases", () => {
    expect(matchOntarioCity("Etobicoke", municipalities).municipalityId).toBe("1");
    expect(matchOntarioCity("Vaughn", municipalities).municipalityId).toBe("2");
    expect(matchOntarioCity("Sudbury", municipalities).municipalityId).toBe("6");
  });

  it("fuzzy-matches small typos that are not aliased", () => {
    const match = matchOntarioCity("Ingersollz", municipalities);
    expect(match.municipalityId).toBe("5");
    expect(match.matchNote).toMatch(/fuzzy/i);
  });

  it("leaves unknown cities unmatched", () => {
    const match = matchOntarioCity("Atlantis", municipalities);
    expect(match.matchStatus).toBe("unmatched");
    expect(match.municipalityId).toBeNull();
  });
});
