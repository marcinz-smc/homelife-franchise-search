import { createApp } from "./app";
import { env } from "./config/env";
import { connectDb } from "hlfs-mongo";
import { seedAdmin } from "./services/seedAdmin";

async function main() {
  await connectDb(env.MONGODB_URI);
  await seedAdmin();
  const app = createApp();
  app.listen(env.PORT, () => {
    console.log(`Coverage atlas API listening on http://127.0.0.1:${env.PORT}`);
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
