import { parse } from "csv-parse/sync";
import { companyKey } from "../../utils/companyKey";
import { normalizeName } from "../../utils/normalize";

export type ParsedRecoBrokerage = {
  registrationNumber: string;
  legalName: string;
  registrationCategory: string;
  registrationStatus: string;
  registrationExpiry: string;
  brokerOfRecord: string;
  address: string;
  email: string;
  phone: string;
  conditions: string;
  corporationUrl: string;
  employeeListUrl: string;
  searchCity: string;
  scrapedAt: string;
  isHomeLife: boolean;
  normalizedCity: string;
  companyKey: string;
};

export function isHomeLifeName(name: string): boolean {
  return /homelife/i.test(name);
}

export function parseRecoCsv(csvText: string): {
  brokerages: ParsedRecoBrokerage[];
  invalid: { row: number; message: string }[];
} {
  const rows = parse(csvText, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    relax_quotes: true,
    relax_column_count: true,
    bom: true,
  }) as Record<string, string>[];

  const brokerages: ParsedRecoBrokerage[] = [];
  const invalid: { row: number; message: string }[] = [];
  const seen = new Set<string>();

  rows.forEach((row, index) => {
    const legalName = (row.legal_name ?? row.name ?? "").trim();
    const registrationNumber = (row.registration_number ?? "").trim();
    if (!legalName || !registrationNumber) {
      invalid.push({ row: index + 2, message: "Missing legal name or registration number" });
      return;
    }
    if (seen.has(registrationNumber)) {
      invalid.push({ row: index + 2, message: `Duplicate registration ${registrationNumber}` });
      return;
    }
    seen.add(registrationNumber);

    const searchCity = (row.search_city ?? "").trim();
    brokerages.push({
      registrationNumber,
      legalName,
      registrationCategory: (row.registration_category ?? "").trim(),
      registrationStatus: (row.registration_status ?? "").trim(),
      registrationExpiry: (row.registration_expiry ?? "").trim(),
      brokerOfRecord: (row.broker_of_record ?? "").trim(),
      address: (row.brokerage_address ?? "").trim(),
      email: (row.brokerage_email ?? "").trim(),
      phone: (row.brokerage_phone ?? "").trim(),
      conditions: (row.conditions_and_discipline_history ?? "").trim(),
      corporationUrl: (row.corporation_url ?? "").trim(),
      employeeListUrl: (row.employee_list_url ?? "").trim(),
      searchCity,
      scrapedAt: (row.scraped_at ?? "").trim(),
      isHomeLife: isHomeLifeName(legalName),
      normalizedCity: normalizeName(searchCity),
      companyKey: companyKey(legalName),
    });
  });

  return { brokerages, invalid };
}

export function jitterFromId(id: string): [number, number] {
  let hash = 0;
  for (const char of id) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  const angle = ((hash % 360) * Math.PI) / 180;
  const distance = 0.006 + (hash % 90) / 12000;
  return [Math.cos(angle) * distance, Math.sin(angle) * distance];
}
