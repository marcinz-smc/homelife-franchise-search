import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import path from "node:path";
import { env } from "./config/env";
import { errorHandler } from "./middleware/error";
import { requireAuth } from "./middleware/auth";
import authRoutes from "./routes/auth";
import officeRoutes from "./routes/offices";
import filterRoutes from "./routes/filters";
import coverageRoutes from "./routes/coverage";
import adminRoutes from "./routes/admin";
import ingestRoutes from "./routes/ingest";
import mapRoutes from "./routes/map";

export function createApp() {
  const app = express();

  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false,
    }),
  );
  app.use(
    cors({
      origin: env.CLIENT_ORIGIN,
      credentials: true,
    }),
  );
  app.use(cookieParser());
  app.use(express.json({ limit: "8mb" }));

  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 30,
    standardHeaders: true,
    legacyHeaders: false,
  });
  const ingestLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 2000,
    standardHeaders: true,
    legacyHeaders: false,
  });
  const importLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    limit: 30,
    standardHeaders: true,
    legacyHeaders: false,
  });

  app.get("/api/health", (_req, res) => {
    res.json({ ok: true });
  });

  app.use("/api/auth/login", authLimiter);
  app.use("/api/auth", authRoutes);
  app.use("/api/map", requireAuth, mapRoutes);
  app.use("/api/offices", requireAuth, officeRoutes);
  app.use("/api/filters", requireAuth, filterRoutes);
  app.use("/api/coverage", requireAuth, coverageRoutes);
  app.use("/api/ingest", (req, res, next) => {
    res.header("Access-Control-Allow-Origin", req.headers.origin || "*");
    res.header(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization, X-Ingest-Key, X-Lead-Filename",
    );
    res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    if (req.method === "OPTIONS") {
      res.sendStatus(204);
      return;
    }
    next();
  }, ingestLimiter, ingestRoutes);
  app.use("/api/admin", requireAuth, importLimiter, adminRoutes);

  if (env.NODE_ENV === "production") {
    const clientDir = path.resolve(__dirname, "../../hlfs-admin/dist");
    app.use(express.static(clientDir));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(clientDir, "index.html"));
    });
  }

  app.use(errorHandler);
  return app;
}
