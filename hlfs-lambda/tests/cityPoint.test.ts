import { describe, expect, it } from "vitest";
import { pickCityPoint } from "../src/services/import/cityPoint";
import { applyCityAlias, normalizeName } from "../src/utils/normalize";

const catalog = [
  { id: "ck", normalizedName: "chatham kent", coordinates: [-82.18, 42.4] as [number, number] },
  { id: "bb", normalizedName: "blandford blenheim", coordinates: [-80.6, 43.2] as [number, number] },
  { id: "elgin", normalizedName: "elgin", coordinates: [-81.2, 42.7] as [number, number] },
  { id: "sc", normalizedName: "strathroy caradoc", coordinates: [-81.62, 42.96] as [number, number] },
];

describe("pickCityPoint", () => {
  it("maps Chatham onto Chatham-Kent", () => {
    const match = pickCityPoint("Chatham", catalog);
    expect(match?.id).toBe("ck");
  });

  it("does not pin Blenheim to Blandford-Blenheim", () => {
    expect(pickCityPoint("Blenheim", catalog)?.id).toBe("ck");
  });

  it("does not pin Port Elgin to Elgin County", () => {
    expect(pickCityPoint("Port Elgin", catalog)).toBeNull();
  });

  it("maps Strathroy by prefix when the alias is already applied", () => {
    expect(pickCityPoint("Strathroy", catalog)?.id).toBe("sc");
  });
});

describe("city aliases", () => {
  it("maps neighborhoods and amalgamated towns onto municipalities", () => {
    expect(applyCityAlias(normalizeName("Etobicke"))).toBe("toronto");
    expect(applyCityAlias(normalizeName("Vaughn"))).toBe("vaughan");
    expect(applyCityAlias(normalizeName("Sudbury"))).toBe("greater sudbury");
    expect(applyCityAlias(normalizeName("Chatham"))).toBe("chatham kent");
    expect(applyCityAlias(normalizeName("Bowmanville"))).toBe("clarington");
  });
});
