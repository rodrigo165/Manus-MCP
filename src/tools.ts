import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import {
  confirmAction,
  hasCredentials,
  listMessages,
  missingCredentialsMessage,
  sendMessage,
  type TaskMessage,
} from "./manusClient.js";

const MCP_NAME = process.env.MCP_NAME || "manus-mcp";

function textResult(payload: unknown) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(payload, null, 2) }],
  };
}

function errorResult(message: string) {
  return textResult({ error: message });
}

export function createServer(): Server {
  const server = new Server(
    { name: MCP_NAME, version: "1.0.0" },
    { capabilities: { tools: {} } }
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [
      {
        name: "send_task",
        description:
          "Send a message to the configured Manus agent. Returns immediately without waiting for completion — poll with get_task_status.",
        inputSchema: {
          type: "object",
          properties: {
            prompt: {
              type: "string",
              description: "The instruction or message to send to the agent.",
            },
          },
          required: ["prompt"],
        },
      },
      {
        name: "get_task_status",
        description:
          "Check whether the agent is running, stopped, waiting for input, or errored. Call this after send_task, and again on later turns until it reports 'stopped' or 'error'.",
        inputSchema: {
          type: "object",
          properties: {
            limit: {
              type: "number",
              description: "How many recent events to scan for a status update (default 5).",
            },
          },
        },
      },
      {
        name: "get_task_result",
        description:
          "Fetch the agent's latest reply. Call this after get_task_status reports 'stopped'.",
        inputSchema: {
          type: "object",
          properties: {
            limit: {
              type: "number",
              description: "How many recent events to scan for a reply (default 5).",
            },
          },
        },
      },
      {
        name: "confirm_task_action",
        description:
          "Respond to the agent when get_task_status reports 'waiting' for anything other than a plain question (use send_task for plain questions). Pass the event_id from status_detail and an input object matching its confirm_input_schema.",
        inputSchema: {
          type: "object",
          properties: {
            event_id: {
              type: "string",
              description: "status_detail.waiting_for_event_id from get_task_status.",
            },
            input: {
              type: "object",
              description: "Confirmation payload, shaped per status_detail.confirm_input_schema.",
            },
          },
          required: ["event_id", "input"],
        },
      },
    ],
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    if (!hasCredentials()) {
      return errorResult(missingCredentialsMessage());
    }

    try {
      switch (name) {
        case "send_task": {
          const { prompt } = args as { prompt: string };
          const result = await sendMessage(prompt);
          return textResult(result);
        }

        case "get_task_status": {
          const { limit } = args as { limit?: number };
          const { messages } = await listMessages({ limit, order: "desc" });
          const latestStatus = messages.find(
            (m: TaskMessage) => m.type === "status_update"
          );
          if (!latestStatus?.status_update) {
            return textResult({ agent_status: "unknown", note: "No status_update event found yet." });
          }
          return textResult(latestStatus.status_update);
        }

        case "get_task_result": {
          const { limit } = args as { limit?: number };
          const { messages } = await listMessages({ limit, order: "desc" });
          const latestReply = messages.find(
            (m: TaskMessage) => m.type === "assistant_message"
          );
          if (!latestReply?.assistant_message) {
            return textResult({ note: "No assistant reply found yet." });
          }
          return textResult(latestReply.assistant_message);
        }

        case "confirm_task_action": {
          const { event_id, input } = args as {
            event_id: string;
            input: Record<string, unknown>;
          };
          const result = await confirmAction(event_id, input);
          return textResult(result);
        }

        default:
          return errorResult(`Unknown tool: ${name}`);
      }
    } catch (error) {
      console.error(`[${MCP_NAME}] Error:`, error);
      return errorResult(error instanceof Error ? error.message : String(error));
    }
  });

  return server;
}
