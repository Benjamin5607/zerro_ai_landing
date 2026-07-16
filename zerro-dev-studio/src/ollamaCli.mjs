import { loadConfig, saveConfig } from './config.mjs';
import { findLocalOllama, pickDefaultOllamaModel, probeOllama } from './ollama.mjs';

export async function connectOllama(opts = {}) {
  const cfg = loadConfig();
  const extra = opts.host ? [opts.host] : cfg.ollamaHost ? [cfg.ollamaHost] : [];
  const found = await findLocalOllama(extra);
  const model = pickDefaultOllamaModel(found.models, opts.model || cfg.model);
  const next = saveConfig({
    provider: 'ollama',
    ollamaHost: found.host,
    ollamaConnected: true,
    ollamaConnectedAt: new Date().toISOString(),
    model,
    lastCloudProvider: cfg.provider !== 'ollama' ? cfg.provider : cfg.lastCloudProvider,
  });
  return { cfg: next, host: found.host, models: found.models, model };
}

export function disconnectOllama() {
  const cfg = loadConfig();
  return saveConfig({
    ollamaConnected: false,
    ...(cfg.lastCloudProvider ? { provider: cfg.lastCloudProvider } : {}),
  });
}

export async function ollamaStatus() {
  const cfg = loadConfig();
  const savedHost = cfg.ollamaHost || null;
  try {
    const found = await findLocalOllama(savedHost ? [savedHost] : []);
    return {
      connected: true,
      host: found.host,
      models: found.models,
      savedModel: cfg.model,
      savedHost,
    };
  } catch {
    return {
      connected: false,
      host: null,
      models: [],
      savedModel: cfg.model,
      savedHost,
    };
  }
}

export async function verifySavedOllama() {
  const cfg = loadConfig();
  if (cfg.provider !== 'ollama' || !cfg.ollamaHost) return false;
  try {
    await probeOllama(cfg.ollamaHost);
    return true;
  } catch {
    return false;
  }
}
