/**
 * Local Ollama discovery + one-click connect for zerro-dev CLI.
 */

export const OLLAMA_HOST_CANDIDATES = [
  'http://127.0.0.1:11434',
  'http://localhost:11434',
];

export async function probeOllama(host, { timeoutMs = 6000 } = {}) {
  const base = String(host || '').replace(/\/$/, '');
  if (!base) throw new Error('empty host');

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${base}/api/tags`, { signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const models = Array.isArray(data?.models)
      ? data.models.map((m) => String(m.name || m.model || '')).filter(Boolean)
      : [];
    return { host: base, models };
  } finally {
    clearTimeout(timer);
  }
}

export async function findLocalOllama(extraHosts = []) {
  const hosts = [...new Set([...extraHosts, ...OLLAMA_HOST_CANDIDATES])];
  let lastErr = 'not reachable';
  for (const host of hosts) {
    try {
      return await probeOllama(host);
    } catch (e) {
      lastErr = e?.message || String(e);
    }
  }
  throw new Error(
    `Ollama not reachable (${lastErr}). Start Ollama desktop or run: ollama serve`
  );
}

export function pickDefaultOllamaModel(models, preferred) {
  if (preferred && models.includes(preferred)) return preferred;
  const ranked = [
    'llama3.2',
    'llama3.1',
    'llama3',
    'qwen2.5-coder',
    'deepseek-coder',
    'codellama',
    'mistral',
  ];
  for (const name of ranked) {
    const hit = models.find((m) => m === name || m.startsWith(`${name}:`));
    if (hit) return hit;
  }
  return models[0] || 'llama3.2';
}
