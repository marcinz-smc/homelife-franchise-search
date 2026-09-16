import { timingSafeEqual } from "node:crypto";
import type { NextFunction, Request, Response } from "express";
import { env } from "../config/env";
import { HttpError } from "../utils/httpError";

export function ingestApiKey() {
  return String(process.env.INGEST_API_KEY ?? env.INGEST_API_KEY ?? "").trim();
}

export function requireIngestKey(req: Request, _res: Response, next: NextFunction) {
  const expected = ingestApiKey();
  if (!expected) {
    next(new HttpError(503, "Lead ingest is not configured. Set INGEST_API_KEY in .env."));
    return;
  }
  const provided = extractIngestKey(req);
  if (!provided || !keysMatch(provided, expected)) {
    next(new HttpError(401, "Invalid ingest key"));
    return;
  }
  next();
}

function extractIngestKey(req: Request) {
  const header = String(req.headers["x-ingest-key"] ?? "").trim();
  if (header) return header;
  const auth = String(req.headers.authorization ?? "");
  const match = /^Bearer\s+(\S+)/i.exec(auth);
  return match?.[1]?.trim() ?? "";
}

function keysMatch(provided: string, expected: string) {
  const left = Buffer.from(provided);
  const right = Buffer.from(expected);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}
