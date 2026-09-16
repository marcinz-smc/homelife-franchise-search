import { Types } from "mongoose";
import { Municipality } from "hlfs-mongo";
import { Office } from "hlfs-mongo";
import { normalizeName } from "../../utils/normalize";

export async function rematchOffices(): Promise<void> {
  const { matchOntarioCity } = await import("./matchMunicipality.js");
  const municipalities = await Municipality.find().lean();
  const catalog = municipalities.map((item) => ({
    id: String(item._id),
    name: item.name,
    municipalStatus: item.municipalStatus,
    geographicArea: item.geographicArea,
    normalizedName: item.normalizedName,
  }));

  const offices = await Office.find({ matchStatus: { $ne: "non_ontario" } });
  await Promise.all(
    offices.map(async (office) => {
      const match = matchOntarioCity(office.city, catalog);
      office.municipalityId = match.municipalityId
        ? new Types.ObjectId(match.municipalityId)
        : null;
      office.matchStatus = match.matchStatus;
      office.matchNote = match.matchNote;
      await office.save();
    }),
  );
}

export async function recalculateCoverage(): Promise<void> {
  const municipalities = await Municipality.find();
  const counts = await Office.aggregate<{ _id: unknown; count: number }>([
    { $match: { municipalityId: { $ne: null } } },
    { $group: { _id: "$municipalityId", count: { $sum: 1 } } },
  ]);

  const byId = new Map(counts.map((row) => [String(row._id), row.count]));
  const byRegion = new Map<string, number>();

  for (const municipality of municipalities) {
    if (normalizeName(municipality.municipalStatus) === "upper tier") continue;
    const count = byId.get(String(municipality._id)) ?? 0;
    const region = municipality.normalizedRegion;
    byRegion.set(region, (byRegion.get(region) ?? 0) + count);
  }

  await Promise.all(
    municipalities.map(async (municipality) => {
      const isUpper = normalizeName(municipality.municipalStatus) === "upper tier";
      const officeCount = isUpper
        ? (byRegion.get(municipality.normalizedRegion) ?? 0)
        : (byId.get(String(municipality._id)) ?? 0);
      municipality.officeCount = officeCount;
      municipality.covered = officeCount > 0;
      await municipality.save();
    }),
  );
}
