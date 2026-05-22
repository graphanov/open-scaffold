#!/usr/bin/env node
import { runMcpCommand } from './mcp-server.js';

const args = process.argv.slice(2);
const commandArgs = args[0] === 'serve' ? args : ['serve', ...args];

runMcpCommand(commandArgs).then((code) => {
  if (code !== 0) process.exit(code);
}).catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
