import { describe, expect, it } from "vitest";
import { isHomeLifeName, jitterFromId, parseRecoCsv } from "../src/services/import/recoParser";
import { sampleRecoCsv } from "./helpers";

describe("recoParser", () => {
  it("parses RECO rows and flags HomeLife names", () => {
    const parsed = parseRecoCsv(sampleRecoCsv);
    expect(parsed.invalid).toEqual([]);
    expect(parsed.brokerages).toHaveLength(3);
    expect(parsed.brokerages[0]).toMatchObject({
      registrationNumber: "H100",
      legalName: "HomeLife Sample Realty Inc.",
      isHomeLife: true,
      searchCity: "Toronto",
      email: "home@example.com",
    });
    expect(parsed.brokerages[1].isHomeLife).toBe(false);
    expect(isHomeLifeName("HOMELIFE Landmark Realty Inc.")).toBe(true);
    expect(isHomeLifeName("Royal LePage")).toBe(false);
  });

  it("skips missing and duplicate registrations", () => {
    const parsed = parseRecoCsv(`${sampleRecoCsv}
,Brokerage,,REGISTERED,,,,,,,,,Toronto,2026-01-01
Royal Duplicate,Brokerage,R200,REGISTERED,,,,,,,,,Toronto,2026-01-01
`);
    expect(parsed.invalid.map((item) => item.message)).toEqual([
      "Missing legal name or registration number",
      "Duplicate registration R200",
    ]);
  });

  it("jitters the same registration to the same offset", () => {
    expect(jitterFromId("R200")).toEqual(jitterFromId("R200"));
    expect(jitterFromId("R200")).not.toEqual(jitterFromId("H100"));
  });
});
