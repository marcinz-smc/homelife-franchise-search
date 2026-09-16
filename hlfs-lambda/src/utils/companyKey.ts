import { normalizeName } from "./normalize";

export function companyKey(legalName: string | null | undefined): string {
  let value = normalizeName(legalName);
  if (!value) return "";
  value = value.replace(/\bbrokerage\b/g, " ");
  value = value.replace(/\blimited\b/g, "ltd");
  value = value.replace(/\bincorporated\b/g, "inc");
  value = value.replace(/\bcorporation\b/g, "corp");
  return value.replace(/\s+/g, " ").trim();
}
