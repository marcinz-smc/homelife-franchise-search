import { RecoBrokerage } from "hlfs-mongo";
import { companyKey } from "../../utils/companyKey";
import { serializeLead, type LeadProfile } from "./leadParser";
import {
  findCompanyDesks,
  isOwnScan,
  pickCompanyLead,
  stampLead,
  type RecoLean,
} from "../reco/companyDesks";

export async function backfillCompanyKeys(): Promise<number> {
  const missing = await RecoBrokerage.find({
    $or: [{ companyKey: { $exists: false } }, { companyKey: "" }, { companyKey: null }],
  })
    .select("legalName")
    .lean<{ _id: unknown; legalName: string }[]>();

  const operations = missing.flatMap((desk) => {
    const key = companyKey(desk.legalName);
    if (!key) return [];
    return [
      {
        updateOne: {
          filter: { _id: desk._id },
          update: { $set: { companyKey: key } },
        },
      },
    ];
  });

  await writeUpdates(operations);
  return operations.length;
}

export async function inheritCompanyLeads(
  options: { registrationNumbers?: string[] } = {},
): Promise<{ keysUpdated: number; inherited: number }> {
  const keysUpdated = await backfillCompanyKeys();
  const seeds = options.registrationNumbers?.length
    ? unique(options.registrationNumbers).map((registrationNumber) => ({ registrationNumber }))
    : await donorSeeds();

  const operations: DeskUpdate[] = [];
  const written = new Set<string>();
  let inherited = 0;

  for (const seed of seeds) {
    const family = await findCompanyDesks(seed);
    const picked = pickCompanyLead(family);
    if (!picked) continue;

    for (const desk of family) {
      if (options.registrationNumbers && !options.registrationNumbers.includes(desk.registrationNumber)) {
        continue;
      }
      if (serializeLead(desk.lead) || written.has(desk.registrationNumber)) continue;
      if (isOwnScan(deskWithLead(desk))) continue;

      operations.push({
        updateOne: {
          filter: { registrationNumber: desk.registrationNumber },
          update: {
            $set: {
              lead: stampLead(picked.lead, picked.originRegistrationNumber, true),
              companyKey: desk.companyKey || companyKey(desk.legalName),
            },
          },
        },
      });
      written.add(desk.registrationNumber);
      inherited += 1;
    }
  }

  await writeUpdates(operations);
  return { keysUpdated, inherited };
}

async function donorSeeds() {
  const donors = await RecoBrokerage.find({ "lead.overallScore": { $exists: true } })
    .select("registrationNumber legalName companyKey")
    .lean<RecoLean[]>();

  const seeds: { registrationNumber: string; legalName?: string; companyKey?: string }[] = [];
  const seen = new Set<string>();
  for (const donor of donors) {
    const key = donor.companyKey || companyKey(donor.legalName) || donor.registrationNumber;
    if (seen.has(key)) continue;
    seen.add(key);
    seeds.push({
      registrationNumber: donor.registrationNumber,
      legalName: donor.legalName,
      companyKey: donor.companyKey || companyKey(donor.legalName),
    });
  }
  return seeds;
}

type DeskUpdate = {
  updateOne: {
    filter: Record<string, unknown>;
    update: { $set: Record<string, unknown> };
  };
};

async function writeUpdates(operations: DeskUpdate[]) {
  for (let index = 0; index < operations.length; index += 200) {
    const chunk = operations.slice(index, index + 200);
    if (!chunk.length) continue;
    await RecoBrokerage.bulkWrite(chunk as never, { ordered: false });
  }
}

function unique(values: string[]) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

export async function applyLeadProfiles(
  items: { registrationNumber: string; legalName?: string; lead: LeadProfile }[],
): Promise<{
  updated: number;
  unmatched: number;
  shared: number;
  issues: { row: number; message: string }[];
}> {
  await backfillCompanyKeys();
  const issues: { row: number; message: string }[] = [];
  const operations: DeskUpdate[] = [];
  const written = new Set<string>();
  let unmatched = 0;
  let shared = 0;

  for (const item of items) {
    const family = await findCompanyDesks({
      registrationNumber: item.registrationNumber,
      legalName: item.legalName,
      companyKey: companyKey(item.legalName),
    });
    if (!family.length) {
      unmatched += 1;
      issues.push({
        row: 0,
        message: `No RECO desk for registration ${item.registrationNumber}`,
      });
      continue;
    }

    const originExists = family.some((desk) => desk.registrationNumber === item.registrationNumber);
    const originRegistrationNumber = originExists
      ? item.registrationNumber
      : item.lead.originRegistrationNumber || item.registrationNumber;

    if (!originExists && item.legalName) {
      issues.push({
        row: 0,
        message: `Registration ${item.registrationNumber} is not a RECO desk; shared onto ${family.length} matching ${item.legalName} location(s)`,
      });
    }

    for (const desk of family) {
      const isOrigin = desk.registrationNumber === originRegistrationNumber;
      if (!isOrigin && isOwnScan(deskWithLead(desk))) continue;
      if (written.has(desk.registrationNumber) && !isOrigin) continue;

      operations.push({
        updateOne: {
          filter: { registrationNumber: desk.registrationNumber },
          update: {
            $set: {
              lead: stampLead(item.lead, originRegistrationNumber, !isOrigin),
              companyKey: desk.companyKey || companyKey(desk.legalName),
            },
          },
        },
      });
      written.add(desk.registrationNumber);
      if (!isOrigin) shared += 1;
    }
  }

  await writeUpdates(operations);
  return { updated: operations.length, unmatched, shared, issues };
}

function deskWithLead(desk: RecoLean) {
  const lead = desk.lead as
    | { originRegistrationNumber?: string; shared?: boolean; overallScore?: number }
    | undefined;
  return { registrationNumber: desk.registrationNumber, lead };
}
