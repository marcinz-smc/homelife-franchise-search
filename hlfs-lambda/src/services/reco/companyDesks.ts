import { RecoBrokerage, type RecoBrokerageDoc } from "hlfs-mongo";
import { serializeLead, type LeadProfile } from "../import/leadParser";
import { companyKey } from "../../utils/companyKey";

export type RecoLean = {
  _id: RecoBrokerageDoc["_id"];
  registrationNumber: string;
  legalName: string;
  companyKey?: string;
  registrationCategory?: string;
  registrationStatus?: string;
  registrationExpiry?: string;
  brokerOfRecord?: string;
  address?: string;
  email?: string;
  phone?: string;
  conditions?: string;
  corporationUrl?: string;
  employeeListUrl?: string;
  searchCity?: string;
  scrapedAt?: string;
  isHomeLife?: boolean;
  location?: { type?: string; coordinates?: number[] };
  lead?: unknown;
};

export type RecoLocation = {
  id: string;
  legalName: string;
  searchCity: string;
  address: string;
  registrationNumber: string;
  lat: number | null;
  lng: number | null;
  isOrigin: boolean;
};

export function isOwnScan(desk: {
  registrationNumber: string;
  lead?: { originRegistrationNumber?: string; shared?: boolean; overallScore?: number } | null;
}): boolean {
  const lead = desk.lead;
  if (!lead || lead.overallScore == null) return false;
  if (lead.shared) return false;
  const origin = String(lead.originRegistrationNumber ?? "").trim();
  return !origin || origin === desk.registrationNumber;
}

export function stampLead(lead: LeadProfile, originRegistrationNumber: string, shared: boolean): LeadProfile {
  return {
    ...lead,
    originRegistrationNumber,
    shared,
  };
}

export async function findCompanyDesks(seed: {
  registrationNumber?: string;
  legalName?: string;
  companyKey?: string;
}): Promise<RecoLean[]> {
  const clauses = seedClauses(seed);
  if (!clauses.length) return [];
  const first = await RecoBrokerage.find({ $or: clauses }).lean<RecoLean[]>();
  if (!first.length) return [];

  const keys = unique(
    first.map((desk) => desk.companyKey || companyKey(desk.legalName)).filter(Boolean),
  );
  const names = unique(first.map((desk) => desk.legalName).filter(Boolean));
  const family = await RecoBrokerage.find({
    $or: [
      ...(keys.length ? [{ companyKey: { $in: keys } }] : []),
      ...(names.length ? [{ legalName: { $in: names } }] : []),
    ],
  }).lean<RecoLean[]>();

  return sortDesks(dedupeDesks(family.length ? family : first));
}

export function pickCompanyLead(family: RecoLean[]): {
  lead: LeadProfile;
  originRegistrationNumber: string;
} | null {
  const donors = family
    .map((desk) => {
      const lead = serializeLead(desk.lead);
      return lead ? { desk, lead } : null;
    })
    .filter((item): item is { desk: RecoLean; lead: LeadProfile } => Boolean(item));
  if (!donors.length) return null;
  const own = donors.find((item) => isOwnScan({ ...item.desk, lead: item.lead })) ?? donors[0];
  const origin =
    own.lead.originRegistrationNumber || own.desk.registrationNumber;
  return { lead: own.lead, originRegistrationNumber: origin };
}

export function leadForDesk(desk: RecoLean, family: RecoLean[]): LeadProfile | null {
  const own = serializeLead(desk.lead);
  if (own) {
    return {
      ...own,
      originRegistrationNumber: own.originRegistrationNumber || desk.registrationNumber,
      shared: Boolean(own.shared),
    };
  }
  const picked = pickCompanyLead(family);
  if (!picked) return null;
  return stampLead(picked.lead, picked.originRegistrationNumber, true);
}

export function serializeLocations(family: RecoLean[]): RecoLocation[] {
  const origin = pickCompanyLead(family)?.originRegistrationNumber ?? "";
  return sortDesks(family).map((desk) => ({
    id: String(desk._id),
    legalName: desk.legalName,
    searchCity: desk.searchCity ?? "",
    address: desk.address ?? "",
    registrationNumber: desk.registrationNumber,
    lat: desk.location?.coordinates?.[1] ?? null,
    lng: desk.location?.coordinates?.[0] ?? null,
    isOrigin: Boolean(origin) && desk.registrationNumber === origin,
  }));
}

export async function donorLeadsFor(desks: RecoLean[]): Promise<Map<string, LeadProfile>> {
  const donors = new Map<string, LeadProfile>();
  const missing = desks.filter((desk) => !serializeLead(desk.lead));
  if (!missing.length) return donors;

  const keys = unique(missing.map((desk) => desk.companyKey || companyKey(desk.legalName)).filter(Boolean));
  const names = unique(missing.map((desk) => desk.legalName).filter(Boolean));
  const found = await RecoBrokerage.find({
    $or: [
      ...(keys.length ? [{ companyKey: { $in: keys } }] : []),
      ...(names.length ? [{ legalName: { $in: names } }] : []),
    ],
    "lead.overallScore": { $exists: true },
  })
    .select("legalName companyKey lead registrationNumber")
    .lean<RecoLean[]>();

  for (const desk of found) {
    const lead = serializeLead(desk.lead);
    if (!lead) continue;
    const stamped = stampLead(lead, lead.originRegistrationNumber || desk.registrationNumber, true);
    const key = desk.companyKey || companyKey(desk.legalName);
    if (key && !donors.has(key)) donors.set(key, stamped);
    if (desk.legalName && !donors.has(desk.legalName)) donors.set(desk.legalName, stamped);
  }
  return donors;
}

export function inheritedLead(desk: RecoLean, donors: Map<string, LeadProfile>): LeadProfile | null {
  const own = serializeLead(desk.lead);
  if (own) return own;
  return (
    donors.get(desk.companyKey || companyKey(desk.legalName)) ||
    donors.get(desk.legalName) ||
    null
  );
}

export function serializeRecoBrokerage(desk: RecoLean, family: RecoLean[] = [desk]) {
  const lead = leadForDesk(desk, family);
  return {
    id: String(desk._id),
    legalName: desk.legalName,
    companyKey: desk.companyKey || companyKey(desk.legalName),
    registrationCategory: desk.registrationCategory ?? "",
    registrationNumber: desk.registrationNumber,
    registrationStatus: desk.registrationStatus ?? "",
    registrationExpiry: desk.registrationExpiry ?? "",
    brokerOfRecord: desk.brokerOfRecord ?? "",
    address: desk.address ?? "",
    email: desk.email ?? "",
    phone: desk.phone ?? "",
    conditions: desk.conditions ?? "",
    corporationUrl: desk.corporationUrl ?? "",
    employeeListUrl: desk.employeeListUrl ?? "",
    searchCity: desk.searchCity ?? "",
    scrapedAt: desk.scrapedAt ?? "",
    isHomeLife: Boolean(desk.isHomeLife),
    lat: desk.location?.coordinates?.[1] ?? null,
    lng: desk.location?.coordinates?.[0] ?? null,
    lead,
    locations: serializeLocations(family),
  };
}

function seedClauses(seed: {
  registrationNumber?: string;
  legalName?: string;
  companyKey?: string;
}) {
  const clauses: Record<string, unknown>[] = [];
  const registrationNumber = String(seed.registrationNumber ?? "").trim();
  const legalName = String(seed.legalName ?? "").trim();
  const key = String(seed.companyKey ?? "").trim() || companyKey(legalName);
  if (registrationNumber) clauses.push({ registrationNumber });
  if (legalName) {
    clauses.push({ legalName });
    clauses.push({ legalName: new RegExp(`^${escapeRegex(legalName)}$`, "i") });
  }
  if (key) clauses.push({ companyKey: key });
  return clauses;
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function sortDesks(desks: RecoLean[]) {
  return [...desks].sort((left, right) => {
    const city = String(left.searchCity ?? "").localeCompare(String(right.searchCity ?? ""));
    if (city) return city;
    return left.registrationNumber.localeCompare(right.registrationNumber);
  });
}

function dedupeDesks(desks: RecoLean[]) {
  const seen = new Set<string>();
  return desks.filter((desk) => {
    const id = String(desk._id);
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}

function unique(values: string[]) {
  return [...new Set(values)];
}
