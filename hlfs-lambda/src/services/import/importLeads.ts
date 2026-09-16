import { ImportJob } from "hlfs-mongo";
import { parseLeadReport, unwrapLeadReports, type ParsedLead } from "./leadParser";
import { applyLeadProfiles } from "./shareCompanyLeads";

export async function importLeads(raw: unknown, filename: string, userId?: string) {
  const job = await ImportJob.create({
    type: "leads",
    filename,
    status: "running",
    userId: userId ?? null,
  });

  try {
    const reports = unwrapLeadReports(raw);
    const issues: { row: number; message: string }[] = [];
    const parsed: ParsedLead[] = [];

    if (!reports.length) {
      issues.push({ row: 0, message: "No lead reports found in the upload" });
    }

    reports.forEach((report, index) => {
      const result = parseLeadReport(report);
      if (!result.ok) {
        issues.push({ row: index + 1, message: result.error });
        return;
      }
      parsed.push(result.value);
    });

    const unique = new Map(parsed.map((item) => [item.registrationNumber, item]));
    const applied = await applyLeadProfiles([...unique.values()]);
    issues.push(...applied.issues);

    const parseFailures = issues.filter(
      (issue) =>
        !issue.message.startsWith("No RECO desk") &&
        !issue.message.startsWith("Registration "),
    ).length;

    job.status = "completed";
    job.finishedAt = new Date();
    job.summary = {
      inserted: 0,
      updated: applied.updated,
      skipped: Math.max(0, parsed.length - unique.size),
      invalid: parseFailures,
      unmatched: applied.unmatched,
      geocoded: 0,
      geocodeFailed: 0,
    };
    job.set("issues", issues.slice(0, 100));
    await job.save();
    return job;
  } catch (error) {
    job.status = "failed";
    job.finishedAt = new Date();
    job.set("issues", [{ row: 0, message: error instanceof Error ? error.message : "Import failed" }]);
    await job.save();
    throw error;
  }
}
