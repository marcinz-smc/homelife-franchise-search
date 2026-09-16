import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { env } from "../config/env";
import { User, type UserDoc } from "hlfs-mongo";
import { HttpError } from "../utils/httpError";

const COOKIE_NAME = "session";
const TOKEN_TTL = "12h";

export function cookieName(): string {
  return COOKIE_NAME;
}

export function signToken(user: UserDoc): string {
  return jwt.sign(
    { userId: String(user._id), email: user.email, role: user.role },
    env.JWT_SECRET,
    { expiresIn: TOKEN_TTL },
  );
}

export function verifyToken(token: string): {
  userId: string;
  email: string;
  role: "admin";
} {
  return jwt.verify(token, env.JWT_SECRET) as {
    userId: string;
    email: string;
    role: "admin";
  };
}

export async function authenticate(email: string, password: string): Promise<UserDoc> {
  const user = await User.findOne({ email: email.toLowerCase().trim() });
  if (!user) throw new HttpError(401, "Invalid email or password");
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) throw new HttpError(401, "Invalid email or password");
  return user;
}

export function cookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: env.COOKIE_SECURE || env.NODE_ENV === "production",
    maxAge: 12 * 60 * 60 * 1000,
    path: "/",
  };
}

export function publicUser(user: UserDoc) {
  return {
    id: String(user._id),
    email: user.email,
    role: user.role,
  };
}
