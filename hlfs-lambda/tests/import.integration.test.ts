import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { ImportJob } from "hlfs-mongo";
import { Municipality } from "hlfs-mongo";
import { Office } from "hlfs-mongo";
import { User } from "hlfs-mongo";
import { importMunicipalities } from "../src/services/import/importMunicipalities";
import { importOffices } from "../src/services/import/importOffices";
import { geocodeRecoAddresses } from "../src/services/import/geocodeReco";
import { importLeads } from "../src/services/import/importLeads";
import { importRecoBrokerages } from "../src/services/import/importReco";
import { RecoBrokerage } from "hlfs-mongo";
import { inheritCompanyLeads } from "../src/services/import/shareCompanyLeads";
import { findCompanyDesks, leadForDesk } from "../src/services/reco/companyDesks";
import {
  cityCsv,
  createAdmin,
  sampleOffices,
  sampleRecoCsv,
  startMemoryMongo,
  stopMemoryMongo,
} from "./helpers";

let mongo: Awaited<ReturnType<typeof startMemoryMongo>>;

const fakeGeocode = async (query: string) => ({
  features: [
    {
      relevance: 0.95,
      place_name: `${query}`,
      center: [-79.4, 43.7] as [number, number],
      context: [{ short_code: "CA-ON", text: "Ontario" }],
    },
  ],
});

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

describe("imports", () => {
  it("upserts offices idempotently and matches Ontario cities", async () => {
    await importMunicipalities(cityCsv, "cities.csv", undefined, {
      geocodeClient: fakeGeocode,
    });
    const first = await importOffices(sampleOffices(), "offices.json");
    const second = await importOffices(sampleOffices(), "offices.json");

    expect(first.summary.inserted).toBe(3);
    expect(second.summary.inserted).toBe(0);
    expect(second.summary.updated).toBe(3);

    const toronto = await Municipality.findOne({ normalizedName: "toronto" });
    const etobicoke = await Office.findOne({ slug: "homelife-toronto" });
    expect(etobicoke?.matchStatus).toBe("matched");
    expect(String(etobicoke?.municipalityId)).toBe(String(toronto?._id));

    const calgary = await Office.findOne({ slug: "homelife-calgary" });
    expect(calgary?.matchStatus).toBe("non_ontario");
  });

  it("snaps RECO brokerages to municipality centroids and leaves existing desks untouched", async () => {
    await importMunicipalities(cityCsv, "cities.csv", undefined, {
      geocodeClient: fakeGeocode,
    });
    const first = await importRecoBrokerages(sampleRecoCsv, "all_brokerages.csv");
    await RecoBrokerage.updateOne(
      { registrationNumber: "R200" },
      { $set: { address: "KEEP THIS STREET", searchCity: "Toronto" } },
    );
    const extraCsv = `${sampleRecoCsv}
New Branch Realty Inc.,Brokerage,N400,REGISTERED,2027/03/01,Sam Broker,"10 Hurontario St Mississauga, ON L5B 1B1 Canada",new@example.com,905-555-0400,None,https://example.com/n,https://example.com/n-staff,Mississauga,2026-09-10T18:45:19+00:00
`;
    const second = await importRecoBrokerages(extraCsv, "all_brokerages.csv");

    expect(first.summary.inserted).toBe(3);
    expect(second.summary.inserted).toBe(1);
    expect(second.summary.updated).toBe(0);
    expect(second.summary.skipped).toBe(3);

    const royal = await RecoBrokerage.findOne({ registrationNumber: "R200" });
    expect(royal?.isHomeLife).toBe(false);
    expect(royal?.address).toBe("KEEP THIS STREET");
    expect(royal?.geocodeStatus).toBe("city");
    expect(royal?.location?.coordinates).toHaveLength(2);
    expect(royal?.searchCity).toBe("Toronto");

    const added = await RecoBrokerage.findOne({ registrationNumber: "N400" });
    expect(added?.legalName).toBe("New Branch Realty Inc.");
    expect(added?.searchCity).toBe("Mississauga");
    expect(added?.geocodeStatus).toBe("city");

    const street = await geocodeRecoAddresses(async () => ({
      features: [
        {
          relevance: 0.92,
          place_name: "200 Queen St, Toronto, Ontario, Canada",
          center: [-79.3832, 43.6532],
          context: [{ short_code: "CA-ON", text: "Ontario" }],
        },
      ],
    }));
    expect(street.geocoded).toBe(4);
    const moved = await RecoBrokerage.findOne({ registrationNumber: "R200" });
    expect(moved?.geocodeStatus).toBe("ok");
    expect(moved?.location?.coordinates).toEqual([-79.3832, 43.6532]);
  });

  it("attaches compact lead scores to matching RECO desks", async () => {
    await importMunicipalities(cityCsv, "cities.csv", undefined, {
      geocodeClient: fakeGeocode,
    });
    await importRecoBrokerages(sampleRecoCsv, "all_brokerages.csv");

    const job = await importLeads(
      [
        {
          import_version: "homelife_lead_v2",
          registration_number: "R200",
          overall_score: 63,
          priority_band: "C",
          service_need_rating: 38,
          business_foundation_rating: 90,
          conversion_potential_rating: 85,
          primary_contact: { name: "John Broker", evidenced_role: "Broker of Record" },
        },
        {
          import_version: "homelife_lead_v2",
          registration_number: "MISSING",
          overall_score: 80,
        },
      ],
      "2 lead files",
    );

    expect(job.summary.updated).toBe(1);
    expect(job.summary.unmatched).toBe(1);
    const royal = await RecoBrokerage.findOne({ registrationNumber: "R200" });
    expect(royal?.lead?.scoreBand).toBe("medium");
    expect(royal?.lead?.overallScore).toBe(63);
    expect(royal?.lead?.contact.name).toBe("John Broker");
  });

  it("copies a company scan onto other desks with the same legal name", async () => {
    await importMunicipalities(cityCsv, "cities.csv", undefined, {
      geocodeClient: fakeGeocode,
    });
    await importRecoBrokerages(sampleRecoCsv, "all_brokerages.csv");
    await RecoBrokerage.create({
      registrationNumber: "R201",
      legalName: "Royal LePage Sample Inc.",
      searchCity: "Mississauga",
      address: "1 Hurontario St Mississauga, ON",
      isHomeLife: false,
      companyKey: "royal lepage sample inc",
      location: { type: "Point", coordinates: [-79.65, 43.59] },
      geocodeStatus: "city",
    });

    const job = await importLeads(
      {
        import_version: "homelife_lead_v2",
        registration_number: "R200",
        legal_name: "Royal LePage Sample Inc.",
        overall_score: 80,
        service_need_rating: 70,
        business_foundation_rating: 88,
        conversion_potential_rating: 81,
      },
      "royal.json",
    );

    expect(job.summary.updated).toBe(2);
    expect(job.summary.unmatched).toBe(0);

    const windsor = await RecoBrokerage.findOne({ registrationNumber: "R200" });
    const mississauga = await RecoBrokerage.findOne({ registrationNumber: "R201" });
    expect(windsor?.lead?.overallScore).toBe(80);
    expect(windsor?.lead?.shared).toBe(false);
    expect(windsor?.lead?.originRegistrationNumber).toBe("R200");
    expect(mississauga?.lead?.overallScore).toBe(80);
    expect(mississauga?.lead?.shared).toBe(true);
    expect(mississauga?.lead?.originRegistrationNumber).toBe("R200");
  });

  it("does not overwrite a desk that already has its own scan", async () => {
    await importMunicipalities(cityCsv, "cities.csv", undefined, {
      geocodeClient: fakeGeocode,
    });
    await importRecoBrokerages(sampleRecoCsv, "all_brokerages.csv");
    await RecoBrokerage.create({
      registrationNumber: "R201",
      legalName: "Royal LePage Sample Inc.",
      searchCity: "Mississauga",
      isHomeLife: false,
      companyKey: "royal lepage sample inc",
      lead: {
        overallScore: 52,
        scoreBand: "low",
        originRegistrationNumber: "R201",
        shared: false,
      },
    });

    await importLeads(
      {
        import_version: "homelife_lead_v2",
        registration_number: "R200",
        overall_score: 80,
      },
      "royal.json",
    );

    const mississauga = await RecoBrokerage.findOne({ registrationNumber: "R201" });
    expect(mississauga?.lead?.overallScore).toBe(52);
    expect(mississauga?.lead?.originRegistrationNumber).toBe("R201");
  });

  it("still shows a company scan on a later branch that was not copied yet", async () => {
    await importMunicipalities(cityCsv, "cities.csv", undefined, {
      geocodeClient: fakeGeocode,
    });
    await importRecoBrokerages(sampleRecoCsv, "all_brokerages.csv");
    await importLeads(
      {
        import_version: "homelife_lead_v2",
        registration_number: "R200",
        overall_score: 80,
      },
      "royal.json",
    );
    const branch = await RecoBrokerage.create({
      registrationNumber: "R201",
      legalName: "Royal LePage Sample Inc.",
      searchCity: "Mississauga",
      isHomeLife: false,
    });

    const family = await findCompanyDesks({
      registrationNumber: "R201",
      legalName: "Royal LePage Sample Inc.",
    });
    const lead = leadForDesk(
      family.find((item) => item.registrationNumber === "R201") ?? {
        _id: branch._id,
        registrationNumber: "R201",
        legalName: "Royal LePage Sample Inc.",
      },
      family,
    );
    expect(family).toHaveLength(2);
    expect(lead?.overallScore).toBe(80);
    expect(lead?.shared).toBe(true);
    expect(lead?.originRegistrationNumber).toBe("R200");
  });

  it("copies an existing company scan onto a desk imported later", async () => {
    await importMunicipalities(cityCsv, "cities.csv", undefined, {
      geocodeClient: fakeGeocode,
    });
    await importRecoBrokerages(sampleRecoCsv, "all_brokerages.csv");
    await importLeads(
      {
        import_version: "homelife_lead_v2",
        registration_number: "R200",
        overall_score: 80,
      },
      "royal.json",
    );

    const laterCsv = `${sampleRecoCsv}
Royal LePage Sample Inc.,Brokerage,R201,REGISTERED,2027/03/01,John Broker,"1 Hurontario St Mississauga, ON L5B 1B1 Canada",royal2@example.com,905-555-0400,None,https://example.com/r2,https://example.com/r2-staff,Mississauga,2026-09-10T18:45:19+00:00
`;
    await importRecoBrokerages(laterCsv, "all_brokerages.csv");

    const branch = await RecoBrokerage.findOne({ registrationNumber: "R201" });
    expect(branch?.lead?.overallScore).toBe(80);
    expect(branch?.lead?.shared).toBe(true);
    expect(branch?.lead?.originRegistrationNumber).toBe("R200");
  });

  it("copies a scan onto a late Ltd/Limited sibling after company keys are filled", async () => {
    await RecoBrokerage.create({
      registrationNumber: "B1",
      legalName: "BOB PEDLER REAL ESTATE LIMITED",
      searchCity: "Windsor",
      isHomeLife: false,
      companyKey: "",
      lead: {
        overallScore: 62,
        scoreBand: "medium",
        originRegistrationNumber: "B1",
        shared: false,
      },
    });
    await RecoBrokerage.create({
      registrationNumber: "B2",
      legalName: "Bob Pedler Real Estate Ltd.",
      searchCity: "Amherstburg",
      isHomeLife: false,
      companyKey: "",
    });

    const result = await inheritCompanyLeads();
    expect(result.keysUpdated).toBe(2);
    expect(result.inherited).toBe(1);

    const amherstburg = await RecoBrokerage.findOne({ registrationNumber: "B2" });
    expect(amherstburg?.companyKey).toBe("bob pedler real estate ltd");
    expect(amherstburg?.lead?.overallScore).toBe(62);
    expect(amherstburg?.lead?.shared).toBe(true);
    expect(amherstburg?.lead?.originRegistrationNumber).toBe("B1");
  });
});
