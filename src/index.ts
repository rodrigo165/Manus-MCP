#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import dotenv from "dotenv";

dotenv.config();

// 環境変数
const API_KEY = process.env.MANUS_MCP_API_KEY || "";
const API_BASE_URL = process.env.MANUS_MCP_API_BASE_URL || "https://api.manus.ai/v1";
const MCP_NAME = process.env.MCP_NAME || "manus-mcp";

// APIクライアントヘルパー
async function callManusAPI(
  endpoint: string,
  method: string,
  body?: unknown
): Promise<unknown> {
  const url = `${API_BASE_URL}${endpoint}`;
  const headers: Record<string, string> = {
    "API_KEY": API_KEY,
    "Content-Type": "application/json",
  };

  console.error(`[${MCP_NAME}] ${method} ${url}`);

  const options: RequestInit = {
    method,
    headers,
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(url, options);

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Manus API error (${response.status}): ${errorText}`);
  }

  return response.json();
}

// サーバー初期化
const server = new Server(
  {
    name: MCP_NAME,
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// ツール一覧
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "create_task",
        description: "Create a new AI task in Manus. Returns task_id, task_title, task_url, and optionally a shareable link.",
        inputSchema: {
          type: "object",
          properties: {
            prompt: {
              type: "string",
              description: "The task prompt or instruction for the AI",
            },
            mode: {
              type: "string",
              enum: ["speed", "quality"],
              description: "Execution mode: 'speed' for faster results, 'quality' for better accuracy",
            },
            attachments: {
              type: "array",
              description: "Optional attachments (files, URLs, etc.)",
              items: {
                type: "object",
                properties: {
                  filename: { type: "string" },
                  url: { type: "string" },
                  mime_type: { type: "string" },
                  size_bytes: { type: "number" },
                },
                required: ["filename", "url", "mime_type", "size_bytes"],
              },
            },
            connectors: {
              type: "array",
              description: "List of connector IDs to enable for this task (only pre-configured connectors)",
              items: { type: "string" },
            },
            hide_in_task_list: {
              type: "boolean",
              description: "Whether to hide this task from the Manus webapp task list (default: false)",
            },
            create_shareable_link: {
              type: "boolean",
              description: "Whether to make the chat publicly accessible (default: false)",
            },
          },
          required: ["prompt", "mode"],
        },
      },
      {
        name: "create_webhook",
        description: "Register a new webhook to receive real-time notifications from Manus. Returns webhook details.",
        inputSchema: {
          type: "object",
          properties: {
            url: {
              type: "string",
              description: "The webhook URL endpoint to receive notifications",
            },
            events: {
              type: "array",
              description: "List of event types to subscribe to",
              items: { type: "string" },
            },
          },
          required: ["url"],
        },
      },
      {
        name: "delete_webhook",
        description: "Remove a previously registered webhook by its ID.",
        inputSchema: {
          type: "object",
          properties: {
            webhook_id: {
              type: "string",
              description: "The ID of the webhook to delete",
            },
          },
          required: ["webhook_id"],
        },
      },
    ],
  };
});

// ツール実行
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  if (!API_KEY) {
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            error: "MANUS_MCP_API_KEY is not set. Please configure your API key in the environment.",
          }),
        },
      ],
    };
  }

  try {
    switch (name) {
      case "create_task": {
        const {
          prompt,
          mode,
          attachments,
          connectors,
          hide_in_task_list,
          create_shareable_link,
        } = args as {
          prompt: string;
          mode: "speed" | "quality";
          attachments?: Array<{
            filename: string;
            url: string;
            mime_type: string;
            size_bytes: number;
          }>;
          connectors?: string[];
          hide_in_task_list?: boolean;
          create_shareable_link?: boolean;
        };

        const result = await callManusAPI("/tasks", "POST", {
          prompt,
          mode,
          ...(attachments && { attachments }),
          ...(connectors && { connectors }),
          ...(hide_in_task_list !== undefined && { hide_in_task_list }),
          ...(create_shareable_link !== undefined && { create_shareable_link }),
        });

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case "create_webhook": {
        const { url, events } = args as {
          url: string;
          events?: string[];
        };

        const result = await callManusAPI("/webhooks", "POST", {
          url,
          ...(events && { events }),
        });

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case "delete_webhook": {
        const { webhook_id } = args as { webhook_id: string };

        const result = await callManusAPI(
          `/webhooks/${webhook_id}`,
          "DELETE"
        );

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result || { success: true }, null, 2),
            },
          ],
        };
      }

      default:
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({ error: `Unknown tool: ${name}` }),
            },
          ],
        };
    }
  } catch (error) {
    console.error(`[${MCP_NAME}] Error:`, error);
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            error: error instanceof Error ? error.message : String(error),
          }),
        },
      ],
    };
  }
});

// サーバー起動
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error(`[${MCP_NAME}] Server running on stdio`);
}

main().catch((error) => {
  console.error("[ERROR]", error);
  process.exit(1);
});

