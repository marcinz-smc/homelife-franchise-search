import { parse } from "csv-parse/sync";
import { normalizeName } from "../../utils/normalize";

export type ParsedMunicipality = {
  name: string;
  municipalStatus: string;
  geographicArea: string;
  province: "Ontario";
  normalizedName: string;
  normalizedRegion: string;
};

export type CityParseResult = {
  municipalities: ParsedMunicipality[];
  invalid: { row: number; message: string }[];
};

export function parseCitiesCsv(csvText: string): CityParseResult {
  const rows = parse(csvText, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    relax_quotes: true,
    bom: true,
  }) as Record<string, string>[];

  const municipalities: ParsedMunicipality[] = [];
  const invalid: { row: number; message: string }[] = [];
  const seen = new Set<string>();

  rows.forEach((row, index) => {
    const name = (row.Cities ?? row.City ?? row.name ?? "").trim();
    const municipalStatus = (row["Municipal status"] ?? row.status ?? "").trim();
    const geographicArea = (row["Geographic area"] ?? row.region ?? "").trim();

    if (!name || !municipalStatus || !geographicArea) {
      invalid.push({
        row: index + 2,
        message: "Missing city, municipal status, or geographic area",
      });
      return;
    }

    const key = `${normalizeName(name)}|${normalizeName(municipalStatus)}|${normalizeName(geographicArea)}`;
    if (seen.has(key)) {
      invalid.push({ row: index + 2, message: `Duplicate municipality ${name}` });
      return;
    }
    seen.add(key);

    municipalities.push({
      name,
      municipalStatus,
      geographicArea,
      province: "Ontario",
      normalizedName: normalizeName(name),
      normalizedRegion: normalizeName(geographicArea),
    });
  });

  return { municipalities, invalid };
}
