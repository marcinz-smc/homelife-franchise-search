import { z } from "zod";
import { isOntario, normalizeName, normalizeProvince } from "../../utils/normalize";

const socialSchema = z
  .object({
    label: z.string().optional().default(""),
    url: z.string().optional().default(""),
  })
  .passthrough();

const officeInputSchema = z
  .object({
    id: z.union([z.string(), z.number()]).transform(String),
    slug: z.string().min(1),
    name: z.string().min(1),
    brokerageGroup: z.string().optional().default(""),
    groupKey: z.string().optional().default(""),
    broker: z.string().optional().default(""),
    street: z.string().optional().default(""),
    city: z.string().min(1),
    province: z.string().min(1),
    postal: z.string().optional().default(""),
    address: z.string().optional().default(""),
    phone: z.string().optional().default(""),
    fax: z.string().optional().default(""),
    email: z.string().optional().default(""),
    language: z.string().optional().default(""),
    website: z.string().optional().default(""),
    socials: z.array(socialSchema).optional().default([]),
    specialization: z.string().optional().default(""),
    mlsId: z.string().optional().default(""),
    tollFree: z.string().optional().default(""),
    primaryContactName: z.string().optional().default(""),
    aboutParagraphs: z.array(z.string()).optional().default([]),
    listedOnCorporateWebsite: z.boolean().optional().default(false),
    country: z.string().optional().default("Canada"),
    photo: z.string().nullable().optional().default(null),
    isPlaceholderLogo: z.boolean().optional().default(false),
    lat: z.number(),
    lng: z.number(),
  })
  .passthrough();

export type ParsedOffice = {
  externalId: string;
  slug: string;
  name: string;
  brokerageGroup: string;
  groupKey: string;
  broker: string;
  street: string;
  city: string;
  province: string;
  postal: string;
  address: string;
  phone: string;
  fax: string;
  email: string;
  language: string;
  website: string;
  socials: { label: string; url: string }[];
  specialization: string;
  mlsId: string;
  tollFree: string;
  primaryContactName: string;
  aboutParagraphs: string[];
  listedOnCorporateWebsite: boolean;
  country: string;
  photo: string | null;
  isPlaceholderLogo: boolean;
  location: { type: "Point"; coordinates: [number, number] };
  normalizedCity: string;
  normalizedProvince: string;
  matchStatus: "unmatched" | "non_ontario";
};

export type ParseIssue = { row: number; message: string };

export type OfficeParseResult = {
  offices: ParsedOffice[];
  invalid: ParseIssue[];
};

function asArray(raw: unknown): unknown[] {
  if (Array.isArray(raw)) return raw;
  if (raw && typeof raw === "object" && Array.isArray((raw as { offices?: unknown }).offices)) {
    return (raw as { offices: unknown[] }).offices;
  }
  throw new Error("Office JSON must be an array of office records");
}

export function parseOfficesJson(raw: unknown): OfficeParseResult {
  const records = asArray(raw);
  const offices: ParsedOffice[] = [];
  const invalid: ParseIssue[] = [];
  const seenIds = new Set<string>();

  records.forEach((record, index) => {
    const parsed = officeInputSchema.safeParse(record);
    if (!parsed.success) {
      invalid.push({
        row: index + 1,
        message: parsed.error.issues.map((issue) => issue.message).join("; "),
      });
      return;
    }

    const value = parsed.data;
    if (!Number.isFinite(value.lat) || !Number.isFinite(value.lng)) {
      invalid.push({ row: index + 1, message: "Latitude and longitude must be finite numbers" });
      return;
    }
    if (seenIds.has(value.id)) {
      invalid.push({ row: index + 1, message: `Duplicate office id ${value.id}` });
      return;
    }
    seenIds.add(value.id);

    const province = normalizeProvince(value.province);
    offices.push({
      externalId: value.id,
      slug: value.slug,
      name: value.name,
      brokerageGroup: value.brokerageGroup,
      groupKey: value.groupKey,
      broker: value.broker,
      street: value.street,
      city: value.city.trim(),
      province,
      postal: value.postal,
      address: value.address,
      phone: value.phone,
      fax: value.fax,
      email: value.email,
      language: value.language,
      website: value.website,
      socials: value.socials.map((social) => ({ label: social.label, url: social.url })),
      specialization: value.specialization,
      mlsId: value.mlsId,
      tollFree: value.tollFree,
      primaryContactName: value.primaryContactName,
      aboutParagraphs: value.aboutParagraphs,
      listedOnCorporateWebsite: value.listedOnCorporateWebsite,
      country: value.country,
      photo: value.photo,
      isPlaceholderLogo: value.isPlaceholderLogo,
      location: { type: "Point", coordinates: [value.lng, value.lat] },
      normalizedCity: normalizeName(value.city),
      normalizedProvince: normalizeName(province),
      matchStatus: isOntario(province) ? "unmatched" : "non_ontario",
    });
  });

  return { offices, invalid };
}
