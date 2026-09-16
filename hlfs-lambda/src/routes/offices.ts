import { Router } from "express";
import { Office } from "hlfs-mongo";
import { HttpError } from "../utils/httpError";
import { applyRegionFilter, officeFilter, serializeOffice } from "./query";

const router = Router();

router.get("/", async (req, res, next) => {
  try {
    const filter = await applyRegionFilter(officeFilter(req.query as Record<string, unknown>));
    const offices = await Office.find(filter).sort({ name: 1 }).lean();
    res.json({ offices: offices.map((office) => serializeOffice(office)) });
  } catch (error) {
    next(error);
  }
});

router.get("/geojson", async (req, res, next) => {
  try {
    const filter = await applyRegionFilter(officeFilter(req.query as Record<string, unknown>));
    const offices = await Office.find(filter).lean();
    res.json({
      type: "FeatureCollection",
      features: offices.map((office) => ({
        type: "Feature",
        id: String(office._id),
        geometry: office.location,
        properties: {
          id: String(office._id),
          name: office.name,
          city: office.city,
          province: office.province,
          brokerageGroup: office.brokerageGroup,
          matchStatus: office.matchStatus,
        },
      })),
    });
  } catch (error) {
    next(error);
  }
});

router.get("/:id", async (req, res, next) => {
  try {
    const office = await Office.findById(req.params.id).lean();
    if (!office) throw new HttpError(404, "Office not found");
    res.json({ office: serializeOffice(office) });
  } catch (error) {
    next(error);
  }
});

export default router;
