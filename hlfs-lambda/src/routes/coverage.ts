import { Router } from "express";
import { Municipality } from "hlfs-mongo";
import { Office } from "hlfs-mongo";
import { RecoBrokerage } from "hlfs-mongo";
import { normalizeName } from "../utils/normalize";
import { outlinePolygon } from "../utils/outline";
import { escapeRegex } from "./query";

async function recoCountsByMunicipality() {
  const [recoRows, lower] = await Promise.all([
    RecoBrokerage.aggregate<{ _id: unknown; count: number }>([
      { $match: { isHomeLife: false, municipalityId: { $ne: null } } },
      { $group: { _id: "$municipalityId", count: { $sum: 1 } } },
    ]),
    Municipality.find({ municipalStatus: { $ne: "Upper Tier" } }, { _id: 1, normalizedRegion: 1 }).lean(),
  ]);

  const byId = new Map(recoRows.map((row) => [String(row._id), row.count]));
  const byRegion = new Map<string, number>();
  for (const city of lower) {
    const count = byId.get(String(city._id)) ?? 0;
    if (!count) continue;
    byRegion.set(city.normalizedRegion, (byRegion.get(city.normalizedRegion) ?? 0) + count);
  }
  return { byId, byRegion };
}

const router = Router();

router.get("/summary", async (_req, res, next) => {
  try {
    const [officeCount, ontarioOfficeCount, unmatchedOfficeCount, municipalities] =
      await Promise.all([
        Office.countDocuments(),
        Office.countDocuments({ province: "Ontario" }),
        Office.countDocuments({ matchStatus: "unmatched" }),
        Municipality.find().lean(),
      ]);

    const cities = municipalities.filter(
      (item) => normalizeName(item.municipalStatus) !== "upper tier",
    );
    const coveredCount = cities.filter((item) => item.covered).length;
    const byProvince = await Office.aggregate<{ _id: string; count: number }>([
      { $group: { _id: "$province", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);
    const byRegion = municipalities
      .filter((item) => normalizeName(item.municipalStatus) === "upper tier")
      .map((item) => ({
        region: item.geographicArea,
        officeCount: item.officeCount,
        covered: item.covered,
      }))
      .sort((a, b) => b.officeCount - a.officeCount);

    res.json({
      officeCount,
      ontarioOfficeCount,
      otherOfficeCount: officeCount - ontarioOfficeCount,
      municipalityCount: cities.length,
      coveredCount,
      uncoveredCount: cities.length - coveredCount,
      unmatchedOfficeCount,
      byProvince: byProvince.map((row) => ({ province: row._id, count: row.count })),
      byRegion,
    });
  } catch (error) {
    next(error);
  }
});

router.get("/municipalities", async (req, res, next) => {
  try {
    const filter: Record<string, unknown> = {};
    if (req.query.covered === "true") filter.covered = true;
    if (req.query.covered === "false") filter.covered = false;
    if (typeof req.query.region === "string" && req.query.region) {
      filter.geographicArea = req.query.region;
    }
    if (typeof req.query.status === "string" && req.query.status) {
      filter.municipalStatus = req.query.status;
    }
    if (req.query.tier === "city") {
      filter.municipalStatus = { $ne: "Upper Tier" };
    }
    if (req.query.tier === "region") {
      filter.municipalStatus = "Upper Tier";
    }
    if (typeof req.query.q === "string" && req.query.q.trim()) {
      filter.name = new RegExp(escapeRegex(req.query.q.trim()), "i");
    }
    if (typeof req.query.geocodeStatus === "string" && req.query.geocodeStatus) {
      filter.geocodeStatus = req.query.geocodeStatus;
    }

    const [items, recoCounts] = await Promise.all([
      Municipality.find(filter).sort({ name: 1 }).lean(),
      recoCountsByMunicipality(),
    ]);
    res.json({
      items: items.map((item) => {
        const isUpper = normalizeName(item.municipalStatus) === "upper tier";
        const otherCount = isUpper
          ? (recoCounts.byRegion.get(item.normalizedRegion) ?? 0)
          : (recoCounts.byId.get(String(item._id)) ?? 0);
        return {
          id: String(item._id),
          name: item.name,
          municipalStatus: item.municipalStatus,
          region: item.geographicArea,
          officeCount: item.officeCount,
          otherCount,
          covered: item.covered,
          geocodeStatus: item.geocodeStatus,
          geocodePlaceName: item.geocodePlaceName,
          lng: item.location?.coordinates?.[0] ?? null,
          lat: item.location?.coordinates?.[1] ?? null,
        };
      }),
    });
  } catch (error) {
    next(error);
  }
});

router.get("/municipalities/geojson", async (req, res, next) => {
  try {
    const filter: Record<string, unknown> = {
      "location.coordinates.0": { $exists: true },
    };
    if (req.query.covered === "true") filter.covered = true;
    if (req.query.covered === "false") filter.covered = false;
    const items = await Municipality.find(filter).lean();
    res.json({
      type: "FeatureCollection",
      features: items
        .filter((item) => item.location?.coordinates?.length === 2)
        .map((item) => {
          const [lng, lat] = item.location!.coordinates as [number, number];
          return {
            type: "Feature",
            id: String(item._id),
            geometry: outlinePolygon(lng, lat, item.municipalStatus, item.bbox),
            properties: {
              id: String(item._id),
              name: item.name,
              region: item.geographicArea,
              municipalStatus: item.municipalStatus,
              officeCount: item.officeCount,
              covered: item.covered,
              geocodeStatus: item.geocodeStatus,
              lng,
              lat,
            },
          };
        }),
    });
  } catch (error) {
    next(error);
  }
});

router.get("/unmatched", async (_req, res, next) => {
  try {
    const offices = await Office.find({ matchStatus: "unmatched" }).sort({ city: 1 }).lean();
    res.json({
      offices: offices.map((office) => ({
        id: String(office._id),
        name: office.name,
        city: office.city,
        province: office.province,
        matchNote: office.matchNote,
      })),
    });
  } catch (error) {
    next(error);
  }
});

router.get("/outside-ontario", async (_req, res, next) => {
  try {
    const rows = await Office.aggregate<{
      _id: { province: string; city: string };
      officeCount: number;
    }>([
      { $match: { matchStatus: "non_ontario" } },
      { $group: { _id: { province: "$province", city: "$city" }, officeCount: { $sum: 1 } } },
      { $sort: { "_id.province": 1, "_id.city": 1 } },
    ]);
    res.json({
      items: rows.map((row) => ({
        province: row._id.province,
        city: row._id.city,
        officeCount: row.officeCount,
      })),
    });
  } catch (error) {
    next(error);
  }
});

export default router;
