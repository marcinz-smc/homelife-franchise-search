import fs from "node:fs";
import { parse } from "csv-parse/sync";
import { parseRecoCsv } from "../../hlfs-lambda/src/services/import/recoParser";
import { companyKey } from "../../hlfs-lambda/src/utils/companyKey";
import { normalizeName } from "../../hlfs-lambda/src/utils/normalize";

const attachDir =
  "C:\\Users\\matfl\\.cursor\\projects\\c-Users-matfl-OneDrive-Documents-BrokeragesMap\\attachments\\95d69fd6-c39d-4478-9cb4-c6bc9dec405a";
const projectDir = "C:\\Users\\matfl\\OneDrive\\Documents\\BrokeragesMap";

const officesPath = process.env.OFFICES_JSON_PATH || `${attachDir}\\offices.json`;
const agentsPath = process.env.AGENTS_JSON_PATH || `${attachDir}\\agents.json`;
const recoPath = process.env.RECO_CSV_PATH || `${attachDir}\\all_brokerages.csv`;
const registrantsPath = process.env.RECO_REGISTRANTS_CSV_PATH || `${attachDir}\\all_registrants.csv`;
const locationsOut =
  process.argv[2] || `${projectDir}\\homelife-silvercity-locations.csv`;
const peopleOut = process.argv[3] || `${projectDir}\\homelife-silvercity-people.csv`;

type OfficeRow = {
  id: string;
  name: string;
  brokerageGroup: string;
  groupKey: string;
  street: string;
  city: string;
  postal: string;
  address: string;
  phone: string;
  email: string;
  slug: string;
};

type AgentRow = {
  slug: string;
  name: string;
  title: string;
  email: string;
  phone: string;
  officePhone: string;
  office: string;
  officeSlug: string;
  officeAddress: string;
  location: string;
  website: string;
};

type RecoDesk = ReturnType<typeof parseRecoCsv>["brokerages"][number];

type RecoPerson = {
  legalName: string;
  registrationCategory: string;
  registrationNumber: string;
  registrationStatus: string;
  registrationExpiry: string;
  address: string;
  email: string;
  phone: string;
  brokerageName: string;
  searchCity: string;
};

const TITLE_WORDS = new Set([
  "salesperson",
  "broker",
  "realtor",
  "real",
  "estate",
  "representative",
  "sales",
  "rep",
  "abr",
  "srs",
  "president",
  "manager",
  "team",
  "record",
  "of",
]);

function isSilverCityText(...parts: string[]) {
  return parts.some((part) => /silver\s*city/i.test(part));
}

function digits(value: string) {
  return value.replace(/\D+/g, "");
}

function postalKey(value: string) {
  return normalizeName(value).replace(/\s+/g, "");
}

function streetKey(value: string) {
  return normalizeName(value)
    .replace(/\b(unit|ste|suite|apt|#)\b/g, " ")
    .replace(/\b(road|rd|street|st|avenue|ave|boulevard|blvd|drive|dr|way|lane|ln|court|ct)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function numbers(value: string) {
  return (value.match(/\d+/g) ?? []).join(" ");
}

function recoPostal(address: string) {
  return postalKey(address.match(/[A-Z]\d[A-Z]\s?\d[A-Z]\d/i)?.[0] ?? "");
}

function scorePlace(
  left: { postal: string; city: string; street: string; phone: string },
  reco: { address: string; searchCity: string; phone: string },
) {
  let score = 0;
  const leftPostal = postalKey(left.postal);
  const rightPostal = recoPostal(reco.address);
  if (leftPostal && rightPostal && leftPostal === rightPostal) score += 4;
  if (normalizeName(left.city) && normalizeName(left.city) === normalizeName(reco.searchCity)) score += 2;
  const leftStreet = streetKey(left.street);
  const rightStreet = streetKey(reco.address);
  const leftNums = numbers(left.street);
  const rightNums = numbers(reco.address);
  if (leftNums && rightNums && leftNums.split(" ")[0] === rightNums.split(" ")[0]) score += 3;
  if (
    leftStreet &&
    rightStreet &&
    (leftStreet.includes(rightStreet.slice(0, 18)) || rightStreet.includes(leftStreet.slice(0, 18)))
  ) {
    score += 2;
  }
  const leftPhone = digits(left.phone);
  const rightPhone = digits(reco.phone);
  if (leftPhone.length >= 10 && leftPhone.slice(-10) === rightPhone.slice(-10)) score += 2;
  return score;
}

function locationStatus(inReco: boolean, inOffices: boolean, inAgents: boolean) {
  const present = [
    inReco ? "RECO" : "",
    inOffices ? "offices.json" : "",
    inAgents ? "agents.json" : "",
  ].filter(Boolean);
  const missing = [
    inReco ? "" : "RECO",
    inOffices ? "" : "offices.json",
    inAgents ? "" : "agents.json",
  ].filter(Boolean);
  return {
    status: present.length === 3 ? "On all three" : `On ${present.join(" + ")} only`,
    missingFrom: missing.join("; ") || "",
  };
}

function csvEscape(value: string | number | boolean | null | undefined) {
  const text = String(value ?? "");
  if (/[",\n]/.test(text)) return `"${text.replaceAll('"', '""')}"`;
  return text;
}

function writeCsv(path: string, headers: string[], rows: string[][]) {
  const csv = [headers, ...rows].map((row) => row.map(csvEscape).join(",")).join("\n");
  try {
    fs.writeFileSync(path, csv, "utf8");
    return path;
  } catch (error) {
    const code = error instanceof Error && "code" in error ? String((error as { code?: string }).code) : "";
    if (code !== "EBUSY" && code !== "EPERM") throw error;
    const fallback = path.replace(/\.csv$/i, "-deduped.csv");
    fs.writeFileSync(fallback, csv, "utf8");
    console.error(`Locked ${path}; wrote ${fallback}`);
    return fallback;
  }
}

function personTokens(name: string) {
  return normalizeName(name.replace(/\([^)]*\)/g, " "))
    .split(" ")
    .filter((token) => token.length > 1 && !TITLE_WORDS.has(token) && !/^\d+$/.test(token));
}

function displayNameKey(name: string) {
  const tokens = personTokens(name);
  if (!tokens.length) return "";
  return `${tokens[0]}|${tokens[tokens.length - 1]}`;
}

function brokeragePersonKey(personName: string, brokerageName: string) {
  return `${companyKey(brokerageName)}::${displayNameKey(personName)}`;
}

function unique(values: string[]) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function pickReco(people: RecoPerson[]) {
  return [...people].sort((left, right) => {
    const rank = (item: RecoPerson) =>
      item.registrationStatus.toUpperCase().includes("REGISTERED") ? 0 : 1;
    return rank(left) - rank(right);
  })[0];
}

function pickAgent(list: AgentRow[]) {
  const officePhone = "9059138500";
  return [...list].sort((left, right) => {
    const rank = (item: AgentRow) => (digits(item.phone).slice(-10) === officePhone ? 1 : 0);
    return rank(left) - rank(right);
  })[0];
}

function parseRegistrants(csvText: string): RecoPerson[] {
  const rows = parse(csvText, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    relax_quotes: true,
    relax_column_count: true,
    bom: true,
  }) as Record<string, string>[];
  const seen = new Set<string>();
  const people: RecoPerson[] = [];
  for (const row of rows) {
    const brokerageName = (row.brokerage_name ?? "").trim();
    const legalName = (row.legal_name ?? row.name ?? "").trim();
    const registrationNumber = (row.registration_number ?? "").trim();
    const category = (row.registration_category ?? "").trim();
    if (!legalName || !registrationNumber) continue;
    if (!isSilverCityText(brokerageName, legalName)) continue;
    if (/^brokerage/i.test(category)) continue;
    if (seen.has(registrationNumber)) continue;
    seen.add(registrationNumber);
    people.push({
      legalName,
      registrationCategory: category,
      registrationNumber,
      registrationStatus: (row.registration_status ?? "").trim(),
      registrationExpiry: (row.registration_expiry ?? "").trim(),
      address: (row.brokerage_address ?? "").trim(),
      email: (row.brokerage_email ?? "").trim(),
      phone: (row.brokerage_phone ?? "").trim(),
      brokerageName,
      searchCity: (row.search_city ?? "").trim(),
    });
  }
  return people;
}

function placeFromOffice(office: OfficeRow) {
  return {
    postal: office.postal || office.address,
    city: office.city,
    street: `${office.street} ${office.address}`,
    phone: office.phone,
  };
}

function placeFromAgentOffice(agent: AgentRow) {
  return {
    postal: agent.officeAddress,
    city: agent.location,
    street: agent.officeAddress,
    phone: agent.officePhone,
  };
}

function main() {
  const offices = (JSON.parse(fs.readFileSync(officesPath, "utf8")) as OfficeRow[]).filter((office) =>
    isSilverCityText(office.name, office.brokerageGroup, office.groupKey, office.slug),
  );
  const agents = (JSON.parse(fs.readFileSync(agentsPath, "utf8")) as AgentRow[]).filter((agent) =>
    isSilverCityText(agent.office, agent.officeSlug),
  );
  const recoDesks = parseRecoCsv(fs.readFileSync(recoPath, "utf8")).brokerages.filter((item) =>
    isSilverCityText(item.legalName),
  );
  const recoPeople = parseRegistrants(fs.readFileSync(registrantsPath, "utf8"));

  const agentsBySlug = new Map<string, AgentRow[]>();
  for (const agent of agents) {
    const list = agentsBySlug.get(agent.officeSlug) ?? [];
    list.push(agent);
    agentsBySlug.set(agent.officeSlug, list);
  }

  const officeBySlug = new Map(offices.map((office) => [office.slug, office]));
  const usedOffices = new Set<string>();
  const usedAgentSlugs = new Set<string>();
  const locationRows: string[][] = [];

  for (const desk of recoDesks) {
    const officeHits = offices
      .map((office) => ({ office, score: scorePlace(placeFromOffice(office), desk) }))
      .filter((item) => item.score >= 6)
      .sort((left, right) => right.score - left.score)
      .map((item) => item.office);
    const agentSlugHits = [...agentsBySlug.keys()].filter((slug) => {
      const sample = agentsBySlug.get(slug)?.[0];
      if (!sample) return false;
      if (scorePlace(placeFromAgentOffice(sample), desk) >= 6) return true;
      const office = officeBySlug.get(slug);
      return Boolean(office && officeHits.some((hit) => hit.slug === office.slug));
    });

    for (const office of officeHits) usedOffices.add(office.id);
    for (const slug of agentSlugHits) usedAgentSlugs.add(slug);

    const inOffices = officeHits.length > 0;
    const inAgents = agentSlugHits.length > 0;
    const { status, missingFrom } = locationStatus(true, inOffices, inAgents);
    const agentCount = agentSlugHits.reduce((sum, slug) => sum + (agentsBySlug.get(slug)?.length ?? 0), 0);
    const pairs = Math.max(officeHits.length, agentSlugHits.length, 1);

    for (let index = 0; index < pairs; index += 1) {
      const office = officeHits[index];
      const slug = agentSlugHits[index] ?? agentSlugHits[0] ?? "";
      locationRows.push([
        "location",
        status,
        missingFrom,
        "yes",
        office ? "yes" : "no",
        inAgents ? "yes" : "no",
        String(agentCount),
        desk.registrationNumber,
        desk.legalName,
        desk.registrationCategory,
        desk.registrationStatus,
        desk.brokerOfRecord,
        desk.address,
        desk.searchCity,
        desk.phone,
        desk.email,
        office?.id ?? "",
        office?.name ?? "",
        office?.slug ?? slug,
        office?.address ?? "",
        office?.city ?? "",
        office?.phone ?? "",
        office?.email ?? "",
        slug,
        String(slug ? agentsBySlug.get(slug)?.length ?? 0 : 0),
        officeHits.length > 1
          ? "Same RECO desk appears more than once in offices.json"
          : missingFrom
            ? `SilverCity location missing from ${missingFrom}`
            : "Matched by address / postal / office slug",
      ]);
    }
  }

  for (const office of offices) {
    if (usedOffices.has(office.id)) continue;
    const inAgents = agentsBySlug.has(office.slug);
    if (inAgents) usedAgentSlugs.add(office.slug);
    const { status, missingFrom } = locationStatus(false, true, inAgents);
    locationRows.push([
      "location",
      status,
      missingFrom,
      "no",
      "yes",
      inAgents ? "yes" : "no",
      String(inAgents ? agentsBySlug.get(office.slug)?.length ?? 0 : 0),
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      office.id,
      office.name,
      office.slug,
      office.address,
      office.city,
      office.phone,
      office.email,
      inAgents ? office.slug : "",
      String(inAgents ? agentsBySlug.get(office.slug)?.length ?? 0 : 0),
      `Listed on offices.json but missing from ${missingFrom}`,
    ]);
  }

  for (const [slug, list] of agentsBySlug) {
    if (usedAgentSlugs.has(slug)) continue;
    const sample = list[0];
    const { status, missingFrom } = locationStatus(false, false, true);
    locationRows.push([
      "location",
      status,
      missingFrom,
      "no",
      "no",
      "yes",
      String(list.length),
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      sample?.office ?? "",
      slug,
      sample?.officeAddress ?? "",
      sample?.location ?? "",
      sample?.officePhone ?? "",
      "",
      slug,
      String(list.length),
      `agents.json office listing missing from ${missingFrom}`,
    ]);
  }

  const locationHeaders = [
    "record_type",
    "status",
    "missing_from",
    "in_reco",
    "in_offices_json",
    "in_agents_json",
    "agents_json_count",
    "reco_registration_number",
    "reco_legal_name",
    "reco_category",
    "reco_registration_status",
    "reco_broker_of_record",
    "reco_address",
    "reco_city",
    "reco_phone",
    "reco_email",
    "offices_id",
    "offices_name",
    "offices_slug",
    "offices_address",
    "offices_city",
    "offices_phone",
    "offices_email",
    "agents_office_slug",
    "agents_at_this_office",
    "notes",
  ];
  const locationsOutPath = writeCsv(locationsOut, locationHeaders, locationRows);

  const officeUsedByAgent = new Set(offices.map((office) => office.slug));
  const recoByKey = new Map<string, RecoPerson[]>();
  for (const person of recoPeople) {
    const key = brokeragePersonKey(person.legalName, person.brokerageName);
    if (!key.endsWith("::")) {
      const list = recoByKey.get(key) ?? [];
      list.push(person);
      recoByKey.set(key, list);
    }
  }
  const agentsByKey = new Map<string, AgentRow[]>();
  for (const agent of agents) {
    const key = brokeragePersonKey(agent.name, agent.office);
    if (!key.endsWith("::")) {
      const list = agentsByKey.get(key) ?? [];
      list.push(agent);
      agentsByKey.set(key, list);
    }
  }

  const peopleRows: string[][] = [];
  const keys = unique([...recoByKey.keys(), ...agentsByKey.keys()]).sort();
  let collapsed = 0;

  for (const key of keys) {
    const recoGroup = recoByKey.get(key) ?? [];
    const agentGroup = agentsByKey.get(key) ?? [];
    const person = recoGroup.length ? pickReco(recoGroup) : undefined;
    const agent = agentGroup.length ? pickAgent(agentGroup) : undefined;
    const inReco = Boolean(person);
    const inAgents = Boolean(agent);
    const inOffices = agent
      ? officeUsedByAgent.has(agent.officeSlug)
      : Boolean(person && offices.some((office) => scorePlace(placeFromOffice(office), person) >= 6));
    const merged = recoGroup.length + agentGroup.length;
    if (merged > 2 || recoGroup.length > 1 || agentGroup.length > 1) collapsed += 1;

    const status = inReco && inAgents ? "On RECO + agents.json" : inReco ? "On RECO only" : "On agents.json only";
    const missing = [
      inReco ? "" : "RECO",
      inOffices ? "" : "offices.json",
      inAgents ? "" : "agents.json",
    ].filter(Boolean);
    const extraRegs = unique(recoGroup.map((item) => item.registrationNumber));
    const extraEmails = unique(agentGroup.map((item) => item.email));
    const extraSlugs = unique(agentGroup.map((item) => item.slug));
    const notes = [
      recoGroup.length > 1
        ? `Collapsed ${recoGroup.length} RECO listings with the same name at this brokerage`
        : "",
      agentGroup.length > 1
        ? `Collapsed ${agentGroup.length} agents.json listings with the same name at this brokerage`
        : "",
      inReco && !inAgents ? "On RECO at this brokerage but not on agents.json" : "",
      inAgents && !inReco ? "On agents.json at this brokerage but not on RECO" : "",
    ]
      .filter(Boolean)
      .join("; ");

    peopleRows.push([
      "person",
      status,
      missing.join("; "),
      inReco ? "yes" : "no",
      inAgents ? "yes" : "no",
      inOffices ? "yes" : "no",
      String(merged),
      extraRegs.join(" | "),
      person?.legalName || agent?.name || "",
      person?.registrationCategory ?? "",
      person?.registrationStatus ?? "",
      person?.registrationExpiry ?? "",
      person?.address ?? "",
      person?.searchCity ?? "",
      person?.brokerageName || agent?.office || "",
      person?.phone ?? "",
      person?.email ?? "",
      extraSlugs.join(" | "),
      agent?.name ?? "",
      agent?.title ?? "",
      extraEmails.join(" | "),
      agent?.phone ?? "",
      agent?.office ?? "",
      extraSlugs[0] ?? "",
      agent?.officeAddress ?? "",
      agent?.location ?? "",
      notes,
    ]);
  }

  peopleRows.sort((left, right) => left[1].localeCompare(right[1]) || left[8].localeCompare(right[8]));

  const peopleHeaders = [
    "record_type",
    "status",
    "missing_from",
    "in_reco",
    "in_agents_json",
    "office_in_offices_json",
    "listings_collapsed",
    "reco_registration_number",
    "reco_legal_name",
    "reco_category",
    "reco_registration_status",
    "reco_registration_expiry",
    "reco_address",
    "reco_city",
    "reco_brokerage",
    "reco_phone",
    "reco_email",
    "agents_slug",
    "agents_name",
    "agents_title",
    "agents_email",
    "agents_phone",
    "agents_office",
    "agents_office_slug",
    "agents_office_address",
    "agents_location",
    "notes",
  ];
  const peopleOutPath = writeCsv(peopleOut, peopleHeaders, peopleRows);

  const locationStatusCounts = Object.fromEntries(
    [...new Set(locationRows.map((row) => row[1]))].map((label) => [
      label,
      locationRows.filter((row) => row[1] === label).length,
    ]),
  );
  const peopleStatusCounts = Object.fromEntries(
    [...new Set(peopleRows.map((row) => row[1]))].map((label) => [
      label,
      peopleRows.filter((row) => row[1] === label).length,
    ]),
  );

  console.log(
    JSON.stringify(
      {
        recoLocations: recoDesks.length,
        officesJsonLocations: offices.length,
        agentsJsonOffices: agentsBySlug.size,
        agentsJsonPeople: agents.length,
        recoPeople: recoPeople.length,
        locationStatusCounts,
        peopleStatusCounts,
        uniquePeople: peopleRows.length,
        namesCollapsed: collapsed,
        locationsOut: locationsOutPath,
        peopleOut: peopleOutPath,
      },
      null,
      2,
    ),
  );
}

main();
