import { Router } from "express";
import { Municipality } from "hlfs-mongo";
import { Office } from "hlfs-mongo";
import { RecoBrokerage } from "hlfs-mongo";
import { applyRegionFilter, officeFilter } from "./query";

const router = Router();

router.get("/", async (req, res, next) => {
  try {
    const filter = await applyRegionFilter(officeFilter(req.query as Record<string, unknown>));
    const [offices, municipalities, recoCities] = await Promise.all([
      Office.find(filter).lean(),
      Municipality.find().lean(),
      RecoBrokerage.distinct("searchCity"),
    ]);

    const provinces = [...new Set(["Ontario", ...offices.map((office) => office.province)])].sort();
    const cities = [
      ...new Set([
        ...offices.map((office) => office.city),
        ...recoCities.filter(Boolean),
      ]),
    ].sort((a, b) => a.localeCompare(b));
    const groups = [...new Set(offices.map((office) => office.brokerageGroup).filter(Boolean))].sort(
      (a, b) => a.localeCompare(b),
    );
    const regions = [...new Set(municipalities.map((item) => item.geographicArea))].sort((a, b) =>
      a.localeCompare(b),
    );

    res.json({ provinces, cities, groups, regions });
  } catch (error) {
    next(error);
  }
});

export default router;
