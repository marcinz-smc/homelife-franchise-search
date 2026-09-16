import { connectDb, disconnectDb } from "hlfs-mongo";
import { seedAdmin } from "../services/seedAdmin";
import { env } from "../config/env";

async function main() {
  await connectDb(env.MONGODB_URI);
  await seedAdmin();
  console.log(`Admin ready: ${env.ADMIN_EMAIL}`);
  await disconnectDb();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
