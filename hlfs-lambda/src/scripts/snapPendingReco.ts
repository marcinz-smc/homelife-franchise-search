import { connectDb, disconnectDb } from "hlfs-mongo";
import { env } from "../config/env";
import { geocodeRecoAddresses } from "../services/import/geocodeReco";
import { snapPendingRecoDesks } from "../services/import/snapPendingReco";

async function main() {
  await connectDb(env.MONGODB_URI);
  const snap = await snapPendingRecoDesks();
  console.log("Pending snap", { pending: snap.pending, snapped: snap.snapped, leftover: snap.leftover });

  if (snap.ids.length && env.MAPBOX_TOKEN) {
    const geocoded = await geocodeRecoAddresses(undefined, { ids: snap.ids });
    console.log("Pending street geocode", geocoded);
  } else if (!env.MAPBOX_TOKEN) {
    console.log("MAPBOX_TOKEN missing; left newly snapped desks on city centroids");
  }

  await disconnectDb();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
