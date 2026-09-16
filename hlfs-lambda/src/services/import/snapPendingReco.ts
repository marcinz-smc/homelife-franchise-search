import { Types } from "mongoose";
import { Municipality } from "hlfs-mongo";
import { RecoBrokerage } from "hlfs-mongo";
import { pickCityPoint } from "./cityPoint";
import { jitterFromId } from "./recoParser";

export async function snapPendingRecoDesks() {
  const pending = await RecoBrokerage.find({
    geocodeStatus: "pending",
    $or: [{ location: { $exists: false } }, { "location.coordinates.0": { $exists: false } }],
  }).select("registrationNumber searchCity");

  const municipalities = await Municipality.find({
    "location.coordinates.0": { $exists: true },
  }).lean();
  const catalog = municipalities.map((item) => ({
    id: String(item._id),
    normalizedName: item.normalizedName,
    coordinates: item.location?.coordinates as [number, number] | undefined,
  }));

  const operations = [];
  const ids: string[] = pending.map((item) => String(item._id));

  for (const desk of pending) {
    const cityMatch = pickCityPoint(desk.searchCity, catalog);
    if (!cityMatch?.coordinates) continue;
    const jitter = jitterFromId(desk.registrationNumber);
    operations.push({
      updateOne: {
        filter: { _id: desk._id },
        update: {
          $set: {
            municipalityId: new Types.ObjectId(cityMatch.id),
            location: {
              type: "Point" as const,
              coordinates: [
                cityMatch.coordinates[0] + jitter[0],
                cityMatch.coordinates[1] + jitter[1],
              ],
            },
            geocodeStatus: "city" as const,
            geocodePlaceName: desk.searchCity,
          },
        },
      },
    });
  }

  for (let index = 0; index < operations.length; index += 500) {
    await RecoBrokerage.bulkWrite(operations.slice(index, index + 500), { ordered: false });
  }

  return {
    pending: pending.length,
    snapped: operations.length,
    leftover: pending.length - operations.length,
    ids,
  };
}
