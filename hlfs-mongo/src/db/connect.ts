import mongoose from "mongoose";

export async function connectDb(uri: string): Promise<typeof mongoose> {
  if (!uri) {
    throw new Error("MongoDB URI is required");
  }
  mongoose.set("strictQuery", true);
  return mongoose.connect(uri);
}

export async function disconnectDb(): Promise<void> {
  await mongoose.disconnect();
}
