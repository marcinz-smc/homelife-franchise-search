import { describe, expect, it } from "vitest";
import {
  overallScoreBand,
  parseLeadReport,
  serializeLead,
  unwrapLeadReports,
} from "../src/services/import/leadParser";

const buckingham = {
  import_version: "homelife_lead_v2",
  registration_number: "1562918",
  legal_name: "BUCKINGHAM REALTY (WINDSOR) LTD",
  search_city: "Windsor",
  account_id: "1562918",
  overall_score: 63,
  priority_band: "C",
  is_provisional: true,
  overall_evidence_coverage_pct: 72,
  service_need_rating: 38,
  business_foundation_rating: 90,
  conversion_potential_rating: 85,
  primary_contact: {
    name: "Cameron Paine",
    evidenced_role: "Broker of Record / Owner",
    business_phone: "519-948-8171",
    business_email: "cpaine@buckinghamrealty.ca",
    profile_url: "https://www.linkedin.com/in/cameron-paine-19150736",
  },
  strongest_reasons: ["Poor mobile website performance (21/100) indicates a clear gap in technology support."],
  service_talking_points: [
    {
      name: "technology",
      need_rating: 41.67,
      type: "observation",
      evidence_summary: "Mobile performance score is 21/100.",
      matching_service: "website improvement",
      discovery_question: "What specific website technologies are currently in use?",
    },
  ],
  discovery_questions: ["What is the exact size of the active sales team?"],
  public_metrics: {
    advertised_roster_count: null,
    stated_listing_results: 4775,
    aggregate_review_rating: 4.9,
    review_count: 62,
    google_observation_status: "active",
    website_mobile_performance: 21,
  },
  website: { website: "https://www.buckinghamrealty.ca/" },
  linkedin: {
    company: { linkedin_url: "https://www.linkedin.com/company/buckingham-realty-windsor-ltd-" },
    person: { linkedin_url: "https://www.linkedin.com/in/cameron-paine-19150736" },
  },
};

describe("lead parser", () => {
  it("keeps only the compact core and bands the overall score", () => {
    const parsed = parseLeadReport(buckingham);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.value.registrationNumber).toBe("1562918");
    expect(parsed.value.legalName).toBe("BUCKINGHAM REALTY (WINDSOR) LTD");
    expect(parsed.value.lead.overallScore).toBe(63);
    expect(parsed.value.lead.scoreBand).toBe("medium");
    expect(parsed.value.lead.serviceNeed).toBe(38);
    expect(parsed.value.lead.foundation).toBe(90);
    expect(parsed.value.lead.conversion).toBe(85);
    expect(parsed.value.lead.contact.name).toBe("Cameron Paine");
    expect(parsed.value.lead.websiteUrl).toBe("https://www.buckinghamrealty.ca/");
    expect(parsed.value.lead.talkingPoints[0]?.name).toBe("technology");
    expect(parsed.value.lead.reasons).toHaveLength(1);
    expect(JSON.stringify(parsed.value.lead).length).toBeLessThan(4000);
  });

  it("bands Atlas-style research_first scores as low and A/B as good", () => {
    expect(overallScoreBand(52.5)).toBe("low");
    expect(overallScoreBand(62)).toBe("medium");
    expect(overallScoreBand(80)).toBe("good");
  });

  it("unwraps a single report, an array, or a reports wrapper", () => {
    expect(unwrapLeadReports(buckingham)).toHaveLength(1);
    expect(unwrapLeadReports([buckingham, buckingham])).toHaveLength(2);
    expect(unwrapLeadReports({ reports: [buckingham] })).toHaveLength(1);
  });

  it("rejects reports without a registration number or score", () => {
    expect(parseLeadReport({ overall_score: 70 }).ok).toBe(false);
    expect(parseLeadReport({ registration_number: "1" }).ok).toBe(false);
  });

  it("round-trips through serializeLead", () => {
    const parsed = parseLeadReport(buckingham);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    const serialized = serializeLead(parsed.value.lead);
    expect(serialized?.contact.email).toBe("cpaine@buckinghamrealty.ca");
    expect(serialized?.listings).toBe(4775);
  });
});
