import type { NextFunction, Request, Response } from "express";
import { User } from "hlfs-mongo";
import { cookieName, publicUser, verifyToken } from "../services/auth";
import { HttpError } from "../utils/httpError";

export async function requireAuth(req: Request, _res: Response, next: NextFunction) {
  try {
    const token = req.cookies?.[cookieName()];
    if (!token) throw new HttpError(401, "Authentication required");
    const payload = verifyToken(token);
    const user = await User.findById(payload.userId);
    if (!user) throw new HttpError(401, "Authentication required");
    req.user = publicUser(user);
    next();
  } catch (error) {
    if (error instanceof HttpError) return next(error);
    next(new HttpError(401, "Authentication required"));
  }
}

export function requireAdmin(req: Request, _res: Response, next: NextFunction) {
  if (!req.user || req.user.role !== "admin") {
    return next(new HttpError(403, "Admin access required"));
  }
  next();
}
