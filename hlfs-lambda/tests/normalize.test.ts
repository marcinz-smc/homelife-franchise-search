import { describe, expect, it } from "vitest";
import {
  applyCityAlias,
  isOntario,
  normalizeName,
  normalizeProvince,
} from "../src/utils/normalize";

describe("normalizeName", () => {
  it("strips punctuation, case, and curly apostrophes", () => {
    expect(normalizeName("Burk’s Falls")).toBe("burks falls");
    expect(normalizeName("St. Catharines")).toBe("st catharines");
    expect(normalizeName("  TORONTO ")).toBe("toronto");
  });
});

describe("province helpers", () => {
  it("canonicalizes province aliases", () => {
    expect(normalizeProvince("ON")).toBe("Ontario");
    expect(normalizeProvince("pei")).toBe("Prince Edward Island");
    expect(isOntario("Ontario")).toBe(true);
    expect(isOntario("Alberta")).toBe(false);
  });
});

describe("city aliases", () => {
  it("maps neighborhoods and typos onto municipalities", () => {
    expect(applyCityAlias(normalizeName("Etobicke"))).toBe("toronto");
    expect(applyCityAlias(normalizeName("Vaughn"))).toBe("vaughan");
    expect(applyCityAlias(normalizeName("Sudbury"))).toBe("greater sudbury");
    expect(applyCityAlias(normalizeName("Chatham"))).toBe("chatham kent");
  });
});
