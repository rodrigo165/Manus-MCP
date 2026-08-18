import { timingSafeEqual } from "node:crypto";
import type { NextFunction, Request, Response } from "express";

const BRIDGE_API_KEY = process.env.BRIDGE_API_KEY || "";

// Exits on import (before the HTTP server starts listening) rather than per-request:
// this key is the only barrier against the public internet, so a missing one must
// stop startup, not degrade into per-call 401s.
if (!BRIDGE_API_KEY) {
  console.error("[manus-mcp] BRIDGE_API_KEY is not set. Refusing to start.");
  process.exit(1);
}

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) {
    // Compare against a same-length buffer so the check still takes
    // constant time relative to the (fixed) expected key length.
    timingSafeEqual(bufA, bufA);
    return false;
  }
  return timingSafeEqual(bufA, bufB);
}

function unauthorized(res: Response): void {
  res.status(401).json({
    jsonrpc: "2.0",
    error: { code: -32001, message: "Unauthorized" },
    id: null,
  });
}

export function requireBridgeAuth(req: Request, res: Response, next: NextFunction): void {
  const header = req.header("authorization") || "";
  const [scheme, token] = header.split(" ");

  if (scheme !== "Bearer" || !token || !safeEqual(token, BRIDGE_API_KEY)) {
    unauthorized(res);
    return;
  }

  next();
}
