import fs from "node:fs/promises";
import { env } from "../config/env";
import { connectDb, disconnectDb } from "hlfs-mongo";
import { importRecoBrokerages } from "../services/import/importReco";

async function main() {
  const recoPath =
    env.RECO_CSV_PATH ||
    "C:\\Users\\matfl\\OneDrive\\Documents\\RecoScraper\\output\\all_brokerages.csv";
  await connectDb(env.MONGODB_URI);
  const csv = await fs.readFile(recoPath, "utf8");
  const job = await importRecoBrokerages(csv, recoPath);
  console.log("RECO import", job.summary);
  await disconnectDb();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
