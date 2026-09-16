import { Schema, model, type InferSchemaType, type Types } from "mongoose";

const municipalitySchema = new Schema(
  {
    name: { type: String, required: true, index: true },
    municipalStatus: { type: String, required: true, index: true },
    geographicArea: { type: String, required: true, index: true },
    province: { type: String, default: "Ontario", index: true },
    normalizedName: { type: String, required: true, index: true },
    normalizedRegion: { type: String, required: true, index: true },
    location: {
      type: { type: String, enum: ["Point"] },
      coordinates: { type: [Number] },
    },
    geocodeStatus: {
      type: String,
      enum: ["pending", "ok", "ambiguous", "failed"],
      default: "pending",
      index: true,
    },
    geocodeConfidence: { type: Number, default: null },
    geocodeQuery: { type: String, default: "" },
    geocodePlaceName: { type: String, default: "" },
    bbox: { type: [Number], default: undefined },
    officeCount: { type: Number, default: 0, index: true },
    covered: { type: Boolean, default: false, index: true },
  },
  { timestamps: true },
);

municipalitySchema.index(
  { normalizedName: 1, municipalStatus: 1, geographicArea: 1 },
  { unique: true },
);
municipalitySchema.index({ location: "2dsphere" });

export type MunicipalityDoc = InferSchemaType<typeof municipalitySchema> & {
  _id: Types.ObjectId;
};

export const Municipality = model("Municipality", municipalitySchema);
