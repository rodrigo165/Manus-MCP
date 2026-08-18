const API_KEY = process.env.MANUS_MCP_API_KEY || "";
const API_BASE_URL = process.env.MANUS_MCP_API_BASE_URL || "https://api.manus.ai/v2";
const AGENT_TASK_ID = process.env.MANUS_AGENT_TASK_ID || "";
const MCP_NAME = process.env.MCP_NAME || "manus-mcp";

const RETRYABLE_STATUS = new Set([429, 500, 502, 503, 504]);
const MAX_ATTEMPTS = 3;
const BASE_DELAY_MS = 250;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function requestManus(
  path: string,
  method: string,
  body?: unknown
): Promise<unknown> {
  const url = `${API_BASE_URL}${path}`;
  const headers: Record<string, string> = {
    "x-manus-api-key": API_KEY,
    "Content-Type": "application/json",
  };

  let lastError: unknown;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    console.error(`[${MCP_NAME}] ${method} ${url} (attempt ${attempt}/${MAX_ATTEMPTS})`);

    try {
      const options: RequestInit = { method, headers };
      if (body !== undefined) {
        options.body = JSON.stringify(body);
      }

      const response = await fetch(url, options);

      if (response.ok) {
        return response.json();
      }

      if (!RETRYABLE_STATUS.has(response.status) || attempt === MAX_ATTEMPTS) {
        const errorText = await response.text();
        throw new Error(`Manus API error (${response.status}): ${errorText}`);
      }

      lastError = new Error(`Manus API error (${response.status}), retrying`);
    } catch (error) {
      lastError = error;
      if (attempt === MAX_ATTEMPTS) {
        throw error;
      }
    }

    const delay = BASE_DELAY_MS * 2 ** (attempt - 1) + Math.random() * 100;
    await sleep(delay);
  }

  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

export function hasCredentials(): boolean {
  return Boolean(API_KEY) && Boolean(AGENT_TASK_ID);
}

export function missingCredentialsMessage(): string {
  const missing: string[] = [];
  if (!API_KEY) missing.push("MANUS_MCP_API_KEY");
  if (!AGENT_TASK_ID) missing.push("MANUS_AGENT_TASK_ID");
  return `Missing required environment variable(s): ${missing.join(", ")}.`;
}

export interface SendMessageResult {
  ok: boolean;
  request_id: string;
  task_id: string;
}

export async function sendMessage(prompt: string): Promise<SendMessageResult> {
  return requestManus("/task.sendMessage", "POST", {
    task_id: AGENT_TASK_ID,
    message: {
      content: [{ type: "text", text: prompt }],
    },
  }) as Promise<SendMessageResult>;
}

export interface TaskMessageAttachment {
  filename: string;
  url: string;
  content_type: string;
}

export interface TaskMessage {
  id: string;
  timestamp: number;
  type: string;
  user_message?: { content: string };
  assistant_message?: { content: string; attachments?: TaskMessageAttachment[] };
  error_message?: { error_type: string; content: string };
  status_update?: {
    agent_status: "running" | "stopped" | "waiting" | "error";
    status_detail?: {
      waiting_for_event_id?: string;
      waiting_for_event_type?: string;
      waiting_description?: string;
      confirm_input_schema?: unknown;
    };
    brief?: string;
    description?: string;
  };
}

export interface ListMessagesResult {
  ok: boolean;
  request_id: string;
  task_id: string;
  messages: TaskMessage[];
  has_more: boolean;
  next_cursor?: string;
}

export async function listMessages(
  options: { limit?: number; order?: "asc" | "desc" } = {}
): Promise<ListMessagesResult> {
  const limit = options.limit ?? 5;
  const order = options.order ?? "desc";
  const params = new URLSearchParams({
    task_id: AGENT_TASK_ID,
    order,
    limit: String(limit),
  });
  return requestManus(`/task.listMessages?${params.toString()}`, "GET") as Promise<ListMessagesResult>;
}

export interface ConfirmActionResult {
  ok: boolean;
  request_id?: string;
  task_id?: string;
}

export async function confirmAction(
  eventId: string,
  input: Record<string, unknown>
): Promise<ConfirmActionResult> {
  return requestManus("/task.confirmAction", "POST", {
    task_id: AGENT_TASK_ID,
    event_id: eventId,
    input,
  }) as Promise<ConfirmActionResult>;
}
