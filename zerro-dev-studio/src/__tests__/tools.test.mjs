import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { editFile, readFile, writeFile, runBash, grepFiles } from '../tools.mjs';

describe('local tools', () => {
  it('writes reads and edits inside cwd', () => {
    const cwd = mkdtempSync(join(tmpdir(), 'zerro-dev-'));
    writeFile(cwd, 'a.ts', 'hello');
    assert.equal(readFile(cwd, 'a.ts').content, 'hello');
    const edited = editFile(cwd, 'a.ts', 'hello', 'hello world');
    assert.equal(edited.ok, true);
    assert.equal(readFileSync(join(cwd, 'a.ts'), 'utf8'), 'hello world');
  });

  it('runs real bash', async () => {
    const cwd = mkdtempSync(join(tmpdir(), 'zerro-bash-'));
    writeFileSync(join(cwd, 'x.txt'), 'ok');
    const res = await runBash(cwd, 'cat x.txt && echo hi');
    assert.equal(res.ok, true);
    assert.match(res.stdout, /ok/);
    assert.match(res.stdout, /hi/);
  });

  it('greps files', () => {
    const cwd = mkdtempSync(join(tmpdir(), 'zerro-grep-'));
    writeFile(cwd, 'src/app.ts', 'function login() {}\n');
    const hits = grepFiles(cwd, 'login');
    assert.equal(hits.count >= 1, true);
  });
});
