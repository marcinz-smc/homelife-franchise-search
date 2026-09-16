import { env } from "../config/env";
import { connectDb, disconnectDb } from "hlfs-mongo";
import { inheritCompanyLeads } from "../services/import/shareCompanyLeads";

async function main() {
  await connectDb(env.MONGODB_URI);
  const result = await inheritCompanyLeads();
  console.log("Company scan inherit", result);
  await disconnectDb();
}

main().catch(async (error) => {
  console.error(error instanceof Error ? error.message : error);
  await disconnectDb();
  process.exit(1);
});
