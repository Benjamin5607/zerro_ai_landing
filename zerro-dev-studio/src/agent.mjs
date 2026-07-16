import { chatCompletion } from './llm.mjs';
import {
  runBash,
  readFile,
  writeFile,
  editFile,
  grepFiles,
  listTree,
  gitStatus,
  gitDiff,
} from './tools.mjs';

const SYSTEM = `You are Zerro Dev Studio — a local coding agent like Claude Code / Cursor Agent.
You work INSIDE the user's real project directory with REAL tools:
- bash: run shell commands (npm test, git, builds, linters)
- read_file / write_file / edit_file
- grep / list_tree
- git_status / git_diff
- done: finish with a short summary

Rules:
1. Prefer small surgical edits (edit_file) over rewriting whole files.
2. After meaningful edits, run verification (lint/test/build) via bash when reasonable.
3. Never escape the workspace with paths like ../ outside the project.
4. Respond with ONE JSON object only:
{"thought":"...","tool":"bash|read_file|write_file|edit_file|grep|list_tree|git_status|git_diff|done","args":{...}}
Examples:
{"thought":"run tests","tool":"bash","args":{"command":"npm test"}}
{"thought":"read app","tool":"read_file","args":{"path":"src/App.tsx"}}
{"thought":"patch","tool":"edit_file","args":{"path":"src/App.tsx","old_string":"foo","new_string":"bar"}}
{"thought":"ship","tool":"done","args":{"summary":"Fixed X and ran npm test"}}`;

function parseTool(raw) {
  let text = String(raw || '').trim();
  if (text.startsWith('```')) {
    const parts = text.split('```');
    text = parts.length >= 2 ? parts[1].replace(/^(json)\s*/i, '') : text;
  }
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start >= 0 && end > start) text = text.slice(start, end + 1);
  const parsed = JSON.parse(text);
  const tool = String(parsed.tool || parsed.name || '').toLowerCase();
  const args = parsed.args || parsed.arguments || parsed;
  return { thought: String(parsed.thought || ''), tool, args };
}

async function execTool(cwd, tool, args, cfg) {
  switch (tool) {
    case 'bash':
    case 'shell':
    case 'run': {
      const command = String(args.command || args.cmd || '');
      if (!command) return { ok: false, error: 'missing command' };
      return runBash(cwd, command, { timeoutMs: cfg.bashTimeoutMs || 120000 });
    }
    case 'read_file':
    case 'read':
      return readFile(cwd, String(args.path || ''));
    case 'write_file':
    case 'write':
      return writeFile(cwd, String(args.path || ''), String(args.content ?? ''));
    case 'edit_file':
    case 'edit':
    case 'apply_edits':
      return editFile(
        cwd,
        String(args.path || ''),
        String(args.old_string || args.oldString || ''),
        String(args.new_string || args.newString || '')
      );
    case 'grep':
    case 'search':
      return grepFiles(cwd, String(args.pattern || args.query || ''), {
        globHint: String(args.glob || ''),
      });
    case 'list_tree':
    case 'ls':
    case 'glob':
      return { ok: true, tree: listTree(cwd, Number(args.max || 200)) };
    case 'git_status':
      return gitStatus(cwd);
    case 'git_diff':
      return gitDiff(cwd);
    case 'done':
      return { ok: true, done: true, summary: String(args.summary || args.message || 'done') };
    default:
      return { ok: false, error: `unknown tool: ${tool}` };
  }
}

function log(line) {
  process.stdout.write(`${line}\n`);
}

/**
 * Run a local agent mission with real tools.
 */
export async function runMission({
  cwd,
  instruction,
  auth,
  cfg = {},
  signal,
}) {
  const maxRounds = cfg.maxRounds || 24;
  const tree = listTree(cwd, 80).join('\n');
  const observations = [];
  const transcript = [];

  log(`\n🚀 Zerro Dev Studio (local)`);
  log(`📂 cwd: ${cwd}`);
  log(`🧠 ${auth.provider}/${auth.model}`);
  log(`📋 mission: ${instruction.slice(0, 200)}${instruction.length > 200 ? '…' : ''}\n`);

  for (let round = 1; round <= maxRounds; round++) {
    if (signal?.aborted) throw new Error('CANCELLED');

    const userPrompt = `[MISSION]
${instruction}

[WORKSPACE TREE (partial)]
${tree || '(empty)'}

[OBSERVATIONS]
${observations.slice(-8).join('\n\n') || '(none yet)'}

Return the next tool JSON only.`;

    const messages = [
      { role: 'system', content: SYSTEM },
      ...transcript.slice(-6),
      { role: 'user', content: userPrompt },
    ];

    let rawText;
    try {
      const res = await chatCompletion({
        auth,
        messages,
        temperature: 0.15,
        jsonMode: true,
        signal,
      });
      rawText = res.text;
    } catch (err) {
      // retry without jsonMode for providers that reject response_format
      const res = await chatCompletion({
        auth,
        messages,
        temperature: 0.15,
        jsonMode: false,
        signal,
      });
      rawText = res.text;
      void err;
    }

    let call;
    try {
      call = parseTool(rawText);
    } catch (e) {
      observations.push(`parse_error: ${e.message}\nraw=${rawText.slice(0, 400)}`);
      log(`⚠️  JSON parse failed (round ${round}) — retrying`);
      continue;
    }

    if (call.thought) log(`💭 ${call.thought.slice(0, 160)}`);
    log(`🔧 [${round}/${maxRounds}] ${call.tool}`);

    const result = await execTool(cwd, call.tool, call.args || {}, cfg);
    const resultText = JSON.stringify(result).slice(0, 6000);
    observations.push(`tool=${call.tool}\n${resultText}`);
    transcript.push({ role: 'assistant', content: rawText });
    transcript.push({ role: 'user', content: `TOOL_RESULT:\n${resultText}` });

    if (result.stdout) log(result.stdout.slice(0, 2000));
    if (result.stderr) log(result.stderr.slice(0, 1000));
    if (result.content && call.tool.startsWith('read')) {
      log(`📖 ${call.args?.path} (${String(result.content).length}c)`);
    }
    if (result.done || call.tool === 'done') {
      log(`\n✅ ${result.summary || 'Mission complete.'}\n`);
      return { ok: true, summary: result.summary || 'done', rounds: round };
    }
  }

  log(`\n⚠️  Hit max rounds (${maxRounds}). Partial progress may remain in the workspace.\n`);
  return { ok: false, summary: 'max rounds', rounds: maxRounds };
}
