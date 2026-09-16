import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { ImportJob } from "hlfs-mongo";
import { Municipality } from "hlfs-mongo";
import { Office } from "hlfs-mongo";
import { RecoBrokerage } from "hlfs-mongo";
import { inheritCompanyLeads } from "../src/services/import/shareCompanyLeads";
import { User } from "hlfs-mongo";
import { importMunicipalities } from "../src/services/import/importMunicipalities";
import { importRecoBrokerages } from "../src/services/import/importReco";
import {
  app,
  cityCsv,
  createAdmin,
  sampleRecoCsv,
  startMemoryMongo,
  stopMemoryMongo,
} from "./helpers";

const ingestKey = "test-ingest-key-not-for-production";
const leadReport = {
  import_version: "homelife_lead_v2",
  registration_number: "R200",
  overall_score: 80,
  priority_band: "B",
  service_need_rating: 72,
  business_foundation_rating: 88,
  conversion_potential_rating: 81,
  primary_contact: { name: "John Broker", evidenced_role: "Broker of Record" },
  strongest_reasons: ["Owner-operator with a strong conversion signal."],
};

let mongo: Awaited<ReturnType<typeof startMemoryMongo>>;

beforeAll(async () => {
  process.env.INGEST_API_KEY = ingestKey;
  mongo = await startMemoryMongo();
});

afterAll(async () => {
  delete process.env.INGEST_API_KEY;
  await stopMemoryMongo(mongo);
});

beforeEach(async () => {
  process.env.INGEST_API_KEY = ingestKey;
  await Promise.all([
    User.deleteMany({}),
    Office.deleteMany({}),
    Municipality.deleteMany({}),
    ImportJob.deleteMany({}),
    RecoBrokerage.deleteMany({}),
  ]);
  await createAdmin();
  await importMunicipalities(cityCsv, "cities.csv", undefined, {
    geocodeClient: async (query: string) => ({
      features: [
        {
          relevance: 0.95,
          place_name: query,
          center: [-79.4, 43.7] as [number, number],
          context: [{ short_code: "CA-ON", text: "Ontario" }],
        },
      ],
    }),
  });
  await importRecoBrokerages(sampleRecoCsv, "all_brokerages.csv");
});

describe("lead ingest API", () => {
  it("rejects requests without a key", async () => {
    const response = await request(app()).post("/api/ingest/leads").send(leadReport);
    expect(response.status).toBe(401);
  });

  it("rejects the wrong key", async () => {
    const response = await request(app())
      .post("/api/ingest/leads")
      .set("X-Ingest-Key", "nope")
      .send(leadReport);
    expect(response.status).toBe(401);
  });

  it("accepts a scored JSON body with a Bearer key and updates the matching desk", async () => {
    const response = await request(app())
      .post("/api/ingest/leads")
      .set("Authorization", `Bearer ${ingestKey}`)
      .set("X-Lead-Filename", "royal.json")
      .send(leadReport);

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      ok: true,
      applied: 1,
      unmatched: 0,
      invalid: 0,
    });

    const royal = await RecoBrokerage.findOne({ registrationNumber: "R200" });
    expect(royal?.lead?.overallScore).toBe(80);
    expect(royal?.lead?.scoreBand).toBe("good");
    expect(royal?.lead?.contact.name).toBe("John Broker");
  });

  it("reports unmatched registration numbers without creating a new desk", async () => {
    const response = await request(app())
      .post("/api/ingest/leads")
      .set("X-Ingest-Key", ingestKey)
      .send({ ...leadReport, registration_number: "MISSING" });

    expect(response.status).toBe(200);
    expect(response.body.applied).toBe(0);
    expect(response.body.unmatched).toBe(1);
    expect(await RecoBrokerage.countDocuments({ registrationNumber: "MISSING" })).toBe(0);
  });

  it("answers health checks with a valid key and does not require a login cookie", async () => {
    const response = await request(app()).get("/api/ingest/health").set("X-Ingest-Key", ingestKey);
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ ok: true, ingest: "leads" });
  });

  it("tells the scanner when a desk or a sibling location already has extended data", async () => {
    await RecoBrokerage.create({
      registrationNumber: "R201",
      legalName: "Royal LePage Sample Inc.",
      searchCity: "Mississauga",
      address: "1 Hurontario St",
      isHomeLife: false,
      companyKey: "royal lepage sample inc",
    });

    const empty = await request(app())
      .get("/api/ingest/status")
      .query({ registration_number: "R200" })
      .set("X-Ingest-Key", ingestKey);
    expect(empty.status).toBe(200);
    expect(empty.body).toMatchObject({
      found: true,
      analyzed: false,
      skip: false,
      has_extended_data: false,
      reason: "not_analyzed",
      location_count: 2,
    });

    await request(app())
      .post("/api/ingest/leads")
      .set("X-Ingest-Key", ingestKey)
      .send(leadReport)
      .expect(200);

    const self = await request(app())
      .get("/api/ingest/status")
      .query({ registration_number: "R200" })
      .set("X-Ingest-Key", ingestKey);
    expect(self.body).toMatchObject({
      found: true,
      analyzed: true,
      skip: true,
      has_extended_data: true,
      reason: "self",
      origin_registration_number: "R200",
      overall_score: 80,
    });

    const sibling = await request(app())
      .get("/api/ingest/status")
      .query({ registration_number: "R201" })
      .set("X-Ingest-Key", ingestKey);
    expect(sibling.body).toMatchObject({
      found: true,
      analyzed: true,
      skip: true,
      has_extended_data: true,
      reason: "company",
      origin_registration_number: "R200",
    });

    const missing = await request(app())
      .get("/api/ingest/status")
      .query({ registration_number: "MISSING" })
      .set("X-Ingest-Key", ingestKey);
    expect(missing.body).toMatchObject({ found: false, skip: false, reason: "not_found" });

    const batch = await request(app())
      .post("/api/ingest/status")
      .set("X-Ingest-Key", ingestKey)
      .send({ registration_numbers: ["R200", "MISSING"] });
    expect(batch.status).toBe(200);
    expect(batch.body.results).toHaveLength(2);
    expect(batch.body.results[0].skip).toBe(true);
    expect(batch.body.results[1].reason).toBe("not_found");
  });

  it("skips a desk that was plotted after the company was already scanned", async () => {
    await request(app())
      .post("/api/ingest/leads")
      .set("X-Ingest-Key", ingestKey)
      .send(leadReport)
      .expect(200);

    await RecoBrokerage.create({
      registrationNumber: "R201",
      legalName: "Royal LePage Sample Inc.",
      searchCity: "Chatham",
      address: "250 St.Clair Street",
      isHomeLife: false,
    });

    await inheritCompanyLeads({ registrationNumbers: ["R201"] });

    const late = await request(app())
      .get("/api/ingest/status")
      .query({ registration_number: "R201" })
      .set("X-Ingest-Key", ingestKey);
    expect(late.body).toMatchObject({
      found: true,
      analyzed: true,
      skip: true,
      has_extended_data: true,
      reason: "company",
      origin_registration_number: "R200",
      overall_score: 80,
    });

    const byName = await request(app())
      .get("/api/ingest/status")
      .query({ legal_name: "royal lepage sample inc." })
      .set("X-Ingest-Key", ingestKey);
    expect(byName.body.skip).toBe(true);
    expect(byName.body.location_count).toBe(2);
  });
});
