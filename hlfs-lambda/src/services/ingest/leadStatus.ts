import { companyKey } from "../../utils/companyKey";
import { serializeLead } from "../import/leadParser";
import {
  findCompanyDesks,
  pickCompanyLead,
  type RecoLean,
} from "../reco/companyDesks";

export type IngestDeskStatus = {
  found: boolean;
  analyzed: boolean;
  skip: boolean;
  has_extended_data: boolean;
  reason: "self" | "company" | "not_found" | "not_analyzed";
  registration_number: string;
  legal_name: string;
  search_city: string;
  address: string;
  scored_at: string;
  overall_score: number | null;
  origin_registration_number: string;
  location_count: number;
  locations: {
    registration_number: string;
    search_city: string;
    address: string;
    analyzed: boolean;
    origin: boolean;
  }[];
};

export async function ingestStatusByRegistration(registrationNumber: string): Promise<IngestDeskStatus> {
  const family = await findCompanyDesks({ registrationNumber });
  const desk = family.find((item) => item.registrationNumber === registrationNumber);
  if (!desk) return emptyStatus(registrationNumber);
  return statusForDesk(desk, family);
}

export async function ingestStatusByLegalName(legalName: string): Promise<IngestDeskStatus> {
  const family = await findCompanyDesks({ legalName, companyKey: companyKey(legalName) });
  if (!family.length) return emptyStatus("", legalName);
  return statusForDesk(family[0], family);
}

function statusForDesk(desk: RecoLean, family: RecoLean[]): IngestDeskStatus {
  const ownLead = serializeLead(desk.lead);
  const company = pickCompanyLead(family);
  const analyzed = Boolean(ownLead || company);
  const reason = !analyzed
    ? "not_analyzed"
    : ownLead && !ownLead.shared
      ? "self"
      : "company";
  const origin = ownLead?.originRegistrationNumber || company?.originRegistrationNumber || "";
  const scored = ownLead || company?.lead || null;

  return {
    found: true,
    analyzed,
    skip: analyzed,
    has_extended_data: analyzed,
    reason: analyzed ? reason : "not_analyzed",
    registration_number: desk.registrationNumber,
    legal_name: desk.legalName,
    search_city: desk.searchCity ?? "",
    address: desk.address ?? "",
    scored_at: scored?.scoredAt ?? "",
    overall_score: scored?.overallScore ?? null,
    origin_registration_number: origin,
    location_count: family.length,
    locations: family.map((item) => ({
      registration_number: item.registrationNumber,
      search_city: item.searchCity ?? "",
      address: item.address ?? "",
      analyzed: Boolean(serializeLead(item.lead) || company),
      origin: Boolean(origin) && item.registrationNumber === origin,
    })),
  };
}

function emptyStatus(registrationNumber: string, legalName = ""): IngestDeskStatus {
  return {
    found: false,
    analyzed: false,
    skip: false,
    has_extended_data: false,
    reason: "not_found",
    registration_number: registrationNumber,
    legal_name: legalName,
    search_city: "",
    address: "",
    scored_at: "",
    overall_score: null,
    origin_registration_number: "",
    location_count: 0,
    locations: [],
  };
}
