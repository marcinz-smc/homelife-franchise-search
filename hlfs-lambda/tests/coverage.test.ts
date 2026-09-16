import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { ImportJob } from "hlfs-mongo";
import { Municipality } from "hlfs-mongo";
import { Office } from "hlfs-mongo";
import { User } from "hlfs-mongo";
import { importMunicipalities } from "../src/services/import/importMunicipalities";
import { importOffices } from "../src/services/import/importOffices";
import {
  cityCsv,
  createAdmin,
  sampleOffices,
  startMemoryMongo,
  stopMemoryMongo,
} from "./helpers";

let mongo: Awaited<ReturnType<typeof startMemoryMongo>>;

const fakeGeocode = async () => ({
  features: [
    {
      relevance: 0.9,
      place_name: "Ontario, Canada",
      center: [-79.4, 43.7] as [number, number],
      context: [{ short_code: "CA-ON" }],
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
  ]);
  await createAdmin();
  await importMunicipalities(cityCsv, "cities.csv", undefined, {
    geocodeClient: fakeGeocode,
  });
  await importOffices(sampleOffices(), "offices.json");
});

describe("coverage aggregation", () => {
  it("marks matched cities covered and leaves empty cities open", async () => {
    const toronto = await Municipality.findOne({ normalizedName: "toronto" });
    const ajax = await Municipality.findOne({ normalizedName: "ajax" });
    const york = await Municipality.findOne({ normalizedName: "york", municipalStatus: "Upper Tier" });

    expect(toronto?.covered).toBe(true);
    expect(toronto?.officeCount).toBe(1);
    expect(ajax?.covered).toBe(false);
    expect(york?.officeCount).toBe(1);
  });
});
