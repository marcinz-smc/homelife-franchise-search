import { Router } from "express";
import { Municipality } from "hlfs-mongo";
import { Office } from "hlfs-mongo";
import { RecoBrokerage } from "hlfs-mongo";
import { normalizeName, normalizeProvince } from "../utils/normalize";
import { HttpError } from "../utils/httpError";
import {
  donorLeadsFor,
  findCompanyDesks,
  inheritedLead,
  serializeRecoBrokerage,
  type RecoLean,
} from "../services/reco/companyDesks";
import { applyRegionFilter, escapeRegex, officeFilter, serializeOffice } from "./query";

const router = Router();

async function recoMunicipalityIds(region?: string) {
  if (!region) return null;
  const municipalities = await Municipality.find({
    $or: [{ geographicArea: region }, { normalizedRegion: normalizeName(region) }],
  }).select("_id");
  return municipalities.map((item) => item._id);
}

router.get("/points", async (req, res, next) => {
  try {
    const brand = typeof req.query.brand === "string" ? req.query.brand : "all";
    const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
    const group = typeof req.query.group === "string" ? req.query.group : "";
    const province =
      typeof req.query.province === "string" ? normalizeProvince(req.query.province) : "";
    const features: Record<string, unknown>[] = [];

    if (brand !== "other") {
      const filter = await applyRegionFilter(officeFilter(req.query as Record<string, unknown>));
      const offices = await Office.find(filter).lean();
      features.push(
        ...offices.map((office) => ({
          type: "Feature",
          id: `office:${office._id}`,
          geometry: office.location,
          properties: {
            id: String(office._id),
            source: "office",
            brand: "homelife",
            name: office.name,
            city: office.city,
            province: office.province,
            email: office.email || "",
            phone: office.phone || "",
            broker: office.broker || office.primaryContactName || "",
          },
        })),
      );
    }

    const includeReco = brand !== "homelife" && !group && (!province || province === "Ontario");
    if (includeReco) {
      const recoFilter: Record<string, unknown> = { isHomeLife: false };
      if (typeof req.query.city === "string" && req.query.city) {
        recoFilter.normalizedCity = normalizeName(req.query.city);
      }
      if (typeof req.query.region === "string" && req.query.region) {
        const ids = await recoMunicipalityIds(req.query.region);
        recoFilter.municipalityId = { $in: ids ?? [] };
      }
      if (q) {
        recoFilter.$or = [
          { legalName: new RegExp(escapeRegex(q), "i") },
          { address: new RegExp(escapeRegex(q), "i") },
          { searchCity: new RegExp(escapeRegex(q), "i") },
          { brokerOfRecord: new RegExp(escapeRegex(q), "i") },
          { registrationNumber: new RegExp(escapeRegex(q), "i") },
        ];
      }
      const recos = await RecoBrokerage.find({
        ...recoFilter,
        "location.coordinates.0": { $exists: true },
      })
        .select(
          "legalName companyKey searchCity location email phone brokerOfRecord lead.overallScore lead.scoreBand lead.serviceNeed lead.foundation lead.conversion lead.originRegistrationNumber lead.shared lead.contact.email lead.contact.phone lead.contact.name",
        )
        .lean<RecoLean[]>();
      const donors = await donorLeadsFor(recos);
      features.push(
        ...recos.map((item) => {
          const lead = inheritedLead(item, donors);
          return {
            type: "Feature",
            id: `reco:${item._id}`,
            geometry: item.location,
            properties: {
              id: String(item._id),
              source: "reco",
              brand: "other",
              name: item.legalName,
              city: item.searchCity,
              province: "Ontario",
              email: String(lead?.contact?.email || item.email || "").trim(),
              phone: String(lead?.contact?.phone || item.phone || "").trim(),
              broker: String(item.brokerOfRecord || "").trim(),
              companyKey: item.companyKey || "",
              hasLead: lead?.overallScore != null ? 1 : 0,
              overallScore: lead?.overallScore ?? null,
              scoreBand: lead?.scoreBand ?? "",
              serviceNeed: lead?.serviceNeed ?? null,
              foundation: lead?.foundation ?? null,
              conversion: lead?.conversion ?? null,
            },
          };
        }),
      );
    }

    res.json({ type: "FeatureCollection", features });
  } catch (error) {
    next(error);
  }
});

router.get("/search", async (req, res, next) => {
  try {
    const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
    if (!q) {
      res.json({ results: [] });
      return;
    }
    const brand = typeof req.query.brand === "string" ? req.query.brand : "all";
    const results: {
      id: string;
      source: "office" | "reco";
      name: string;
      city: string;
      province: string;
    }[] = [];

    if (brand !== "other") {
      const offices = await Office.find({
        $or: [
          { name: new RegExp(escapeRegex(q), "i") },
          { address: new RegExp(escapeRegex(q), "i") },
          { city: new RegExp(escapeRegex(q), "i") },
          { brokerageGroup: new RegExp(escapeRegex(q), "i") },
        ],
      })
        .limit(8)
        .lean();
      results.push(
        ...offices.map((office) => ({
          id: String(office._id),
          source: "office" as const,
          name: office.name,
          city: office.city,
          province: office.province,
        })),
      );
    }

    if (brand !== "homelife") {
      const recos = await RecoBrokerage.find({
        isHomeLife: false,
        $or: [
          { legalName: new RegExp(escapeRegex(q), "i") },
          { address: new RegExp(escapeRegex(q), "i") },
          { searchCity: new RegExp(escapeRegex(q), "i") },
          { brokerOfRecord: new RegExp(escapeRegex(q), "i") },
          { registrationNumber: new RegExp(escapeRegex(q), "i") },
        ],
      })
        .limit(8)
        .lean();
      results.push(
        ...recos.map((item) => ({
          id: String(item._id),
          source: "reco" as const,
          name: item.legalName,
          city: item.searchCity,
          province: "Ontario",
        })),
      );
    }

    res.json({ results: results.slice(0, 12) });
  } catch (error) {
    next(error);
  }
});

router.get("/reco/:id", async (req, res, next) => {
  try {
    const item = await RecoBrokerage.findById(req.params.id).lean<RecoLean>();
    if (!item) throw new HttpError(404, "Brokerage not found");
    const family = await findCompanyDesks({
      registrationNumber: item.registrationNumber,
      legalName: item.legalName,
      companyKey: item.companyKey,
    });
    res.json({
      brokerage: serializeRecoBrokerage(item, family.length ? family : [item]),
    });
  } catch (error) {
    next(error);
  }
});

router.get("/office/:id", async (req, res, next) => {
  try {
    const office = await Office.findById(req.params.id).lean();
    if (!office) throw new HttpError(404, "Office not found");
    res.json({ office: serializeOffice(office) });
  } catch (error) {
    next(error);
  }
});

export default router;
