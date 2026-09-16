import type { FilterQuery } from "mongoose";
import { Office } from "hlfs-mongo";
import { Municipality } from "hlfs-mongo";
import { normalizeName, normalizeProvince } from "../utils/normalize";

export function parseBbox(value: unknown): number[] | null {
  if (typeof value !== "string" || !value.trim()) return null;
  const parts = value.split(",").map(Number);
  if (parts.length !== 4 || parts.some((part) => !Number.isFinite(part))) return null;
  return parts;
}

export function officeFilter(query: Record<string, unknown>): FilterQuery<typeof Office> {
  const filter: FilterQuery<typeof Office> = {};
  const and: FilterQuery<typeof Office>[] = [];

  if (typeof query.province === "string" && query.province) {
    filter.province = normalizeProvince(query.province);
  }
  if (typeof query.city === "string" && query.city) {
    filter.normalizedCity = normalizeName(query.city);
  }
  if (typeof query.group === "string" && query.group) {
    filter.brokerageGroup = query.group;
  }
  if (typeof query.q === "string" && query.q.trim()) {
    const term = query.q.trim();
    and.push({
      $or: [
        { name: new RegExp(escapeRegex(term), "i") },
        { address: new RegExp(escapeRegex(term), "i") },
        { brokerageGroup: new RegExp(escapeRegex(term), "i") },
        { city: new RegExp(escapeRegex(term), "i") },
        { mlsId: new RegExp(escapeRegex(term), "i") },
      ],
    });
  }

  const bbox = parseBbox(query.bbox);
  if (bbox) {
    const [west, south, east, north] = bbox;
    filter.location = {
      $geoWithin: {
        $box: [
          [west, south],
          [east, north],
        ],
      },
    };
  }

  if (typeof query.region === "string" && query.region) {
    and.push({ municipalityId: { $in: [] } });
    filter.__region = query.region;
  }

  if (and.length) filter.$and = and;
  return filter;
}

export function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export async function applyRegionFilter(
  filter: FilterQuery<typeof Office>,
): Promise<FilterQuery<typeof Office>> {
  const region = (filter as { __region?: string }).__region;
  if (!region) return filter;
  delete (filter as { __region?: string }).__region;

  const municipalities = await Municipality.find({
    $or: [
      { geographicArea: region },
      { normalizedRegion: normalizeName(region) },
    ],
  }).select("_id");

  const ids = municipalities.map((item) => item._id);
  const and = (filter.$and ?? []).filter((clause) => !("municipalityId" in clause));
  and.push({ municipalityId: { $in: ids } });
  filter.$and = and;
  return filter;
}

export function serializeOffice(office: Record<string, unknown>) {
  const location = office.location as { coordinates?: number[] } | undefined;
  const [lng, lat] = location?.coordinates ?? [null, null];
  return {
    id: String(office._id),
    externalId: office.externalId,
    slug: office.slug,
    name: office.name,
    brokerageGroup: office.brokerageGroup,
    groupKey: office.groupKey,
    broker: office.broker,
    street: office.street,
    city: office.city,
    province: office.province,
    postal: office.postal,
    address: office.address,
    phone: office.phone,
    fax: office.fax,
    email: office.email,
    language: office.language,
    website: office.website,
    socials: office.socials,
    specialization: office.specialization,
    mlsId: office.mlsId,
    tollFree: office.tollFree,
    primaryContactName: office.primaryContactName,
    aboutParagraphs: office.aboutParagraphs,
    listedOnCorporateWebsite: office.listedOnCorporateWebsite,
    country: office.country,
    photo: office.photo,
    isPlaceholderLogo: office.isPlaceholderLogo,
    lat,
    lng,
    matchStatus: office.matchStatus,
    matchNote: office.matchNote,
    municipalityId: office.municipalityId ? String(office.municipalityId) : null,
  };
}
