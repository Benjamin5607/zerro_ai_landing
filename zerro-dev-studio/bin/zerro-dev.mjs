#!/usr/bin/env node
/**
 * Zerro Dev Studio local CLI entrypoint.
 * Usage:
 *   zerro-dev                     interactive REPL
 *   zerro-dev "fix the login bug" one-shot mission
 *   zerro-dev --cwd ./app run "add tests"
 *   zerro-dev --help
 */

import { pathToFileURL } from 'node:url';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const mainPath = resolve(__dirname, '../src/cli.mjs');

const { runCli } = await import(pathToFileURL(mainPath).href);
await runCli(process.argv.slice(2));
