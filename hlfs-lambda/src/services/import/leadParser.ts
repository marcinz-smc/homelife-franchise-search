export type ScoreBand = "low" | "medium" | "good";

export type LeadContact = {
  name: string;
  role: string;
  phone: string;
  email: string;
  profileUrl: string;
};

export type LeadTalkingPoint = {
  name: string;
  needRating: number | null;
  type: string;
  summary: string;
  service: string;
  question: string;
};

export type LeadProfile = {
  scoredAt: string;
  overallScore: number;
  scoreBand: ScoreBand;
  priorityBand: string;
  isProvisional: boolean;
  coveragePct: number | null;
  serviceNeed: number | null;
  foundation: number | null;
  conversion: number | null;
  contact: LeadContact;
  reasons: string[];
  talkingPoints: LeadTalkingPoint[];
  questions: string[];
  websiteUrl: string;
  companyLinkedinUrl: string;
  personLinkedinUrl: string;
  reviewRating: number | null;
  reviewCount: number | null;
  listings: number | null;
  roster: number | null;
  googleAds: string;
  mobilePerformance: number | null;
  originRegistrationNumber: string;
  shared: boolean;
};

export type ParsedLead = {
  registrationNumber: string;
  legalName: string;
  lead: LeadProfile;
};

export function overallScoreBand(score: number): ScoreBand {
  if (score >= 75) return "good";
  if (score >= 60) return "medium";
  return "low";
}

export function unwrapLeadReports(raw: unknown): unknown[] {
  if (Array.isArray(raw)) return raw;
  const record = asRecord(raw);
  if (!record) return [];
  if (Array.isArray(record.reports)) return record.reports;
  if (
    record.import_version ||
    record.schema_version ||
    record.registration_number ||
    record.overall_score != null
  ) {
    return [raw];
  }
  return [];
}

export function parseLeadReport(
  raw: unknown,
): { ok: true; value: ParsedLead } | { ok: false; error: string } {
  const record = asRecord(raw);
  if (!record) return { ok: false, error: "Lead file is not a JSON object" };

  const brokerage = asRecord(record.brokerage);
  const registrationNumber =
    asString(record.registration_number) ||
    asString(brokerage?.registration_number) ||
    asString(record.account_id);
  if (!registrationNumber) {
    return { ok: false, error: "Missing registration_number" };
  }

  const overallScore = asNumber(record.overall_score);
  if (overallScore == null) {
    return { ok: false, error: `No overall_score for ${registrationNumber}` };
  }

  const contact = asRecord(record.primary_contact);
  const metrics = asRecord(record.public_metrics);
  const website = asRecord(record.website);
  const websiteSummary = asRecord(website?.summary);
  const linkedin = asRecord(record.linkedin);
  const linkedinCompany = asRecord(linkedin?.company);
  const linkedinPerson = asRecord(linkedin?.person);
  const linkedinMatch = asRecord(linkedin?.match);
  const matchCompany = asRecord(linkedinMatch?.company);
  const matchBroker = asRecord(linkedinMatch?.broker);
  const personUrl =
    asString(contact?.profile_url) ||
    asString(linkedinPerson?.linkedin_url) ||
    asString(matchBroker?.linkedin_url);

  return {
    ok: true,
    value: {
      registrationNumber,
      legalName:
        asString(record.legal_name) ||
        asString(brokerage?.legal_name) ||
        asString(brokerage?.name),
      lead: {
        scoredAt: asString(record.scored_at) || asString(record.assessment_date),
        overallScore,
        scoreBand: overallScoreBand(overallScore),
        priorityBand: asString(record.priority_band),
        isProvisional: Boolean(record.is_provisional),
        coveragePct: asNumber(record.overall_evidence_coverage_pct),
        serviceNeed: asNumber(record.service_need_rating),
        foundation: asNumber(record.business_foundation_rating),
        conversion: asNumber(record.conversion_potential_rating),
        contact: {
          name: asString(contact?.name),
          role: asString(contact?.evidenced_role),
          phone: asString(contact?.business_phone),
          email: asString(contact?.business_email),
          profileUrl: personUrl,
        },
        reasons: asStringList(record.strongest_reasons, 5),
        talkingPoints: parseTalkingPoints(record.service_talking_points),
        questions: asStringList(record.discovery_questions, 8),
        websiteUrl:
          asString(website?.website) ||
          asString(websiteSummary?.website) ||
          asString(linkedinCompany?.website),
        companyLinkedinUrl:
          asString(linkedinCompany?.linkedin_url) || asString(matchCompany?.linkedin_url),
        personLinkedinUrl: personUrl,
        reviewRating: asNumber(metrics?.aggregate_review_rating),
        reviewCount: asNumber(metrics?.review_count),
        listings: asNumber(metrics?.stated_listing_results),
        roster: asNumber(metrics?.advertised_roster_count),
        googleAds: asString(metrics?.google_observation_status),
        mobilePerformance: asNumber(metrics?.website_mobile_performance),
        originRegistrationNumber: registrationNumber,
        shared: false,
      },
    },
  };
}

function parseTalkingPoints(value: unknown): LeadTalkingPoint[] {
  if (!Array.isArray(value)) return [];
  const points: LeadTalkingPoint[] = [];
  for (const item of value) {
    const record = asRecord(item);
    if (!record) continue;
    const name = asString(record.name);
    const summary = asString(record.evidence_summary);
    const question = asString(record.discovery_question);
    if (!name && !summary && !question) continue;
    points.push({
      name: name || "Need",
      needRating: asNumber(record.need_rating),
      type: asString(record.type),
      summary,
      service: asString(record.matching_service),
      question,
    });
    if (points.length >= 6) break;
  }
  return points;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function asString(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return "";
}

function asNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function asStringList(value: unknown, cap: number): string[] {
  if (!Array.isArray(value)) return [];
  return value.map(asString).filter(Boolean).slice(0, cap);
}

export function serializeLead(lead: unknown): LeadProfile | null {
  const record = asRecord(lead);
  if (!record) return null;
  const overallScore = asNumber(record.overallScore);
  if (overallScore == null) return null;
  const contact = asRecord(record.contact);
  return {
    scoredAt: asString(record.scoredAt),
    overallScore,
    scoreBand: overallScoreBand(overallScore),
    priorityBand: asString(record.priorityBand),
    isProvisional: Boolean(record.isProvisional),
    coveragePct: asNumber(record.coveragePct),
    serviceNeed: asNumber(record.serviceNeed),
    foundation: asNumber(record.foundation),
    conversion: asNumber(record.conversion),
    contact: {
      name: asString(contact?.name),
      role: asString(contact?.role),
      phone: asString(contact?.phone),
      email: asString(contact?.email),
      profileUrl: asString(contact?.profileUrl),
    },
    reasons: asStringList(record.reasons, 5),
    talkingPoints: Array.isArray(record.talkingPoints)
      ? record.talkingPoints.flatMap((item) => {
          const point = asRecord(item);
          if (!point) return [];
          return [
            {
              name: asString(point.name),
              needRating: asNumber(point.needRating),
              type: asString(point.type),
              summary: asString(point.summary),
              service: asString(point.service),
              question: asString(point.question),
            },
          ];
        })
      : [],
    questions: asStringList(record.questions, 8),
    websiteUrl: asString(record.websiteUrl),
    companyLinkedinUrl: asString(record.companyLinkedinUrl),
    personLinkedinUrl: asString(record.personLinkedinUrl),
    reviewRating: asNumber(record.reviewRating),
    reviewCount: asNumber(record.reviewCount),
    listings: asNumber(record.listings),
    roster: asNumber(record.roster),
    googleAds: asString(record.googleAds),
    mobilePerformance: asNumber(record.mobilePerformance),
    originRegistrationNumber: asString(record.originRegistrationNumber),
    shared: Boolean(record.shared),
  };
}
