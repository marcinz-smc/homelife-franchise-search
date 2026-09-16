import bcrypt from "bcryptjs";
import { env } from "../config/env";
import { User } from "hlfs-mongo";

export async function seedAdmin(): Promise<void> {
  const email = env.ADMIN_EMAIL.toLowerCase().trim();
  const existing = await User.findOne({ email });
  if (existing) return;

  const passwordHash = await bcrypt.hash(env.ADMIN_PASSWORD, 10);
  await User.create({
    email,
    passwordHash,
    role: "admin",
  });
}
