import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { ImportJob } from "hlfs-mongo";
import { Municipality } from "hlfs-mongo";
import { Office } from "hlfs-mongo";
import { RecoBrokerage } from "hlfs-mongo";
import { User } from "hlfs-mongo";
import {
  cityCsv,
  createAdmin,
  loginAgent,
  sampleOffices,
  sampleRecoCsv,
  startMemoryMongo,
  stopMemoryMongo,
} from "./helpers";

let mongo: Awaited<ReturnType<typeof startMemoryMongo>>;

beforeAll(async () => {
  mongo = await startMemoryMongo();
});

afterAll(async () => {
  await stopMemoryMongo(mongo);
});

beforeEach(async () => {
  await Promise.all([
    User.deleteMany({}),
    Office.deleteMany({}),
    Municipality.deleteMany({}),
    ImportJob.deleteMany({}),
    RecoBrokerage.deleteMany({}),
  ]);
  await createAdmin();
});

describe("end-to-end smoke", () => {
  it("logs in, imports data, filters, reads an office, and finds open ground", async () => {
    const agent = await loginAgent();

    const cities = await agent
      .post("/api/admin/import/municipalities")
      .attach("file", Buffer.from(cityCsv), "cities.csv");
    expect(cities.status).toBe(200);
    expect(cities.body.job.summary.inserted).toBeGreaterThan(0);

    await Municipality.updateMany(
      {},
      { $set: { location: { type: "Point", coordinates: [-79.4, 43.7] }, geocodeStatus: "ok" } },
    );

    const offices = await agent
      .post("/api/admin/import/offices")
      .attach("file", Buffer.from(JSON.stringify(sampleOffices())), "offices.json");
    expect(offices.status).toBe(200);

    const filtered = await agent.get("/api/offices").query({ province: "Ontario", q: "Vaughan" });
    expect(filtered.body.offices).toHaveLength(1);

    const reco = await agent
      .post("/api/admin/import/reco")
      .attach("file", Buffer.from(sampleRecoCsv), "all_brokerages.csv");
    expect(reco.status).toBe(200);
    expect(reco.body.job.summary.inserted).toBe(3);

    const geo = await agent.get("/api/offices/geojson");
    expect(geo.body.features.length).toBe(3);

    const points = await agent.get("/api/map/points");
    const brands = points.body.features.map((feature: { properties: { brand: string; source: string } }) => feature.properties);
    expect(brands.filter((item: { brand: string }) => item.brand === "homelife")).toHaveLength(3);
    expect(brands.filter((item: { source: string }) => item.source === "reco")).toHaveLength(2);

    const recoHit = points.body.features.find(
      (feature: { properties: { source: string; name: string } }) =>
        feature.properties.source === "reco" && feature.properties.name.includes("Royal LePage"),
    );
    const recoDetail = await agent.get(`/api/map/reco/${recoHit.properties.id}`);
    expect(recoDetail.body.brokerage.registrationNumber).toBe("R200");
    expect(recoDetail.body.brokerage.phone).toBe("416-555-0200");
    expect(recoDetail.body.brokerage.lead).toBeNull();
    expect(recoDetail.body.brokerage.locations).toHaveLength(1);

    const leads = await agent.post("/api/admin/import/leads").send({
      import_version: "homelife_lead_v2",
      registration_number: "R200",
      overall_score: 80,
      priority_band: "B",
      service_need_rating: 72,
      business_foundation_rating: 88,
      conversion_potential_rating: 81,
      primary_contact: { name: "John Broker", evidenced_role: "Broker of Record" },
      strongest_reasons: ["Strong conversion potential with an owner-operator."],
    });
    expect(leads.status).toBe(200);
    expect(leads.body.job.summary.updated).toBe(1);

    const scoredPoints = await agent.get("/api/map/points");
    const scored = scoredPoints.body.features.find(
      (feature: { properties: { source: string; name: string } }) =>
        feature.properties.source === "reco" && feature.properties.name.includes("Royal LePage"),
    );
    expect(scored.properties).toMatchObject({
      hasLead: 1,
      scoreBand: "good",
      overallScore: 80,
    });

    const scoredDetail = await agent.get(`/api/map/reco/${recoHit.properties.id}`);
    expect(scoredDetail.body.brokerage.lead.overallScore).toBe(80);
    expect(scoredDetail.body.brokerage.lead.contact.name).toBe("John Broker");

    const search = await agent.get("/api/map/search").query({ q: "Royal" });
    expect(search.body.results[0].source).toBe("reco");

    const detail = await agent.get(`/api/offices/${filtered.body.offices[0].id}`);
    expect(detail.body.office.brokerageGroup).toBe("HomeLife Achievers");

    const summary = await agent.get("/api/coverage/summary");
    expect(summary.body.officeCount).toBe(3);
    expect(summary.body.otherOfficeCount).toBe(1);
    expect(summary.body.uncoveredCount).toBeGreaterThan(0);

    const openGround = await agent.get("/api/coverage/municipalities").query({
      covered: "false",
      tier: "city",
    });
    const names = openGround.body.items.map((item: { name: string }) => item.name);
    expect(names).toContain("Ajax");

    const ledgers = await agent.get("/api/coverage/municipalities");
    const toronto = ledgers.body.items.find((item: { name: string }) => item.name === "Toronto");
    const ajaxCity = ledgers.body.items.find((item: { name: string }) => item.name === "Ajax");
    expect(toronto).toMatchObject({ officeCount: 1, otherCount: 1 });
    expect(ajaxCity).toMatchObject({ officeCount: 0, otherCount: 1 });

    const outside = await agent.get("/api/coverage/outside-ontario");
    expect(outside.body.items).toEqual([
      { province: "Alberta", city: "Calgary", officeCount: 1 },
    ]);
  });
});
