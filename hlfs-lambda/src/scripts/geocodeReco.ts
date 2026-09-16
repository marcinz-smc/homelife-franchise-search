import { env } from "../config/env";
import { connectDb, disconnectDb } from "hlfs-mongo";
import { geocodeRecoAddresses } from "../services/import/geocodeReco";

async function main() {
  await connectDb(env.MONGODB_URI);
  const result = await geocodeRecoAddresses();
  console.log("RECO address geocode", result);
  await disconnectDb();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
