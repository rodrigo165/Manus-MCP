#!/usr/bin/env node

import express, { type Request, type Response } from "express";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import dotenv from "dotenv";
import { createServer } from "./tools.js";
import { requireBridgeAuth } from "./auth.js";

dotenv.config();

const MCP_NAME = process.env.MCP_NAME || "manus-mcp";
const PORT = Number(process.env.PORT) || 3000;

const app = express();
app.use(express.json());

app.get("/healthz", (_req: Request, res: Response) => {
  res.status(200).json({ status: "ok" });
});

app.post("/mcp", requireBridgeAuth, async (req: Request, res: Response) => {
  const server = createServer();
  const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });

  res.on("close", () => {
    transport.close();
    server.close();
  });

  try {
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  } catch (error) {
    console.error(`[${MCP_NAME}] Request error:`, error);
    if (!res.headersSent) {
      res.status(500).json({
        jsonrpc: "2.0",
        error: { code: -32603, message: "Internal error" },
        id: null,
      });
    }
  }
});

function methodNotAllowed(_req: Request, res: Response): void {
  res.status(405).json({
    jsonrpc: "2.0",
    error: { code: -32000, message: "Method not allowed." },
    id: null,
  });
}

app.get("/mcp", requireBridgeAuth, methodNotAllowed);
app.delete("/mcp", requireBridgeAuth, methodNotAllowed);

app.listen(PORT, "0.0.0.0", () => {
  console.error(`[${MCP_NAME}] listening on 0.0.0.0:${PORT}`);
});
