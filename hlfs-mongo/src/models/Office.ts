import { Schema, model, type InferSchemaType, type Types } from "mongoose";

const socialSchema = new Schema(
  {
    label: { type: String, default: "" },
    url: { type: String, default: "" },
  },
  { _id: false },
);

const officeSchema = new Schema(
  {
    externalId: { type: String, required: true, unique: true, index: true },
    slug: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true, index: true },
    brokerageGroup: { type: String, default: "", index: true },
    groupKey: { type: String, default: "", index: true },
    broker: { type: String, default: "" },
    street: { type: String, default: "" },
    city: { type: String, required: true, index: true },
    province: { type: String, required: true, index: true },
    postal: { type: String, default: "" },
    address: { type: String, default: "" },
    phone: { type: String, default: "" },
    fax: { type: String, default: "" },
    email: { type: String, default: "" },
    language: { type: String, default: "" },
    website: { type: String, default: "" },
    socials: { type: [socialSchema], default: [] },
    specialization: { type: String, default: "" },
    mlsId: { type: String, default: "" },
    tollFree: { type: String, default: "" },
    primaryContactName: { type: String, default: "" },
    aboutParagraphs: { type: [String], default: [] },
    listedOnCorporateWebsite: { type: Boolean, default: false },
    country: { type: String, default: "Canada" },
    photo: { type: String, default: null },
    isPlaceholderLogo: { type: Boolean, default: false },
    location: {
      type: { type: String, enum: ["Point"], default: "Point" },
      coordinates: { type: [Number], required: true },
    },
    normalizedCity: { type: String, required: true, index: true },
    normalizedProvince: { type: String, required: true, index: true },
    municipalityId: { type: Schema.Types.ObjectId, ref: "Municipality", default: null, index: true },
    matchStatus: {
      type: String,
      enum: ["matched", "unmatched", "non_ontario"],
      default: "unmatched",
      index: true,
    },
    matchNote: { type: String, default: "" },
  },
  { timestamps: true },
);

officeSchema.index({ location: "2dsphere" });

export type OfficeDoc = InferSchemaType<typeof officeSchema> & { _id: Types.ObjectId };

export const Office = model("Office", officeSchema);
