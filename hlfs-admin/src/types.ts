export type SocialLink = {
  label: string;
  url: string;
};

export type Office = {
  id: string;
  externalId: string;
  slug: string;
  name: string;
  brokerageGroup: string;
  groupKey: string;
  broker: string;
  street: string;
  city: string;
  province: string;
  postal: string;
  address: string;
  phone: string;
  fax: string;
  email: string;
  language: string;
  website: string;
  socials: SocialLink[];
  specialization: string;
  mlsId: string;
  tollFree: string;
  primaryContactName: string;
  aboutParagraphs: string[];
  listedOnCorporateWebsite: boolean;
  country: string;
  photo: string | null;
  isPlaceholderLogo: boolean;
  lat: number | null;
  lng: number | null;
  matchStatus: "matched" | "unmatched" | "non_ontario";
  matchNote: string;
  municipalityId: string | null;
};

export type FilterFacets = {
  provinces: string[];
  cities: string[];
  groups: string[];
  regions: string[];
};

export type CoverageSummary = {
  officeCount: number;
  ontarioOfficeCount: number;
  otherOfficeCount: number;
  municipalityCount: number;
  coveredCount: number;
  uncoveredCount: number;
  unmatchedOfficeCount: number;
  byProvince: { province: string; count: number }[];
  byRegion: { region: string; officeCount: number; covered: boolean }[];
};

export type Municipality = {
  id: string;
  name: string;
  municipalStatus: string;
  region: string;
  officeCount: number;
  otherCount: number;
  covered: boolean;
  geocodeStatus: "pending" | "ok" | "ambiguous" | "failed";
  geocodePlaceName: string;
  lng: number | null;
  lat: number | null;
};

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
  scoreBand: "low" | "medium" | "good";
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
  originRegistrationNumber?: string;
  shared?: boolean;
};

export type RecoLocation = {
  id: string;
  legalName: string;
  searchCity: string;
  address: string;
  registrationNumber: string;
  lat: number | null;
  lng: number | null;
  isOrigin: boolean;
};

export type RecoBrokerage = {
  id: string;
  legalName: string;
  companyKey?: string;
  registrationCategory: string;
  registrationNumber: string;
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
  lat: number | null;
  lng: number | null;
  lead?: LeadProfile | null;
  locations?: RecoLocation[];
};

export type SearchHit = {
  id: string;
  source: "office" | "reco";
  name: string;
  city: string;
  province: string;
};

export type ImportJob = {
  _id: string;
  type: "offices" | "municipalities" | "reco" | "leads";
  filename: string;
  status: "running" | "completed" | "failed";
  summary: {
    inserted: number;
    updated: number;
    skipped: number;
    invalid: number;
    unmatched: number;
    geocoded: number;
    geocodeFailed: number;
  };
  issues: { row: number; message: string }[];
  startedAt: string;
  finishedAt: string | null;
};

export type MapFilters = {
  province: string;
  region: string;
  city: string;
  group: string;
  q: string;
  brand: "all" | "homelife" | "other";
  coverage: "all" | "offices" | "covered" | "uncovered";
  view: "markers" | "heatmap" | "both";
  showCities: boolean;
  showZones: boolean;
  outsideZones: boolean;
  scoredOnly: boolean;
};

export const defaultFilters: MapFilters = {
  province: "",
  region: "",
  city: "",
  group: "",
  q: "",
  brand: "all",
  coverage: "all",
  view: "both",
  showCities: false,
  showZones: true,
  outsideZones: false,
  scoredOnly: false,
};
