# Zerro Dev Studio (local)

**Local coding agent** with real **bash**, **git**, and **filesystem** access.

> Web / Desktop Dev Studio: [zerroai.space](https://zerroai.space)  
> Install page (Desktop Setup + CLI): [benjamin5607.github.io/zerro_ai_landing/dev-studio.html](https://benjamin5607.github.io/zerro_ai_landing/dev-studio.html)  
> Windows Desktop Setup: [desktop-v0.2.7](https://github.com/Benjamin5607/zerro_ai_landing/releases/tag/desktop-v0.2.7)

The browser and Electron apps share an **agent-first pastel-mint** Dev Studio UI (EN default / 한국어). This package is the **CLI** path for scripts, headless agents, and CI.
## Install

**macOS / Linux**

```bash
curl -fsSL https://raw.githubusercontent.com/Benjamin5607/zerro_ai_landing/main/zerro-dev-studio/install.sh | bash
```

**Windows (PowerShell — no bash)**

```powershell
irm https://raw.githubusercontent.com/Benjamin5607/zerro_ai_landing/main/zerro-dev-studio/install.ps1 | iex
```

**Windows (CMD)**

```cmd
curl -fsSL https://raw.githubusercontent.com/Benjamin5607/zerro_ai_landing/main/zerro-dev-studio/install.cmd -o %TEMP%\zerro-install.cmd && %TEMP%\zerro-install.cmd
```

**From clone**

```bash
cd zerro-dev-studio && npm install -g .
```

## Configure

**Local Ollama (one click)** — start Ollama desktop or `ollama serve` first:

```bash
zerro-dev ollama connect
zerro-dev ollama status
```

**Cloud API**

```bash
export GROQ_API_KEY=…          # or OPENAI / NVIDIA / OPENROUTER / GEMINI
```

## Usage

```bash
cd your-project
zerro-dev                         # interactive REPL
zerro-dev "fix the flaky test"    # one-shot
zerro-dev run "add CI workflow"
zerro-dev status
```

In REPL: `:ollama` reconnects local Ollama.

Agent tools: `bash`, `read_file`, `write_file`, `edit_file`, `grep`, `list_tree`, `git_status`, `git_diff`, `done`.

## Why local?

| Capability | Browser Dev Studio | Local `zerro-dev` |
|---|---|---|
| Real bash / npm test / CI | ❌ | ✅ |
| Native filesystem + git | Limited | ✅ |
| One-click Ollama | — | ✅ `ollama connect` |
| Work Plan + tool loop | ✅ | ✅ |
