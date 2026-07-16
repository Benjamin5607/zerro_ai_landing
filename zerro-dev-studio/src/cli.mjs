import { createInterface } from 'node:readline';
import { resolve } from 'node:path';
import { loadConfig, resolveLlmAuth, saveConfig } from './config.mjs';
import { runMission } from './agent.mjs';
import { listTree } from './tools.mjs';

const HELP = `
Zerro Dev Studio — local coding agent (bash · git · filesystem)

Install:
  curl -fsSL https://raw.githubusercontent.com/Benjamin5607/zerro_ai_landing/main/zerro-dev-studio/install.sh | bash

Usage:
  zerro-dev                         Interactive REPL in current directory
  zerro-dev "fix login validation" One-shot mission
  zerro-dev run "add unit tests"    Same as one-shot
  zerro-dev --cwd ../app run "…"    Set workspace
  zerro-dev status                  Show cwd + LLM auth
  zerro-dev config set provider groq
  zerro-dev --help

Environment (pick one):
  GROQ_API_KEY | OPENAI_API_KEY | NVIDIA_API_KEY | OPENROUTER_API_KEY
  CEREBRAS_API_KEY | GEMINI_API_KEY | OLLAMA_HOST

Web IDE (browser): https://zerroai.space
Repo: https://github.com/Benjamin5607/zerro_ai_landing
`.trim();

function parseArgs(argv) {
  const out = { cwd: process.cwd(), command: null, instruction: null, flags: {} };
  const rest = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--help' || a === '-h') out.flags.help = true;
    else if (a === '--cwd' || a === '-C') out.cwd = resolve(argv[++i] || '.');
    else if (a === '--model') out.flags.model = argv[++i];
    else if (a === '--provider') out.flags.provider = argv[++i];
    else if (a === '--max-rounds') out.flags.maxRounds = Number(argv[++i]);
    else rest.push(a);
  }
  if (rest[0] === 'run' || rest[0] === 'do') {
    out.command = 'run';
    out.instruction = rest.slice(1).join(' ').trim();
  } else if (rest[0] === 'status') {
    out.command = 'status';
  } else if (rest[0] === 'config') {
    out.command = 'config';
    out.configArgs = rest.slice(1);
  } else if (rest[0] === 'help') {
    out.flags.help = true;
  } else if (rest.length) {
    out.command = 'run';
    out.instruction = rest.join(' ').trim();
  } else {
    out.command = 'repl';
  }
  return out;
}

function printStatus(cwd, cfg, auth) {
  console.log(`📂 cwd: ${cwd}`);
  console.log(`⚙️  config: provider=${cfg.provider} model=${cfg.model} maxRounds=${cfg.maxRounds}`);
  if (auth) {
    console.log(`🔑 LLM: ${auth.provider} @ ${auth.baseUrl} (${auth.model})`);
  } else {
    console.log('🔑 LLM: not configured — set GROQ_API_KEY (or another provider key)');
  }
  const tree = listTree(cwd, 15);
  console.log(`📁 files (sample):\n${tree.map((t) => `  ${t}`).join('\n') || '  (empty)'}`);
}

async function ensureAuth(cfg, flags) {
  if (flags.provider || flags.model) {
    saveConfig({
      ...(flags.provider ? { provider: flags.provider } : {}),
      ...(flags.model ? { model: flags.model } : {}),
    });
  }
  const next = loadConfig();
  if (flags.maxRounds) next.maxRounds = flags.maxRounds;
  const auth = resolveLlmAuth(next);
  if (!auth) {
    console.error(`
❌ No LLM API key found.

Set one of:
  export GROQ_API_KEY=…          # free tier friendly
  export OPENAI_API_KEY=…
  export NVIDIA_API_KEY=…
  export OPENROUTER_API_KEY=…
  export OLLAMA_HOST=http://127.0.0.1:11434

Then retry. Web fallback: https://zerroai.space
`);
    process.exit(1);
  }
  return { cfg: next, auth };
}

async function runRepl(cwd, cfg, auth) {
  console.log(`\nZerro Dev Studio · local REPL`);
  console.log(`cwd=${cwd} · ${auth.provider}/${auth.model}`);
  console.log(`Type a mission, or :quit / :status / :help\n`);

  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const ask = (q) => new Promise((r) => rl.question(q, r));

  while (true) {
    const line = (await ask('zerro> ')).trim();
    if (!line) continue;
    if (line === ':quit' || line === ':exit' || line === 'quit') break;
    if (line === ':help' || line === 'help') {
      console.log(HELP);
      continue;
    }
    if (line === ':status' || line === 'status') {
      printStatus(cwd, cfg, auth);
      continue;
    }
    try {
      await runMission({ cwd, instruction: line, auth, cfg });
    } catch (e) {
      console.error(`❌ ${e.message || e}`);
    }
  }
  rl.close();
}

export async function runCli(argv) {
  const args = parseArgs(argv);
  if (args.flags.help) {
    console.log(HELP);
    return;
  }

  const cwd = resolve(args.cwd);

  if (args.command === 'config') {
    const [op, key, ...valParts] = args.configArgs || [];
    if (op === 'set' && key && valParts.length) {
      const value = valParts.join(' ');
      const patch = { [key]: /^\d+$/.test(value) ? Number(value) : value };
      console.log(saveConfig(patch));
      return;
    }
    console.log(loadConfig());
    return;
  }

  if (args.command === 'status') {
    const cfg = loadConfig();
    printStatus(cwd, cfg, resolveLlmAuth(cfg));
    return;
  }

  const { cfg, auth } = await ensureAuth(loadConfig(), args.flags);

  if (args.command === 'run') {
    if (!args.instruction) {
      console.error('Missing instruction. Example: zerro-dev "add README"');
      process.exit(1);
    }
    const result = await runMission({
      cwd,
      instruction: args.instruction,
      auth,
      cfg,
    });
    process.exit(result.ok ? 0 : 2);
  }

  await runRepl(cwd, cfg, auth);
}
