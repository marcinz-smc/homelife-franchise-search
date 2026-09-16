import fs from "node:fs/promises";
import { env } from "../config/env";
import { connectDb, disconnectDb } from "hlfs-mongo";
import { importMunicipalities } from "../services/import/importMunicipalities";
import { importOffices } from "../services/import/importOffices";
import { importRecoBrokerages } from "../services/import/importReco";

async function main() {
  const citiesPath = env.CITIES_CSV_PATH;
  const officesPath = env.OFFICES_JSON_PATH;
  const recoPath = env.RECO_CSV_PATH;
  if (!citiesPath && !officesPath && !recoPath) {
    throw new Error("Set CITIES_CSV_PATH, OFFICES_JSON_PATH, and/or RECO_CSV_PATH in .env");
  }

  await connectDb(env.MONGODB_URI);

  if (citiesPath) {
    const csv = await fs.readFile(citiesPath, "utf8");
    const job = await importMunicipalities(csv, citiesPath);
    console.log("Municipalities import", job.summary);
  }

  if (officesPath) {
    const raw = JSON.parse(await fs.readFile(officesPath, "utf8"));
    const job = await importOffices(raw, officesPath);
    console.log("Offices import", job.summary);
  }

  if (recoPath) {
    const csv = await fs.readFile(recoPath, "utf8");
    const job = await importRecoBrokerages(csv, recoPath);
    console.log("RECO import", job.summary);
  }

  await disconnectDb();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
