import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth";
import {
  authenticate,
  cookieName,
  cookieOptions,
  publicUser,
  signToken,
} from "../services/auth";
import { HttpError } from "../utils/httpError";

const router = Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

router.post("/login", async (req, res, next) => {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new HttpError(400, "Valid email and password are required");
    }
    const user = await authenticate(parsed.data.email, parsed.data.password);
    const token = signToken(user);
    res.cookie(cookieName(), token, cookieOptions());
    res.json({ user: publicUser(user) });
  } catch (error) {
    next(error);
  }
});

router.post("/logout", (req, res) => {
  res.clearCookie(cookieName(), { ...cookieOptions(), maxAge: 0 });
  res.json({ ok: true });
});

router.get("/me", requireAuth, (req, res) => {
  res.json({ user: req.user });
});

export default router;
