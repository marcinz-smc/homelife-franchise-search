import { env } from "../config/env";
import { connectDb, disconnectDb } from "hlfs-mongo";
import { retryFailedGeocodes } from "../services/import/importMunicipalities";

async function main() {
  await connectDb(env.MONGODB_URI);
  const result = await retryFailedGeocodes();
  console.log(result);
  await disconnectDb();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
