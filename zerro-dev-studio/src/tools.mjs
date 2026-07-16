import { spawn } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  readdirSync,
  statSync,
} from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';

function assertInsideCwd(cwd, targetPath) {
  const abs = resolve(cwd, targetPath);
  const root = resolve(cwd) + sep;
  if (abs !== resolve(cwd) && !abs.startsWith(root)) {
    throw new Error(`Path escapes workspace: ${targetPath}`);
  }
  return abs;
}

export function runBash(cwd, command, { timeoutMs = 120000 } = {}) {
  return new Promise((resolvePromise) => {
    const child = spawn(command, {
      cwd,
      shell: true,
      env: { ...process.env, FORCE_COLOR: '0' },
    });
    let stdout = '';
    let stderr = '';
    const timer = setTimeout(() => {
      child.kill('SIGTERM');
      resolvePromise({
        ok: false,
        code: -1,
        stdout: stdout.slice(-8000),
        stderr: `${stderr}\n[timeout after ${timeoutMs}ms]`.slice(-4000),
      });
    }, timeoutMs);

    child.stdout.on('data', (d) => {
      stdout += d.toString();
      if (stdout.length > 200000) stdout = stdout.slice(-100000);
    });
    child.stderr.on('data', (d) => {
      stderr += d.toString();
      if (stderr.length > 100000) stderr = stderr.slice(-50000);
    });
    child.on('close', (code) => {
      clearTimeout(timer);
      resolvePromise({
        ok: code === 0,
        code: code ?? 1,
        stdout: stdout.slice(-12000),
        stderr: stderr.slice(-6000),
      });
    });
    child.on('error', (err) => {
      clearTimeout(timer);
      resolvePromise({ ok: false, code: 1, stdout: '', stderr: String(err.message || err) });
    });
  });
}

export function readFile(cwd, path, maxChars = 60000) {
  const abs = assertInsideCwd(cwd, path);
  if (!existsSync(abs)) return { ok: false, error: `NOT_FOUND: ${path}` };
  const st = statSync(abs);
  if (st.isDirectory()) return { ok: false, error: `IS_DIRECTORY: ${path}` };
  let content = readFileSync(abs, 'utf8');
  const truncated = content.length > maxChars;
  if (truncated) content = content.slice(0, maxChars) + `\n/* truncated ${content.length}→${maxChars} */`;
  return { ok: true, path: relative(cwd, abs) || path, content, bytes: st.size, truncated };
}

export function writeFile(cwd, path, content) {
  const abs = assertInsideCwd(cwd, path);
  mkdirSync(dirname(abs), { recursive: true });
  writeFileSync(abs, content, 'utf8');
  return { ok: true, path: relative(cwd, abs) || path, bytes: Buffer.byteLength(content, 'utf8') };
}

export function editFile(cwd, path, oldString, newString) {
  const abs = assertInsideCwd(cwd, path);
  if (!existsSync(abs)) return { ok: false, error: `NOT_FOUND: ${path}` };
  const before = readFileSync(abs, 'utf8');
  const count = before.split(oldString).length - 1;
  if (count === 0) return { ok: false, error: 'old_string not found' };
  if (count > 1) return { ok: false, error: `old_string matched ${count} times — make it unique` };
  const after = before.replace(oldString, newString);
  writeFileSync(abs, after, 'utf8');
  return { ok: true, path: relative(cwd, abs) || path, bytes: Buffer.byteLength(after, 'utf8') };
}

export function grepFiles(cwd, pattern, { maxHits = 40, globHint = '' } = {}) {
  const re = new RegExp(pattern, 'i');
  const hits = [];
  const skip = new Set(['node_modules', '.git', '.next', 'dist', 'build', '.zerro']);

  function walk(dir) {
    if (hits.length >= maxHits) return;
    let entries;
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const ent of entries) {
      if (skip.has(ent.name)) continue;
      const abs = join(dir, ent.name);
      if (ent.isDirectory()) {
        walk(abs);
        continue;
      }
      if (globHint && !ent.name.includes(globHint.replace('*', ''))) continue;
      if (!/\.(ts|tsx|js|jsx|mjs|cjs|json|md|css|html|py|go|rs|yml|yaml|toml|sh)$/i.test(ent.name)) {
        continue;
      }
      let text;
      try {
        text = readFileSync(abs, 'utf8');
      } catch {
        continue;
      }
      const lines = text.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (re.test(lines[i])) {
          hits.push({
            path: relative(cwd, abs),
            line: i + 1,
            text: lines[i].slice(0, 200),
          });
          if (hits.length >= maxHits) return;
        }
      }
    }
  }

  walk(cwd);
  return { ok: true, hits, count: hits.length };
}

export function listTree(cwd, max = 200) {
  const skip = new Set(['node_modules', '.git', '.next', 'dist', 'build']);
  const out = [];
  function walk(dir) {
    if (out.length >= max) return;
    let entries;
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const ent of entries) {
      if (skip.has(ent.name) || ent.name.startsWith('.')) continue;
      const abs = join(dir, ent.name);
      const rel = relative(cwd, abs);
      out.push(ent.isDirectory() ? `${rel}/` : rel);
      if (ent.isDirectory()) walk(abs);
      if (out.length >= max) return;
    }
  }
  walk(cwd);
  return out;
}

export async function gitStatus(cwd) {
  return runBash(cwd, 'git status --short && echo "---" && git rev-parse --abbrev-ref HEAD 2>/dev/null || true');
}

export async function gitDiff(cwd) {
  return runBash(cwd, 'git diff --stat && echo "---" && git diff -U2 | head -n 200');
}
