import { describe, expect, it } from "vitest";
import { parseCitiesCsv } from "../src/services/import/cityParser";

const csv = `Cities,Municipal status,Geographic area
Toronto,Single Tier,Toronto
"Brudenell, Lyndoch and Raglan",Lower Tier,Renfrew
BadRow,,
`;

describe("parseCitiesCsv", () => {
  it("parses quoted municipality names", () => {
    const result = parseCitiesCsv(csv);
    expect(result.municipalities).toHaveLength(2);
    expect(result.municipalities[1].name).toBe("Brudenell, Lyndoch and Raglan");
    expect(result.municipalities[0].normalizedName).toBe("toronto");
    expect(result.invalid).toHaveLength(1);
  });
});
