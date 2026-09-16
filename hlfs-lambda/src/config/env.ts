import dotenv from "dotenv";
import path from "node:path";
import { z } from "zod";

dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().default(4000),
  MONGODB_URI: z.string().min(1).default("mongodb://127.0.0.1:27017/brokerages-map"),
  JWT_SECRET: z.string().min(8).default("test-only-jwt-secret-change-me"),
  ADMIN_EMAIL: z.string().email().default("admin@homelife.local"),
  ADMIN_PASSWORD: z.string().min(8).default("change-me-now"),
  CLIENT_ORIGIN: z.string().default("http://localhost:5173"),
  MAPBOX_TOKEN: z.string().optional().default(""),
  COOKIE_SECURE: z
    .union([z.string(), z.boolean()])
    .optional()
    .transform((value) => value === true || value === "true"),
  OFFICES_JSON_PATH: z.string().optional().default(""),
  CITIES_CSV_PATH: z.string().optional().default(""),
  RECO_CSV_PATH: z.string().optional().default(""),
  INGEST_API_KEY: z.string().optional().default(""),
});

export type Env = z.infer<typeof schema>;

export const env: Env = schema.parse(process.env);
