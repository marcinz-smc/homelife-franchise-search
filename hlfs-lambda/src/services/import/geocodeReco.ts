import { RecoBrokerage } from "hlfs-mongo";
import { env } from "../../config/env";
import { normalizeName } from "../../utils/normalize";
import {
  buildAddressQuery,
  delay,
  interpretAddressFeatures,
  requestMapboxGeocode,
  type GeocodeClient,
} from "./geocode";

export type RecoGeocodeSummary = {
  attempted: number;
  uniqueAddresses: number;
  geocoded: number;
  geocodeFailed: number;
};

type AddressGroup = {
  key: string;
  address: string;
  searchCity: string;
  proximity?: [number, number];
  ids: string[];
};

const CONCURRENCY = 5;

export async function geocodeRecoAddresses(
  client?: GeocodeClient,
  options?: { ids?: string[] },
): Promise<RecoGeocodeSummary> {
  const filter: Record<string, unknown> = {
    geocodeStatus: { $in: ["pending", "city", "failed"] },
    address: { $ne: "" },
  };
  if (options?.ids?.length) filter._id = { $in: options.ids };

  const pending = await RecoBrokerage.find(filter).lean();

  const groups = new Map<string, AddressGroup>();
  for (const item of pending) {
    const key = normalizeName(item.address);
    if (!key) continue;
    const existing = groups.get(key);
    const proximity =
      item.location?.coordinates?.length === 2
        ? (item.location.coordinates as [number, number])
        : undefined;
    if (existing) {
      existing.ids.push(String(item._id));
      continue;
    }
    groups.set(key, {
      key,
      address: item.address,
      searchCity: item.searchCity,
      proximity,
      ids: [String(item._id)],
    });
  }

  const queue = [...groups.values()];
  let geocoded = 0;
  let geocodeFailed = 0;
  let index = 0;

  async function worker() {
    while (index < queue.length) {
      const current = index;
      index += 1;
      const group = queue[current];
      try {
        const result = client
          ? interpretAddressFeatures(group.address, (await client(group.address)).features)
          : await geocodeStreetAddress(group);
        if (result.coordinates) {
          await RecoBrokerage.updateMany(
            { _id: { $in: group.ids } },
            {
              $set: {
                location: { type: "Point", coordinates: result.coordinates },
                geocodeStatus: "ok",
                geocodeQuery: result.query,
                geocodePlaceName: result.placeName ?? "",
              },
            },
          );
          geocoded += group.ids.length;
        } else {
          geocodeFailed += group.ids.length;
        }
      } catch {
        geocodeFailed += group.ids.length;
      }
      if ((current + 1) % 100 === 0 || current + 1 === queue.length) {
        console.log(
          `RECO address geocode ${current + 1}/${queue.length} unique (${geocoded} placed, ${geocodeFailed} leftover)`,
        );
      }
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));
  return {
    attempted: pending.length,
    uniqueAddresses: queue.length,
    geocoded,
    geocodeFailed,
  };
}

async function geocodeStreetAddress(group: AddressGroup) {
  const token = env.MAPBOX_TOKEN;
  if (!token) throw new Error("MAPBOX_TOKEN is required to geocode RECO addresses");
  const query = buildAddressQuery(group.address, group.searchCity);

  for (let attempt = 0; attempt < 4; attempt += 1) {
    try {
      const addressHits = await requestMapboxGeocode(token, query, {
        types: "address",
        proximity: group.proximity,
        autocomplete: false,
      });
      let result = interpretAddressFeatures(query, addressHits.features);
      if (!result.coordinates) {
        const fallbackHits = await requestMapboxGeocode(token, query, {
          types: "address,poi",
          proximity: group.proximity,
          autocomplete: false,
        });
        result = interpretAddressFeatures(query, fallbackHits.features);
      }
      await delay(80);
      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      if (message.includes("429") && attempt < 3) {
        await delay(1500 * (attempt + 1));
        continue;
      }
      throw error;
    }
  }

  return interpretAddressFeatures(query, []);
}
