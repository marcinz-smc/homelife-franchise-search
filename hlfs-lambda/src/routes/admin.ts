import { Router, type Request } from "express";
import multer from "multer";
import { ImportJob } from "hlfs-mongo";
import { Municipality } from "hlfs-mongo";
import { requireAdmin } from "../middleware/auth";
import { importLeads } from "../services/import/importLeads";
import { unwrapLeadReports } from "../services/import/leadParser";
import { importOffices } from "../services/import/importOffices";
import { importRecoBrokerages } from "../services/import/importReco";
import {
  importMunicipalities,
  retryFailedGeocodes,
} from "../services/import/importMunicipalities";
import { HttpError } from "../utils/httpError";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 12 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const name = file.originalname.toLowerCase();
    const ok =
      name.endsWith(".json") ||
      name.endsWith(".csv") ||
      file.mimetype.includes("json") ||
      file.mimetype.includes("csv") ||
      file.mimetype === "text/plain" ||
      file.mimetype === "application/vnd.ms-excel";
    if (!ok) {
      cb(new HttpError(400, "Only JSON and CSV uploads are allowed"));
      return;
    }
    cb(null, true);
  },
});

const leadUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024, files: 80 },
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
router.use(requireAdmin);

router.post("/import/offices", upload.single("file"), async (req, res, next) => {
  try {
    if (!req.file) throw new HttpError(400, "Office JSON file is required");
    const raw = JSON.parse(req.file.buffer.toString("utf8"));
    const job = await importOffices(raw, req.file.originalname, req.user?.id);
    res.json({ job });
  } catch (error) {
    if (error instanceof SyntaxError) {
      next(new HttpError(400, "File is not valid JSON"));
      return;
    }
    next(error);
  }
});

router.post("/import/leads", (req, res, next) => {
  const contentType = String(req.headers["content-type"] || "");
  if (contentType.includes("application/json")) {
    next();
    return;
  }
  leadUpload.fields([
    { name: "files", maxCount: 80 },
    { name: "file", maxCount: 1 },
  ])(req, res, next);
}, async (req, res, next) => {
  try {
    const reports = collectLeadReports(req);
    if (!reports.length) throw new HttpError(400, "Lead JSON files are required");
    const job = await importLeads(reports, leadUploadName(req), req.user?.id);
    res.json({ job });
  } catch (error) {
    if (error instanceof SyntaxError) {
      next(new HttpError(400, "File is not valid JSON"));
      return;
    }
    next(error);
  }
});

router.post("/import/reco", upload.single("file"), async (req, res, next) => {
  try {
    if (!req.file) throw new HttpError(400, "RECO brokerage CSV file is required");
    const job = await importRecoBrokerages(req.file.buffer.toString("utf8"), req.file.originalname, req.user?.id);
    res.json({ job });
  } catch (error) {
    next(error);
  }
});

router.post("/import/municipalities", upload.single("file"), async (req, res, next) => {
  try {
    if (!req.file) throw new HttpError(400, "Municipality CSV file is required");
    const csvText = req.file.buffer.toString("utf8");
    const job = await importMunicipalities(csvText, req.file.originalname, req.user?.id);
    res.json({ job });
  } catch (error) {
    next(error);
  }
});

router.get("/import/jobs", async (_req, res, next) => {
  try {
    const jobs = await ImportJob.find().sort({ createdAt: -1 }).limit(20).lean();
    res.json({ jobs });
  } catch (error) {
    next(error);
  }
});

router.get("/import/jobs/:id", async (req, res, next) => {
  try {
    const job = await ImportJob.findById(req.params.id).lean();
    if (!job) throw new HttpError(404, "Import job not found");
    res.json({ job });
  } catch (error) {
    next(error);
  }
});

router.get("/geocode/unresolved", async (_req, res, next) => {
  try {
    const items = await Municipality.find({
      geocodeStatus: { $in: ["pending", "failed", "ambiguous"] },
    })
      .sort({ name: 1 })
      .lean();
    res.json({
      items: items.map((item) => ({
        id: String(item._id),
        name: item.name,
        region: item.geographicArea,
        geocodeStatus: item.geocodeStatus,
        geocodePlaceName: item.geocodePlaceName,
      })),
    });
  } catch (error) {
    next(error);
  }
});

router.post("/geocode/retry", async (_req, res, next) => {
  try {
    const result = await retryFailedGeocodes();
    res.json(result);
  } catch (error) {
    next(error);
  }
});

export default router;

function uploadedLeadFiles(req: Request): Express.Multer.File[] {
  const files = req.files;
  if (!files) return req.file ? [req.file] : [];
  if (Array.isArray(files)) return files;
  return [...(files.files ?? []), ...(files.file ?? [])];
}

function collectLeadReports(req: Request): unknown[] {
  const contentType = String(req.headers["content-type"] || "");
  if (contentType.includes("application/json")) {
    return unwrapLeadReports(req.body);
  }
  const reports: unknown[] = [];
  for (const file of uploadedLeadFiles(req)) {
    const raw = JSON.parse(file.buffer.toString("utf8")) as unknown;
    const extracted = unwrapLeadReports(raw);
    reports.push(...(extracted.length ? extracted : [raw]));
  }
  return reports;
}

function leadUploadName(req: Request): string {
  const files = uploadedLeadFiles(req);
  if (files.length === 1) return files[0]?.originalname || "leads.json";
  if (files.length > 1) return `${files.length} lead files`;
  return "leads.json";
}
