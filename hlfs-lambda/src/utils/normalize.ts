export function normalizeName(value: string | null | undefined): string {
  return String(value ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[’'`]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

const PROVINCE_ALIASES: Record<string, string> = {
  on: "Ontario",
  ont: "Ontario",
  ontario: "Ontario",
  ab: "Alberta",
  alberta: "Alberta",
  bc: "British Columbia",
  "british columbia": "British Columbia",
  mb: "Manitoba",
  manitoba: "Manitoba",
  nb: "New Brunswick",
  "new brunswick": "New Brunswick",
  nl: "Newfoundland and Labrador",
  "newfoundland and labrador": "Newfoundland and Labrador",
  newfoundland: "Newfoundland and Labrador",
  ns: "Nova Scotia",
  "nova scotia": "Nova Scotia",
  nt: "Northwest Territories",
  "northwest territories": "Northwest Territories",
  nu: "Nunavut",
  nunavut: "Nunavut",
  pe: "Prince Edward Island",
  pei: "Prince Edward Island",
  "prince edward island": "Prince Edward Island",
  qc: "Quebec",
  quebec: "Quebec",
  sk: "Saskatchewan",
  saskatchewan: "Saskatchewan",
  yt: "Yukon",
  yukon: "Yukon",
};

export function normalizeProvince(value: string | null | undefined): string {
  const key = normalizeName(value);
  return PROVINCE_ALIASES[key] ?? (value ?? "").trim();
}

export function isOntario(province: string | null | undefined): boolean {
  return normalizeProvince(province) === "Ontario";
}

export const CITY_ALIASES: Record<string, string> = {
  etobicoke: "toronto",
  etobicke: "toronto",
  scarborough: "toronto",
  "north york": "toronto",
  "east york": "toronto",
  yorkville: "toronto",
  kleinburg: "vaughan",
  vaughn: "vaughan",
  thornhill: "markham",
  thronhill: "markham",
  "oak ridges": "richmond hill",
  angus: "essa",
  tottenham: "new tecumseth",
  alliston: "new tecumseth",
  waterdown: "hamilton",
  sudbury: "greater sudbury",
  marmora: "marmora and lake",
  ingersol: "ingersoll",
  "sault saint marie": "sault ste marie",
  chatham: "chatham kent",
  blenheim: "chatham kent",
  tilbury: "chatham kent",
  wallaceburg: "chatham kent",
  dresden: "chatham kent",
  ridgetown: "chatham kent",
  thamesville: "chatham kent",
  wheatley: "chatham kent",
  bowmanville: "clarington",
  courtice: "clarington",
  picton: "prince edward county",
  strathroy: "strathroy caradoc",
  "mount brydges": "strathroy caradoc",
  keswick: "georgina",
  sutton: "georgina",
  pefferlaw: "georgina",
  "port perry": "scugog",
  napanee: "greater napanee",
  fergus: "centre wellington",
  elora: "centre wellington",
  dunnville: "haldimand county",
  listowel: "north perth",
  kemptville: "north grenville",
  campbellford: "trent hills",
  alexandria: "north glengarry",
  "belle river": "lakeshore",
  walkerton: "brockton",
  stayner: "clearview",
  creemore: "clearview",
  "port dover": "norfolk county",
  "port stanley": "central elgin",
  millbrook: "cavan monaghan",
  markdale: "grey highlands",
  "grand bend": "lambton shores",
  "sauble beach": "south bruce peninsula",
  wiarton: "south bruce peninsula",
  "lions head": "south bruce peninsula",
  "lion s head": "south bruce peninsula",
  "port elgin": "saugeen shores",
  southampton: "saugeen shores",
  "mount forest": "wellington north",
  coldwater: "severn",
  "honey harbour": "georgian bay",
  apsley: "north kawartha",
  "barrys bay": "madawaska valley",
  "barry s bay": "madawaska valley",
};

export function applyCityAlias(normalizedCity: string): string {
  return CITY_ALIASES[normalizedCity] ?? normalizedCity;
}

export function municipalityKey(
  name: string,
  status: string,
  region: string,
): string {
  return `${normalizeName(name)}|${normalizeName(status)}|${normalizeName(region)}`;
}
