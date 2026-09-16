import { env } from "../../config/env";
import { ImportJob } from "hlfs-mongo";
import { Municipality } from "hlfs-mongo";
import { parseCitiesCsv } from "./cityParser";
import {
  createMapboxGeocodeClient,
  delay,
  geocodeMunicipality,
  type GeocodeClient,
} from "./geocode";
import { recalculateCoverage, rematchOffices } from "./coverage";

type ImportMunicipalityOptions = {
  geocode?: boolean;
  geocodeClient?: GeocodeClient;
  onlyMissing?: boolean;
};

export async function importMunicipalities(
  csvText: string,
  filename: string,
  userId?: string,
  options: ImportMunicipalityOptions = {},
) {
  const job = await ImportJob.create({
    type: "municipalities",
    filename,
    status: "running",
    userId: userId ?? null,
  });

  try {
    const parsed = parseCitiesCsv(csvText);
    let inserted = 0;
    let updated = 0;

    for (const municipality of parsed.municipalities) {
      const existing = await Municipality.findOne({
        normalizedName: municipality.normalizedName,
        municipalStatus: municipality.municipalStatus,
        geographicArea: municipality.geographicArea,
      });

      if (existing) {
        existing.name = municipality.name;
        existing.normalizedRegion = municipality.normalizedRegion;
        await existing.save();
        updated += 1;
      } else {
        await Municipality.create(municipality);
        inserted += 1;
      }
    }

    await rematchOffices();
    await recalculateCoverage();

    let geocoded = 0;
    let geocodeFailed = 0;
    const shouldGeocode = options.geocode !== false && (options.geocodeClient || env.NODE_ENV !== "test");
    const client =
      options.geocodeClient ??
      (env.NODE_ENV === "test"
        ? null
        : env.MAPBOX_TOKEN
          ? createMapboxGeocodeClient(env.MAPBOX_TOKEN)
          : null);

    if (shouldGeocode && client) {
      const pending = await Municipality.find(
        options.onlyMissing === false
          ? {}
          : {
              $or: [
                { geocodeStatus: { $in: ["pending", "failed"] } },
                { "location.coordinates": { $exists: false } },
                { "location.coordinates": { $size: 0 } },
              ],
            },
      );

      for (const municipality of pending) {
        try {
          const result = await geocodeMunicipality(
            municipality.name,
            municipality.geographicArea,
            client,
          );
          municipality.geocodeStatus = result.status;
          municipality.geocodeQuery = result.query;
          municipality.geocodePlaceName = result.placeName ?? "";
          municipality.geocodeConfidence = result.confidence ?? null;
          if (result.coordinates) {
            municipality.location = {
              type: "Point",
              coordinates: result.coordinates,
            };
          }
          if (result.bbox) municipality.bbox = result.bbox;
          await municipality.save();
          if (result.status === "ok") geocoded += 1;
          else geocodeFailed += 1;
        } catch (error) {
          municipality.geocodeStatus = "failed";
          municipality.geocodeQuery = `${municipality.name}, ${municipality.geographicArea}, Ontario, Canada`;
          await municipality.save();
          geocodeFailed += 1;
          job.issues.push({
            row: 0,
            message: `${municipality.name}: ${error instanceof Error ? error.message : "geocode failed"}`,
          });
        }
        await delay(150);
      }
    }

    await rematchOffices();
    await recalculateCoverage();

    job.status = "completed";
    job.finishedAt = new Date();
    job.summary = {
      inserted,
      updated,
      skipped: 0,
      invalid: parsed.invalid.length,
      unmatched: 0,
      geocoded,
      geocodeFailed,
    };
    job.set("issues", [...job.issues, ...parsed.invalid].slice(0, 100));
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

export async function retryFailedGeocodes(geocodeClient?: GeocodeClient) {
  const client =
    geocodeClient ?? (env.MAPBOX_TOKEN ? createMapboxGeocodeClient(env.MAPBOX_TOKEN) : null);
  if (!client) {
    throw new Error("MAPBOX_TOKEN is required to geocode municipalities");
  }

  const pending = await Municipality.find({
    geocodeStatus: { $in: ["pending", "failed", "ambiguous"] },
  });

  let geocoded = 0;
  let geocodeFailed = 0;

  for (const municipality of pending) {
    const result = await geocodeMunicipality(
      municipality.name,
      municipality.geographicArea,
      client,
    );
    municipality.geocodeStatus = result.status;
    municipality.geocodeQuery = result.query;
    municipality.geocodePlaceName = result.placeName ?? "";
    municipality.geocodeConfidence = result.confidence ?? null;
    if (result.coordinates) {
      municipality.location = { type: "Point", coordinates: result.coordinates };
    }
    if (result.bbox) municipality.bbox = result.bbox;
    await municipality.save();
    if (result.status === "ok") geocoded += 1;
    else geocodeFailed += 1;
    await delay(150);
  }

  return { geocoded, geocodeFailed, attempted: pending.length };
}
