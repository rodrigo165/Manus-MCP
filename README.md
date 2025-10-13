# Manus MCP

The Universal MCP Server for Manus AI enables you to create AI tasks, manage webhooks, and integrate Manus workflows into any MCP-compatible client. Designed for prompt-first usage with full support for attachments, connectors, and real-time notifications.

## Installation

### Prerequisites
- Node.js 18+
- Set `MANUS_MCP_API_KEY` in your environment

### Get an API key
- Request your API key from the [Manus Dashboard](https://manus.ai)
- API documentation: https://open.manus.ai/docs
- Getting started guide: https://open.manus.ai/docs/quickstart

### Build locally
```bash
cd /path/to/manus-mcp
npm i
npm run build
```

## Setup: Claude Code (CLI)

Use this one-liner (replace with your real API key):

```bash
claude mcp add manus-mcp -s user -e MANUS_MCP_API_KEY="your-api-key-here" -- npx manus-mcp
```

**Note**: Use `manus-mcp` (not `"Manus MCP"`) as the name. Claude CLI requires names without spaces.

To remove:

```bash
claude mcp remove manus-mcp
```

## Setup: Cursor

Create `.cursor/mcp.json` in your client (do not commit it here):

```json
{
  "mcpServers": {
    "manus-mcp": {
      "command": "npx",
      "args": ["manus-mcp"],
      "env": { "MANUS_MCP_API_KEY": "your-api-key-here" },
      "autoStart": true
    }
  }
}
```

**Note**: This repository does not include `.cursor/mcp.json`. Configure Cursor via the UI or manually create the file in your client workspace.

## Other Clients and Agents

<details>
<summary>VS Code</summary>

Install via URI or CLI:

```bash
code --add-mcp '{"name":"manus-mcp","command":"npx","args":["manus-mcp"],"env":{"MANUS_MCP_API_KEY":"your-api-key-here"}}'
```

Or add to your VS Code settings JSON:

```json
{
  "mcp.servers": {
    "manus-mcp": {
      "command": "npx",
      "args": ["manus-mcp"],
      "env": { "MANUS_MCP_API_KEY": "your-api-key-here" }
    }
  }
}
```

</details>

<details>
<summary>VS Code Insiders</summary>

Same as VS Code, but use `code-insiders` command:

```bash
code-insiders --add-mcp '{"name":"manus-mcp","command":"npx","args":["manus-mcp"],"env":{"MANUS_MCP_API_KEY":"your-api-key-here"}}'
```

</details>

<details>
<summary>Claude Desktop</summary>

Add to your Claude Desktop configuration file:

- macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
- Windows: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "manus-mcp": {
      "command": "npx",
      "args": ["manus-mcp"],
      "env": { "MANUS_MCP_API_KEY": "your-api-key-here" }
    }
  }
}
```

</details>

<details>
<summary>LM Studio</summary>

In LM Studio's MCP settings:

- **Command**: `npx`
- **Args**: `["manus-mcp"]`
- **Env**: `MANUS_MCP_API_KEY=your-api-key-here`

</details>

<details>
<summary>Goose</summary>

Add to your Goose configuration:

- **Type**: STDIO
- **Command**: `npx`
- **Args**: `manus-mcp`
- **Enabled**: true
- **Env**: `MANUS_MCP_API_KEY=your-api-key-here`

</details>

<details>
<summary>opencode</summary>

Example `~/.config/opencode/opencode.json`:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "mcp": {
    "manus-mcp": {
      "type": "local",
      "command": ["npx", "manus-mcp"],
      "enabled": true,
      "env": { "MANUS_MCP_API_KEY": "your-api-key-here" }
    }
  }
}
```

</details>

<details>
<summary>Qodo Gen</summary>

Add a new MCP in Qodo Gen and paste the standard JSON config:

```json
{
  "command": "npx",
  "args": ["manus-mcp"],
  "env": { "MANUS_MCP_API_KEY": "your-api-key-here" }
}
```

</details>

<details>
<summary>Windsurf</summary>

Follow the Windsurf MCP integration guide and reuse the standard config:

```json
{
  "manus-mcp": {
    "command": "npx",
    "args": ["manus-mcp"],
    "env": { "MANUS_MCP_API_KEY": "your-api-key-here" }
  }
}
```

</details>

## Setup: Codex (TOML)

Add the following to your Codex TOML configuration:

```toml
[mcp_servers.manus-mcp]
command = "npx"
args = ["manus-mcp"]
# Optional environment variables:
# MANUS_MCP_API_KEY = "your-api-key-here"
# MCP_NAME = "manus-mcp"
```

## Configuration (Env)

- **MANUS_MCP_API_KEY**: Your Manus API key (required)
- **MANUS_MCP_API_BASE_URL**: Override the API base URL (default: `https://api.manus.ai/v1`)
- **MCP_NAME**: Server name override (default: `manus-mcp`)

## Available Tools

### `create_task`

Create a new AI task in Manus with custom parameters and optional attachments.

**Inputs**:
```json
{
  "prompt": "string (required) - The task prompt or instruction for the AI",
  "mode": "string (required) - 'speed' or 'quality'",
  "attachments": "array (optional) - List of attachment objects { filename, url, mime_type, size_bytes }",
  "connectors": "array (optional) - List of connector IDs (e.g., ['gmail', 'notion'])",
  "hide_in_task_list": "boolean (optional) - Hide from webapp task list (default: false)",
  "create_shareable_link": "boolean (optional) - Generate a public shareable link (default: false)"
}
```

**Outputs**:
```json
{
  "task_id": "string - Unique task identifier",
  "task_title": "string - Generated task title",
  "task_url": "string - Direct link to the task",
  "shareURL": "string (optional) - Public shareable link if requested"
}
```

### `create_webhook`

Register a new webhook to receive real-time notifications from Manus.

**Inputs**:
```json
{
  "url": "string (required) - Webhook endpoint URL",
  "events": "array (optional) - List of event types to subscribe to"
}
```

**Outputs**:
Webhook registration details including webhook ID and configuration.

### `delete_webhook`

Remove a previously registered webhook by its ID.

**Inputs**:
```json
{
  "webhook_id": "string (required) - The ID of the webhook to delete"
}
```

**Outputs**:
Success confirmation or error details.

## Example invocation (MCP tool call)

Create a task in speed mode:

```json
{
  "tool": "create_task",
  "arguments": {
    "prompt": "Analyze the quarterly sales data and generate a summary report with key insights",
    "mode": "speed",
    "create_shareable_link": true
  }
}
```

Create a task with attachments:

```json
{
  "tool": "create_task",
  "arguments": {
    "prompt": "Extract key action items from this meeting transcript",
    "mode": "quality",
    "attachments": [
      {
        "filename": "meeting-notes.pdf",
        "url": "https://example.com/files/meeting-notes.pdf",
        "mime_type": "application/pdf",
        "size_bytes": 245632
      }
    ],
    "connectors": ["gmail", "notion"]
  }
}
```

## Troubleshooting

### 401 Authentication Error
- Verify that `MANUS_MCP_API_KEY` is correctly set in your environment
- Check that your API key is valid and has not expired
- Test your API key with a direct curl request:
  ```bash
  curl -H "API_KEY: your-key" https://api.manus.ai/v1/tasks
  ```

### Node.js Version Error
- Ensure you're using Node.js 18 or later: `node -v`
- Update Node.js if necessary: https://nodejs.org/

### Build Issues
- Clear the build directory: `rm -rf build`
- Reinstall dependencies: `rm -rf node_modules && npm i`
- Rebuild: `npm run build`

### Testing Local Builds
- After building, test the server: `npx .` or `node build/index.js`
- Check that the executable is properly created: `ls -la build/index.js`

### Inspecting Publish Artifacts
- See what would be published: `npm pack --dry-run`
- Check the package contents: `npm pack && tar -xzf manus-mcp-*.tgz && cat package/package.json`

## References

- **Manus API Documentation**: https://open.manus.ai/docs
- **MCP SDK**: https://modelcontextprotocol.io/docs/sdks
- **MCP Architecture**: https://modelcontextprotocol.io/docs/learn/architecture
- **MCP Server Concepts**: https://modelcontextprotocol.io/docs/learn/server-concepts
- **MCP Server Specification**: https://modelcontextprotocol.io/specification/2025-06-18/server/index
- **Manus Quickstart**: https://open.manus.ai/docs/quickstart
- **Manus Webhooks**: https://open.manus.ai/docs/webhooks/overview
- **Manus Connectors**: https://open.manus.ai/docs/connectors/overview

## Name Consistency & Troubleshooting

Always use **CANONICAL_ID** (`manus-mcp`) for identifiers and keys. Use **CANONICAL_DISPLAY** (`Manus MCP`) only for UI labels. Do not mix legacy keys after registration.

### Consistency Matrix

| Context                       | Value         |
|-------------------------------|---------------|
| npm package name              | `manus-mcp`   |
| Binary name                   | `manus-mcp`   |
| MCP server name (SDK metadata)| `manus-mcp`   |
| Env default MCP_NAME          | `manus-mcp`   |
| Client registry key           | `manus-mcp`   |
| UI label                      | `Manus MCP`   |

### Conflict Cleanup

- Remove any stale keys (e.g., old display names like "Manus") and re-add with `manus-mcp` only
- Ensure global `.mcp.json` or client registries only use `manus-mcp` for keys
- **Cursor**: Configure in the UI; this project intentionally omits `.cursor/mcp.json`

### Example

✅ **Correct**:
```json
{
  "mcpServers": {
    "manus-mcp": {
      "command": "npx",
      "args": ["manus-mcp"]
    }
  }
}
```

❌ **Incorrect**:
```json
{
  "mcpServers": {
    "Manus": {  // Wrong: will conflict with "manus-mcp"
      "command": "npx",
      "args": ["manus-mcp"]
    }
  }
}
```

---

## License

MIT

