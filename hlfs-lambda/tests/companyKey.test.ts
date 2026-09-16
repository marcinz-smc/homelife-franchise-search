import { describe, expect, it } from "vitest";
import { companyKey } from "../src/utils/companyKey";

describe("companyKey", () => {
  it("treats the same legal name in two cities as one company", () => {
    expect(companyKey("BOB PEDLER REAL ESTATE LIMITED")).toBe("bob pedler real estate ltd");
    expect(companyKey("Bob Pedler Real Estate Limited")).toBe(companyKey("BOB PEDLER REAL ESTATE LIMITED"));
  });

  it("collapses Ltd/Limited and drops Brokerage suffixes", () => {
    expect(companyKey("Royal LePage Sample Inc., Brokerage")).toBe(companyKey("Royal LePage Sample Inc."));
    expect(companyKey("Sample Realty Limited")).toBe("sample realty ltd");
    expect(companyKey("Sample Realty Ltd.")).toBe("sample realty ltd");
  });

  it("does not collapse different franchise corporations into one key", () => {
    expect(companyKey("RE/MAX Preferred Realty Ltd.")).not.toBe(companyKey("RE/MAX Capital Inc."));
  });
});
