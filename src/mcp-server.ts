import { resolve } from 'node:path';
import { createInterface } from 'node:readline';
import type { Readable, Writable } from 'node:stream';
import { callMcpTool, listMcpTools, McpJsonRpcError, type McpToolContext } from './mcp-tools.js';
import { listMcpResources, readMcpResource } from './mcp-resources.js';

export interface McpJsonRpcRequest {
  jsonrpc?: string;
  id?: string | number | null;
  method?: string;
  params?: unknown;
}

export interface McpJsonRpcSuccess {
  jsonrpc: '2.0';
  id: string | number | null;
  result: unknown;
}

export interface McpJsonRpcFailure {
  jsonrpc: '2.0';
  id: string | number | null;
  error: {
    code: number;
    message: string;
    data?: unknown;
  };
}

export type McpJsonRpcResponse = McpJsonRpcSuccess | McpJsonRpcFailure;
export type McpJsonRpcLineResult = McpJsonRpcResponse | McpJsonRpcResponse[] | null;

type JsonRecord = Record<string, unknown>;

export function handleMcpJsonRpcLine(line: string, context: McpToolContext): McpJsonRpcLineResult {
  const trimmed = line.trim();
  if (!trimmed) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch (error) {
    return errorResponse(null, -32700, 'Parse error', error instanceof Error ? error.message : String(error));
  }
  if (Array.isArray(parsed)) {
    if (parsed.length === 0) return errorResponse(null, -32600, 'Invalid Request');
    const responses = parsed
      .map((request) => handleMcpJsonRpcRequest(request, context))
      .filter((response): response is McpJsonRpcResponse => response !== null);
    return responses.length > 0 ? responses : null;
  }
  return handleMcpJsonRpcRequest(parsed, context);
}

export function handleMcpJsonRpcRequest(parsed: unknown, context: McpToolContext): McpJsonRpcResponse | null {
  if (!isRecord(parsed) || parsed.jsonrpc !== '2.0' || typeof parsed.method !== 'string') {
    return errorResponse(extractId(parsed), -32600, 'Invalid Request');
  }
  const hasId = Object.prototype.hasOwnProperty.call(parsed, 'id');
  if (!hasId) return null;
  const id = normalizeId(parsed.id);

  try {
    switch (parsed.method) {
      case 'initialize':
        return successResponse(id, {
          protocolVersion: protocolVersion(parsed.params),
          capabilities: {
            tools: {},
            resources: {},
          },
          serverInfo: {
            name: 'open-scaffold-mcp',
            title: 'Open Scaffold MCP Server',
          },
        });
      case 'tools/list':
        return successResponse(id, { tools: listMcpTools() });
      case 'tools/call': {
        const params = asRecord(parsed.params, 'tools/call params must be an object');
        const name = requiredString(params, 'name');
        const toolArgs = params.arguments ?? {};
        const result = callMcpTool(name, toolArgs, context);
        return successResponse(id, {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
          structuredContent: result,
        });
      }
      case 'resources/list':
        return successResponse(id, { resources: listMcpResources(context.root) });
      case 'resources/read': {
        const params = asRecord(parsed.params, 'resources/read params must be an object');
        const uri = requiredString(params, 'uri');
        const content = readMcpResource(uri, { root: context.root });
        return successResponse(id, { contents: [content] });
      }
      case 'notifications/initialized':
        return parsed.id === undefined ? null : successResponse(id, {});
      default:
        return errorResponse(id, -32601, `Method not found: ${parsed.method}`);
    }
  } catch (error) {
    if (error instanceof McpJsonRpcError) return errorResponse(id, error.code, error.message, error.data);
    return errorResponse(id, -32603, error instanceof Error ? error.message : String(error));
  }
}

export function renderMcpValidationStatus(root: string): string {
  const result = callMcpTool('get_status', {}, { root, allowWrite: false });
  return JSON.stringify(result, null, 2);
}

export async function runMcpStdioServer(context: McpToolContext, input: Readable = process.stdin, output: Writable = process.stdout): Promise<void> {
  const reader = createInterface({ input, crlfDelay: Infinity });
  for await (const line of reader) {
    const response = handleMcpJsonRpcLine(line, context);
    if (response) output.write(`${JSON.stringify(response)}\n`);
  }
}

export async function runMcpCommand(args: string[], root = process.cwd()): Promise<number> {
  const [subcommand, ...rest] = args;
  if (subcommand === undefined || isHelpArg(subcommand)) {
    printMcpUsage(process.stdout);
    return 0;
  }
  if (subcommand !== 'serve') {
    process.stderr.write(`Unknown mcp command: ${subcommand}\n`);
    printMcpUsage(process.stderr);
    return 2;
  }

  let allowWrite = false;
  let validate = false;
  let serverRoot = root;
  for (let i = 0; i < rest.length; i += 1) {
    const flag = rest[i];
    switch (flag) {
      case '--allow-write':
        allowWrite = true;
        break;
      case '--validate':
        validate = true;
        break;
      case '--repo': {
        const value = rest[i + 1];
        if (!value || value.startsWith('--')) {
          process.stderr.write('Missing value for --repo\n');
          printMcpServeUsage(process.stderr);
          return 2;
        }
        serverRoot = resolve(root, value);
        i += 1;
        break;
      }
      case '-h':
      case '--help':
      case 'help':
        printMcpServeUsage(process.stdout);
        return 0;
      default:
        process.stderr.write(`Unknown option for mcp serve: ${flag}\n`);
        printMcpServeUsage(process.stderr);
        return 2;
    }
  }

  if (validate) {
    process.stdout.write(`${renderMcpValidationStatus(serverRoot)}\n`);
    return 0;
  }

  await runMcpStdioServer({ root: serverRoot, allowWrite });
  return 0;
}

function printMcpUsage(stream: Writable): void {
  stream.write('Usage: osc mcp serve [--repo <path>] [--allow-write] [--validate]\n');
}

function printMcpServeUsage(stream: Writable): void {
  stream.write('Usage: osc mcp serve [--repo <path>] [--allow-write] [--validate]\n\nOptions:\n  --repo <path>  Open Scaffold repository root to expose. Defaults to the current working directory.\n  --allow-write  Enable write tools such as create_plan, amend_plan, close_plan, and create_evidence.\n  --validate     Print local scaffold status JSON and exit without starting stdio.\n');
}

function isHelpArg(value: string | undefined): boolean {
  return value === '-h' || value === '--help' || value === 'help';
}

function protocolVersion(params: unknown): string {
  if (isRecord(params) && typeof params.protocolVersion === 'string' && params.protocolVersion.trim()) return params.protocolVersion;
  return '2024-11-05';
}

function successResponse(id: string | number | null, result: unknown): McpJsonRpcSuccess {
  return { jsonrpc: '2.0', id, result };
}

function errorResponse(id: string | number | null, code: number, message: string, data?: unknown): McpJsonRpcFailure {
  return { jsonrpc: '2.0', id, error: data === undefined ? { code, message } : { code, message, data } };
}

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function asRecord(value: unknown, message: string): JsonRecord {
  if (!isRecord(value)) throw new McpJsonRpcError(-32602, message);
  return value;
}

function requiredString(value: JsonRecord, key: string): string {
  const raw = value[key];
  if (typeof raw !== 'string' || !raw.trim()) throw new McpJsonRpcError(-32602, `Missing required string param: ${key}`);
  return raw.trim();
}

function normalizeId(value: unknown): string | number | null {
  if (typeof value === 'string' || typeof value === 'number' || value === null) return value;
  return null;
}

function extractId(value: unknown): string | number | null {
  return isRecord(value) ? normalizeId(value.id) : null;
}
