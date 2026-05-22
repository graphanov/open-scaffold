import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
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
const MCP_PROTOCOL_VERSION = '2024-11-05';

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
  if (!isValidId(parsed.id)) return errorResponse(null, -32600, 'Invalid Request');
  const id = parsed.id;

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
            version: packageVersion(),
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
  let mode: 'unknown' | 'framed' | 'line' = 'unknown';
  let frameBuffer: Buffer<ArrayBufferLike> = Buffer.alloc(0);
  let lineBuffer = '';

  for await (const chunk of input) {
    const chunkBuffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk));

    if (mode === 'unknown') {
      frameBuffer = Buffer.concat([frameBuffer, chunkBuffer]);
      const probe = frameBuffer.toString('utf8').trimStart();
      if (!probe) continue;
      const lowerProbe = probe.toLowerCase();
      const hasCompleteFrameHeader = frameHeaderSeparator(frameBuffer) !== null;
      if (hasCompleteFrameHeader && lowerProbe.startsWith('content-length:')) {
        mode = 'framed';
      } else if (lowerProbe.startsWith('content-length:') || 'content-length:'.startsWith(lowerProbe)) {
        continue;
      } else {
        mode = 'line';
        lineBuffer = frameBuffer.toString('utf8');
        frameBuffer = Buffer.alloc(0);
      }
    } else if (mode === 'framed') {
      frameBuffer = Buffer.concat([frameBuffer, chunkBuffer]);
    } else {
      lineBuffer += chunkBuffer.toString('utf8');
    }

    if (mode === 'framed') frameBuffer = processMcpFrameBuffer(frameBuffer, context, output);
    if (mode === 'line') lineBuffer = processMcpLineBuffer(lineBuffer, context, output);
  }

  if (mode === 'line' && lineBuffer.trim()) {
    writeMcpJsonRpcResponse(output, handleMcpJsonRpcLine(lineBuffer, context), false);
  }
}

function processMcpLineBuffer(buffer: string, context: McpToolContext, output: Writable): string {
  let remaining = buffer;
  while (true) {
    const newline = remaining.search(/\r?\n/);
    if (newline < 0) return remaining;
    const line = remaining.slice(0, newline);
    const nextOffset = remaining[newline] === '\r' && remaining[newline + 1] === '\n' ? newline + 2 : newline + 1;
    remaining = remaining.slice(nextOffset);
    writeMcpJsonRpcResponse(output, handleMcpJsonRpcLine(line, context), false);
  }
}

function processMcpFrameBuffer(buffer: Buffer, context: McpToolContext, output: Writable): Buffer {
  let remaining = buffer;
  while (remaining.length > 0) {
    const separator = frameHeaderSeparator(remaining);
    if (!separator) return remaining;

    const header = remaining.slice(0, separator.index).toString('utf8');
    const length = contentLengthFromHeader(header);
    const bodyStart = separator.index + separator.length;
    if (length === null) {
      writeMcpJsonRpcResponse(output, errorResponse(null, -32700, 'Parse error', 'Missing or invalid Content-Length header'), true);
      remaining = remaining.slice(bodyStart);
      continue;
    }
    if (remaining.length < bodyStart + length) return remaining;

    const body = remaining.slice(bodyStart, bodyStart + length).toString('utf8');
    remaining = remaining.slice(bodyStart + length);
    writeMcpJsonRpcResponse(output, handleMcpJsonRpcLine(body, context), true);
  }
  return remaining;
}

function frameHeaderSeparator(buffer: Buffer): { index: number; length: number } | null {
  const crlf = buffer.indexOf('\r\n\r\n');
  const lf = buffer.indexOf('\n\n');
  if (crlf < 0 && lf < 0) return null;
  if (crlf >= 0 && (lf < 0 || crlf <= lf)) return { index: crlf, length: 4 };
  return { index: lf, length: 2 };
}

function contentLengthFromHeader(header: string): number | null {
  for (const line of header.split(/\r?\n/)) {
    const match = /^content-length:\s*(\d+)\s*$/i.exec(line.trim());
    if (match) return Number(match[1]);
  }
  return null;
}

function writeMcpJsonRpcResponse(output: Writable, response: McpJsonRpcLineResult, framed: boolean): void {
  if (!response) return;
  const serialized = JSON.stringify(response);
  if (framed) {
    output.write(`Content-Length: ${Buffer.byteLength(serialized, 'utf8')}\r\n\r\n${serialized}`);
    return;
  }
  output.write(`${serialized}\n`);
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
  if (isRecord(params) && params.protocolVersion === MCP_PROTOCOL_VERSION) return MCP_PROTOCOL_VERSION;
  return MCP_PROTOCOL_VERSION;
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

function isValidId(value: unknown): value is string | number {
  return typeof value === 'string' || typeof value === 'number';
}

function extractId(value: unknown): string | number | null {
  return isRecord(value) ? normalizeId(value.id) : null;
}

function packageVersion(): string {
  try {
    const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')) as { version?: unknown };
    return typeof pkg.version === 'string' && pkg.version.trim() ? pkg.version : '0.0.0';
  } catch {
    return '0.0.0';
  }
}
