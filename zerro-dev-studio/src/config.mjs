import { homedir } from 'node:os';
import { join } from 'node:path';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const CONFIG_DIR = join(homedir(), '.zerro');
const CONFIG_PATH = join(CONFIG_DIR, 'config.json');

export function ensureConfigDir() {
  if (!existsSync(CONFIG_DIR)) mkdirSync(CONFIG_DIR, { recursive: true });
}

export function loadConfig() {
  ensureConfigDir();
  if (!existsSync(CONFIG_PATH)) {
    return {
      provider: 'groq',
      model: 'llama-3.3-70b-versatile',
      maxRounds: 24,
      bashTimeoutMs: 120000,
    };
  }
  try {
    return { ...JSON.parse(readFileSync(CONFIG_PATH, 'utf8')) };
  } catch {
    return { provider: 'groq', model: 'llama-3.3-70b-versatile', maxRounds: 24 };
  }
}

export function saveConfig(patch) {
  ensureConfigDir();
  const next = { ...loadConfig(), ...patch };
  writeFileSync(CONFIG_PATH, JSON.stringify(next, null, 2));
  return next;
}

/**
 * Resolve API credentials from env (Claude Code style) or config.
 */
export function resolveLlmAuth(cfg = loadConfig()) {
  const providers = [
    {
      id: 'groq',
      env: ['GROQ_API_KEY'],
      baseUrl: 'https://api.groq.com/openai/v1',
      defaultModel: 'llama-3.3-70b-versatile',
    },
    {
      id: 'openai',
      env: ['OPENAI_API_KEY'],
      baseUrl: 'https://api.openai.com/v1',
      defaultModel: 'gpt-4o-mini',
    },
    {
      id: 'nvidia',
      env: ['NVIDIA_API_KEY', 'NGC_API_KEY'],
      baseUrl: 'https://integrate.api.nvidia.com/v1',
      defaultModel: 'meta/llama-3.1-70b-instruct',
    },
    {
      id: 'openrouter',
      env: ['OPENROUTER_API_KEY'],
      baseUrl: 'https://openrouter.ai/api/v1',
      defaultModel: 'meta-llama/llama-3.3-70b-instruct',
    },
    {
      id: 'cerebras',
      env: ['CEREBRAS_API_KEY'],
      baseUrl: 'https://api.cerebras.ai/v1',
      defaultModel: 'llama-3.3-70b',
    },
    {
      id: 'gemini',
      env: ['GEMINI_API_KEY', 'GOOGLE_API_KEY'],
      baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
      defaultModel: 'gemini-2.0-flash',
    },
    {
      id: 'ollama',
      env: ['OLLAMA_HOST'],
      baseUrl: (process.env.OLLAMA_HOST || 'http://127.0.0.1:11434').replace(/\/$/, '') + '/v1',
      defaultModel: 'llama3.2',
      optionalKey: true,
    },
  ];

  const preferred = String(cfg.provider || '').toLowerCase();
  const ordered = [
    ...providers.filter((p) => p.id === preferred),
    ...providers.filter((p) => p.id !== preferred),
  ];

  for (const p of ordered) {
    let key = '';
    for (const e of p.env) {
      if (process.env[e]) {
        key = process.env[e];
        break;
      }
    }
    if (p.optionalKey || key) {
      return {
        provider: p.id,
        apiKey: key || 'ollama',
        baseUrl: typeof p.baseUrl === 'string' ? p.baseUrl : p.baseUrl,
        model: cfg.model || p.defaultModel,
      };
    }
  }

  if (cfg.apiKey && cfg.baseUrl) {
    return {
      provider: cfg.provider || 'custom',
      apiKey: cfg.apiKey,
      baseUrl: cfg.baseUrl.replace(/\/$/, ''),
      model: cfg.model || 'gpt-4o-mini',
    };
  }

  return null;
}
