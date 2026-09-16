import { Types } from "mongoose";
import { env } from "../../config/env";
import { ImportJob } from "hlfs-mongo";
import { Municipality } from "hlfs-mongo";
import { RecoBrokerage } from "hlfs-mongo";
import { type GeocodeClient } from "./geocode";
import { geocodeRecoAddresses } from "./geocodeReco";
import { pickCityPoint } from "./cityPoint";
import { jitterFromId, parseRecoCsv } from "./recoParser";
import { inheritCompanyLeads } from "./shareCompanyLeads";

type ImportRecoOptions = {
  geocodeAddresses?: boolean;
  geocodeClient?: GeocodeClient;
};

export async function importRecoBrokerages(
  csvText: string,
  filename: string,
  userId?: string,
  options: ImportRecoOptions = {},
) {
  const job = await ImportJob.create({
    type: "reco",
    filename,
    status: "running",
    userId: userId ?? null,
  });

  try {
    const parsed = parseRecoCsv(csvText);
    const municipalities = await Municipality.find().lean();
    const catalog = municipalities
      .filter((item) => item.location?.coordinates?.length === 2)
      .map((item) => ({
        id: String(item._id),
        normalizedName: item.normalizedName,
        coordinates: item.location?.coordinates as [number, number] | undefined,
      }));

    let inserted = 0;
    let geocoded = 0;
    let geocodeFailed = 0;

    const registrationNumbers = parsed.brokerages.map((item) => item.registrationNumber);
    const existing = registrationNumbers.length
      ? await RecoBrokerage.find(
          { registrationNumber: { $in: registrationNumbers } },
          { registrationNumber: 1 },
        ).lean()
      : [];
    const known = new Set(existing.map((item) => item.registrationNumber));
    const fresh = parsed.brokerages.filter((item) => !known.has(item.registrationNumber));
    const skipped = parsed.brokerages.length - fresh.length;

    const docs = fresh.map((brokerage) => {
      const cityMatch = pickCityPoint(brokerage.searchCity, catalog);
      const jitter = jitterFromId(brokerage.registrationNumber);
      const cityPoint = cityMatch?.coordinates
        ? ([cityMatch.coordinates[0] + jitter[0], cityMatch.coordinates[1] + jitter[1]] as [
            number,
            number,
          ])
        : undefined;

      return {
        ...brokerage,
        municipalityId: cityMatch ? new Types.ObjectId(cityMatch.id) : null,
        location: cityPoint ? { type: "Point" as const, coordinates: cityPoint } : undefined,
        geocodeStatus: cityPoint ? ("city" as const) : ("pending" as const),
        geocodeQuery: brokerage.address,
        geocodePlaceName: cityMatch ? brokerage.searchCity : "",
      };
    });

    const insertedIds: string[] = [];
    for (let index = 0; index < docs.length; index += 500) {
      const chunk = docs.slice(index, index + 500);
      const created = await RecoBrokerage.insertMany(chunk, { ordered: false });
      inserted += created.length;
      insertedIds.push(...created.map((item) => String(item._id)));
    }

    if (fresh.length) {
      await inheritCompanyLeads({
        registrationNumbers: fresh.map((item) => item.registrationNumber),
      });
    }

    const shouldGeocode =
      options.geocodeAddresses === true &&
      insertedIds.length > 0 &&
      (options.geocodeClient || (env.NODE_ENV !== "test" && env.MAPBOX_TOKEN));

    if (shouldGeocode) {
      const result = await geocodeRecoAddresses(options.geocodeClient, { ids: insertedIds });
      geocoded = result.geocoded;
      geocodeFailed = result.geocodeFailed;
    }

    job.status = "completed";
    job.finishedAt = new Date();
    job.summary = {
      inserted,
      updated: 0,
      skipped,
      invalid: parsed.invalid.length,
      unmatched: 0,
      geocoded,
      geocodeFailed,
    };
    job.set("issues", parsed.invalid.slice(0, 100));
    await job.save();
    return job;
  } catch (error) {
    job.status = "failed";
    job.finishedAt = new Date();
    job.set("issues", [
      { row: 0, message: error instanceof Error ? error.message : "Import failed" },
    ]);
    await job.save();
    throw error;
  }
}
