import { Types } from "mongoose";
import { ImportJob } from "hlfs-mongo";
import { Office } from "hlfs-mongo";
import { Municipality } from "hlfs-mongo";
import { parseOfficesJson } from "./officeParser";
import { matchOntarioCity } from "./matchMunicipality";
import { recalculateCoverage } from "./coverage";

export async function importOffices(raw: unknown, filename: string, userId?: string) {
  const job = await ImportJob.create({
    type: "offices",
    filename,
    status: "running",
    userId: userId ?? null,
  });

  try {
    const parsed = parseOfficesJson(raw);
    const municipalities = await Municipality.find().lean();
    const catalog = municipalities.map((item) => ({
      id: String(item._id),
      name: item.name,
      municipalStatus: item.municipalStatus,
      geographicArea: item.geographicArea,
      normalizedName: item.normalizedName,
    }));

    let inserted = 0;
    let updated = 0;
    let unmatched = 0;

    for (const office of parsed.offices) {
      const match =
        office.matchStatus === "non_ontario"
          ? {
              municipalityId: null,
              matchStatus: "non_ontario" as const,
              matchNote: "Outside Ontario",
            }
          : matchOntarioCity(office.city, catalog);

      if (match.matchStatus === "unmatched") unmatched += 1;

      const existing = await Office.findOne({ externalId: office.externalId });
      const payload = {
        ...office,
        municipalityId: match.municipalityId ? new Types.ObjectId(match.municipalityId) : null,
        matchStatus: match.matchStatus,
        matchNote: match.matchNote,
      };

      if (existing) {
        existing.set(payload);
        await existing.save();
        updated += 1;
      } else {
        await Office.create(payload);
        inserted += 1;
      }
    }

    await recalculateCoverage();

    job.status = "completed";
    job.finishedAt = new Date();
    job.summary = {
      inserted,
      updated,
      skipped: 0,
      invalid: parsed.invalid.length,
      unmatched,
      geocoded: 0,
      geocodeFailed: 0,
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
