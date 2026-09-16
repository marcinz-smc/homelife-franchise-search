import { Schema, model, type InferSchemaType, type Types } from "mongoose";

const importJobSchema = new Schema(
  {
    type: { type: String, enum: ["offices", "municipalities", "reco", "leads"], required: true },
    filename: { type: String, required: true },
    status: {
      type: String,
      enum: ["running", "completed", "failed"],
      default: "running",
    },
    summary: {
      inserted: { type: Number, default: 0 },
      updated: { type: Number, default: 0 },
      skipped: { type: Number, default: 0 },
      invalid: { type: Number, default: 0 },
      unmatched: { type: Number, default: 0 },
      geocoded: { type: Number, default: 0 },
      geocodeFailed: { type: Number, default: 0 },
    },
    issues: {
      type: [
        {
          row: { type: Number, default: 0 },
          message: { type: String, default: "" },
        },
      ],
      default: [],
    },
    startedAt: { type: Date, default: Date.now },
    finishedAt: { type: Date, default: null },
    userId: { type: Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true },
);

export type ImportJobDoc = InferSchemaType<typeof importJobSchema> & {
  _id: Types.ObjectId;
};

export const ImportJob = model("ImportJob", importJobSchema);
