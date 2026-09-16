import { Router, type Request, type Response } from "express";
import multer from "multer";
import { requireIngestKey } from "../middleware/ingestAuth";
import { ingestStatusByLegalName, ingestStatusByRegistration } from "../services/ingest/leadStatus";
import { importLeads } from "../services/import/importLeads";
import { unwrapLeadReports } from "../services/import/leadParser";
import { HttpError } from "../utils/httpError";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024, files: 40 },
  fileFilter: (_req, file, cb) => {
    const name = file.originalname.toLowerCase();
    const ok = name.endsWith(".json") || file.mimetype.includes("json") || file.mimetype === "text/plain";
    if (!ok) {
      cb(new HttpError(400, "Only JSON lead uploads are allowed"));
      return;
    }
    cb(null, true);
  },
});

const router = Router();
router.use(requireIngestKey);

router.get("/health", (_req, res) => {
  res.json({ ok: true, ingest: "leads" });
});

router.get("/status", async (req, res, next) => {
  try {
    await sendIngestStatus(req, res);
  } catch (error) {
    next(error);
  }
});

router.post("/status", async (req, res, next) => {
  try {
    await sendIngestStatus(req, res);
  } catch (error) {
    next(error);
  }
});

router.post("/leads", (req, res, next) => {
  const contentType = String(req.headers["content-type"] || "");
  if (contentType.includes("application/json") || contentType.includes("text/json")) {
    next();
    return;
  }
  upload.fields([
    { name: "files", maxCount: 40 },
    { name: "file", maxCount: 1 },
  ])(req, res, next);
}, async (req, res, next) => {
  try {
    const reports = collectReports(req);
    if (!reports.length) throw new HttpError(400, "Lead JSON is required");
    const filename = ingestFilename(req);
    const job = await importLeads(reports, filename);
    const summary = job.summary ?? {
      inserted: 0,
      updated: 0,
      skipped: 0,
      invalid: 0,
      unmatched: 0,
      geocoded: 0,
      geocodeFailed: 0,
    };
    res.status(summary.updated > 0 || summary.unmatched > 0 ? 200 : 400).json({
      ok: summary.invalid === 0,
      applied: summary.updated,
      unmatched: summary.unmatched,
      invalid: summary.invalid,
      summary,
      issues: job.issues ?? [],
    });
  } catch (error) {
    if (error instanceof SyntaxError) {
      next(new HttpError(400, "Body is not valid JSON"));
      return;
    }
    next(error);
  }
});

export default router;

function uploadedFiles(req: Request): Express.Multer.File[] {
  const files = req.files;
  if (!files) return req.file ? [req.file] : [];
  if (Array.isArray(files)) return files;
  return [...(files.files ?? []), ...(files.file ?? [])];
}

function collectReports(req: Request): unknown[] {
  const contentType = String(req.headers["content-type"] || "");
  if (contentType.includes("json")) {
    return unwrapLeadReports(req.body);
  }
  const reports: unknown[] = [];
  for (const file of uploadedFiles(req)) {
    const raw = JSON.parse(file.buffer.toString("utf8")) as unknown;
    const extracted = unwrapLeadReports(raw);
    reports.push(...(extracted.length ? extracted : [raw]));
  }
  return reports;
}

function ingestFilename(req: Request) {
  const header = String(req.headers["x-lead-filename"] ?? "").trim();
  if (header) return header;
  const files = uploadedFiles(req);
  if (files.length === 1) return files[0]?.originalname || "ingest.json";
  if (files.length > 1) return `${files.length} lead files`;
  return "ingest.json";
}

async function sendIngestStatus(req: Request, res: Response) {
  const { registrations, legalNames } = statusTargets(req);
  if (!registrations.length && !legalNames.length) {
    throw new HttpError(400, "registration_number or legal_name is required");
  }

  const results = [];
  for (const registration of registrations) {
    results.push(await ingestStatusByRegistration(registration));
  }
  for (const legalName of legalNames) {
    results.push(await ingestStatusByLegalName(legalName));
  }

  if (results.length === 1) {
    res.json({ ok: true, ...results[0] });
    return;
  }
  res.json({ ok: true, results });
}

function statusTargets(req: Request) {
  const registrations = new Set<string>();
  const legalNames = new Set<string>();
  const addReg = (value: unknown) => {
    const text = String(value ?? "").trim();
    if (text) registrations.add(text);
  };
  const addName = (value: unknown) => {
    const text = String(value ?? "").trim();
    if (text) legalNames.add(text);
  };

  addReg(req.query.registration_number);
  addReg(req.query.registration);
  addName(req.query.legal_name);

  const body = asRecord(req.body);
  if (body) {
    addReg(body.registration_number);
    addReg(body.registration);
    addName(body.legal_name);
    for (const value of asList(body.registration_numbers)) addReg(value);
    for (const value of asList(body.registrations)) addReg(value);
    for (const value of asList(body.legal_names)) addName(value);
  }

  return { registrations: [...registrations], legalNames: [...legalNames] };
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function asList(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}
