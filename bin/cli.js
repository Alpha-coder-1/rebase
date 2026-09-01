#!/usr/bin/env node

import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { startProxy } from '..index.js';

const argv = yargs(hideBin(process.argv))
  .scriptName('rebase')
  .usage('$0 [options]')
  .option('target', {
    alias: 't',
    type: 'string',
    describe: 'Upstream target MCP server URL',
    demandOption: true,
  })
  .option('port', {
    alias: 'p',
    type: 'number',
    describe: 'Local port for rebase proxy server',
    default: 8080,
  })
  .option('db', {
    alias: 'd',
    type: 'string',
    describe: 'Path to Lowdb storage file for schemas',
    default: 'schemas.json',
  })
  .example(
    '$0 --target http://localhost:3000/mcp --port 8080',
    'Run proxy against a local test server'
  )
  .example(
    '$0 -t https://api.remote-mcp.com/mcp -p 8080',
    'Run proxy using shorthand flags'
  )
  .help()
  .alias('help', 'h')
  .version()
  .alias('version', 'v')
  .argv;

console.log(`\x1b[36m%s\x1b[0m`, `[Tripwire] Starting MCP Schema Guard Proxy...`);
console.log(`Upstream Target: ${argv.target}`);
console.log(`Listening on:    http://localhost:${argv.port}/mcp`);
console.log(`Schema Database: ${argv.db}\n`);

startProxy({
  targetUrl: argv.target,
  port: argv.port,
  dbPath: argv.db,
}).catch((err) => {
  console.error('\x1b[31m%s\x1b[0m', `[Tripwire Error] ${err.message}`);
  process.exit(1);
});
