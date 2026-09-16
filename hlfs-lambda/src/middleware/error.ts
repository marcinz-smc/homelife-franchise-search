import type { NextFunction, Request, Response } from "express";
import { HttpError } from "../utils/httpError";

export function errorHandler(
  error: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
) {
  if (error instanceof HttpError) {
    return res.status(error.status).json({
      error: error.message,
      details: error.details,
    });
  }

  const message = error instanceof Error ? error.message : "Internal server error";
  const status = message.includes("Office JSON") || message.includes("must be") ? 400 : 500;
  return res.status(status).json({
    error: status === 500 ? "Internal server error" : message,
  });
}
