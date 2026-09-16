import { Schema, model, type InferSchemaType, type Types } from "mongoose";

const leadContactSchema = new Schema(
  {
    name: { type: String, default: "" },
    role: { type: String, default: "" },
    phone: { type: String, default: "" },
    email: { type: String, default: "" },
    profileUrl: { type: String, default: "" },
  },
  { _id: false },
);

const leadTalkingPointSchema = new Schema(
  {
    name: { type: String, default: "" },
    needRating: { type: Number, default: null },
    type: { type: String, default: "" },
    summary: { type: String, default: "" },
    service: { type: String, default: "" },
    question: { type: String, default: "" },
  },
  { _id: false },
);

const leadSchema = new Schema(
  {
    scoredAt: { type: String, default: "" },
    overallScore: { type: Number, required: true },
    scoreBand: { type: String, enum: ["low", "medium", "good"], required: true },
    priorityBand: { type: String, default: "" },
    isProvisional: { type: Boolean, default: false },
    coveragePct: { type: Number, default: null },
    serviceNeed: { type: Number, default: null },
    foundation: { type: Number, default: null },
    conversion: { type: Number, default: null },
    contact: { type: leadContactSchema, default: () => ({}) },
    reasons: { type: [String], default: [] },
    talkingPoints: { type: [leadTalkingPointSchema], default: [] },
    questions: { type: [String], default: [] },
    websiteUrl: { type: String, default: "" },
    companyLinkedinUrl: { type: String, default: "" },
    personLinkedinUrl: { type: String, default: "" },
    reviewRating: { type: Number, default: null },
    reviewCount: { type: Number, default: null },
    listings: { type: Number, default: null },
    roster: { type: Number, default: null },
    googleAds: { type: String, default: "" },
    mobilePerformance: { type: Number, default: null },
    originRegistrationNumber: { type: String, default: "" },
    shared: { type: Boolean, default: false },
  },
  { _id: false },
);

const recoBrokerageSchema = new Schema(
  {
    registrationNumber: { type: String, required: true, unique: true, index: true },
    legalName: { type: String, required: true, index: true },
    companyKey: { type: String, default: "", index: true },
    registrationCategory: { type: String, default: "" },
    registrationStatus: { type: String, default: "", index: true },
    registrationExpiry: { type: String, default: "" },
    brokerOfRecord: { type: String, default: "" },
    address: { type: String, default: "" },
    email: { type: String, default: "" },
    phone: { type: String, default: "" },
    conditions: { type: String, default: "" },
    corporationUrl: { type: String, default: "" },
    employeeListUrl: { type: String, default: "" },
    searchCity: { type: String, default: "", index: true },
    scrapedAt: { type: String, default: "" },
    isHomeLife: { type: Boolean, default: false, index: true },
    normalizedCity: { type: String, default: "", index: true },
    municipalityId: { type: Schema.Types.ObjectId, ref: "Municipality", default: null },
    location: {
      type: { type: String, enum: ["Point"] },
      coordinates: { type: [Number] },
    },
    geocodeStatus: {
      type: String,
      enum: ["pending", "ok", "city", "failed"],
      default: "pending",
      index: true,
    },
    geocodeQuery: { type: String, default: "" },
    geocodePlaceName: { type: String, default: "" },
    lead: { type: leadSchema, default: undefined },
  },
  { timestamps: true },
);

recoBrokerageSchema.index({ location: "2dsphere" });
recoBrokerageSchema.index({ legalName: 1, searchCity: 1 });
recoBrokerageSchema.index({ companyKey: 1, searchCity: 1 });
recoBrokerageSchema.index({ "lead.scoreBand": 1 });

export type RecoBrokerageDoc = InferSchemaType<typeof recoBrokerageSchema> & {
  _id: Types.ObjectId;
};

export const RecoBrokerage = model("RecoBrokerage", recoBrokerageSchema);
