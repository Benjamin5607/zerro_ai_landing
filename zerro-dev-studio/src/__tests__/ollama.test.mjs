import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { pickDefaultOllamaModel } from '../ollama.mjs';

describe('ollama helpers', () => {
  it('picks a sensible default model', () => {
    const models = ['mistral:latest', 'llama3.2:latest', 'tinyllama'];
    assert.equal(pickDefaultOllamaModel(models), 'llama3.2:latest');
  });

  it('falls back to first model', () => {
    assert.equal(pickDefaultOllamaModel(['custom:7b']), 'custom:7b');
  });
});
