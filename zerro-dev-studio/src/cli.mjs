import { createInterface } from 'node:readline';
import { resolve } from 'node:path';
import { loadConfig, resolveLlmAuth, saveConfig } from './config.mjs';
import { runMission } from './agent.mjs';
import { listTree } from './tools.mjs';
import { connectOllama, disconnectOllama, ollamaStatus } from './ollamaCli.mjs';

const HELP = `
Zerro Dev Studio — local coding agent (git · shell · filesystem)

Install (macOS / Linux):
  curl -fsSL https://raw.githubusercontent.com/Benjamin5607/zerro_ai_landing/main/zerro-dev-studio/install.sh | bash

Install (Windows — PowerShell, no bash):
  irm https://raw.githubusercontent.com/Benjamin5607/zerro_ai_landing/main/zerro-dev-studio/install.ps1 | iex

Install (Windows — CMD):
  curl -fsSL https://raw.githubusercontent.com/Benjamin5607/zerro_ai_landing/main/zerro-dev-studio/install.cmd -o %TEMP%\\zerro-install.cmd && %TEMP%\\zerro-install.cmd

Usage:
  zerro-dev                         Interactive REPL
  zerro-dev "fix login validation"  One-shot mission
  zerro-dev run "add unit tests"
  zerro-dev ollama connect          One-click local Ollama (when ollama serve is running)
  zerro-dev ollama status
  zerro-dev status
  zerro-dev --help

Environment (cloud alternative):
  GROQ_API_KEY | OPENAI_API_KEY | NVIDIA_API_KEY | OPENROUTER_API_KEY | GEMINI_API_KEY

Web IDE: https://zerroai.space
`.trim();

function parseArgs(argv) {
  const out = { cwd: process.cwd(), command: null, instruction: null, flags: {}, ollamaSub: null };
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
  if (rest[0] === 'ollama') {
    out.command = 'ollama';
    out.ollamaSub = rest[1] || 'connect';
    return out;
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
  if (cfg.ollamaHost) {
    console.log(`🦙 ollamaHost: ${cfg.ollamaHost}${cfg.ollamaConnected ? ' (connected)' : ''}`);
  }
  if (auth) {
    console.log(`🔑 LLM: ${auth.provider} @ ${auth.baseUrl} (${auth.model})`);
  } else {
    console.log('🔑 LLM: not configured — run: zerro-dev ollama connect  OR  set GROQ_API_KEY');
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
❌ No LLM configured.

Local (one click):
  zerro-dev ollama connect

Cloud API:
  set GROQ_API_KEY=…        # Windows CMD
  $env:GROQ_API_KEY="…"     # PowerShell
  export GROQ_API_KEY=…     # macOS/Linux

Web fallback: https://zerroai.space
`);
    process.exit(1);
  }
  return { cfg: next, auth };
}

async function runRepl(cwd, cfg, auth) {
  console.log(`\nZerro Dev Studio · local REPL`);
  console.log(`cwd=${cwd} · ${auth.provider}/${auth.model}`);
  console.log(`Commands: :quit :status :ollama :help\n`);

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
    if (line === ':ollama' || line === 'ollama') {
      try {
        const r = await connectOllama();
        cfg = r.cfg;
        auth = resolveLlmAuth(cfg);
        console.log(`🦙 Ollama connected · ${r.model} @ ${r.host}`);
      } catch (e) {
        console.error(`❌ ${e.message || e}`);
      }
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

  if (args.command === 'ollama') {
    const sub = args.ollamaSub || 'connect';
    if (sub === 'connect' || sub === 'on' || sub === 'link') {
      const r = await connectOllama();
      console.log(`✅ Ollama connected`);
      console.log(`   host:  ${r.host}`);
      console.log(`   model: ${r.model}`);
      if (r.models.length > 1) {
        console.log(`   models (${r.models.length}): ${r.models.slice(0, 6).join(', ')}${r.models.length > 6 ? '…' : ''}`);
      }
      console.log(`\nRun: cd your-project && zerro-dev`);
      return;
    }
    if (sub === 'status' || sub === 'check') {
      const s = await ollamaStatus();
      if (s.connected) {
        console.log(`🦙 Ollama OK @ ${s.host}`);
        console.log(`   saved model: ${s.savedModel || '(none)'}`);
        console.log(`   installed: ${s.models.slice(0, 8).join(', ') || '(none)'}`);
      } else {
        console.log(`⚠️  Ollama not reachable. Start Ollama app or: ollama serve`);
        if (s.savedHost) console.log(`   last host: ${s.savedHost}`);
      }
      return;
    }
    if (sub === 'disconnect' || sub === 'off') {
      disconnectOllama();
      console.log('🔌 Ollama disconnected from zerro-dev config');
      return;
    }
    console.error(`Unknown: ollama ${sub}. Try: connect | status | disconnect`);
    process.exit(1);
  }

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
