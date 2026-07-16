# Zerro Dev Studio (local)

Cursor / Claude Code–style **local coding agent** with real **bash**, **git**, and **filesystem** access.

> Browser Dev Studio lives at [zerroai.space](https://zerroai.space).  
> This package is the **installable CLI** for full local parity.

## Install

```bash
curl -fsSL https://raw.githubusercontent.com/Benjamin5607/zerro_ai_landing/main/zerro-dev-studio/install.sh | bash
```

Or from a clone of this monorepo:

```bash
cd zerro-dev-studio
npm install -g .
```

## Configure

```bash
export GROQ_API_KEY=…          # recommended free tier
# or OPENAI_API_KEY / NVIDIA_API_KEY / OPENROUTER_API_KEY / GEMINI_API_KEY
# or OLLAMA_HOST=http://127.0.0.1:11434
```

## Usage

```bash
cd your-project
zerro-dev                         # interactive REPL
zerro-dev "fix the flaky test"  # one-shot mission
zerro-dev run "add CI workflow"
zerro-dev status
```

Commands available to the agent: `bash`, `read_file`, `write_file`, `edit_file`, `grep`, `list_tree`, `git_status`, `git_diff`, `done`.

## Why local?

| Capability | Browser Dev Studio | Local `zerro-dev` |
|---|---|---|
| Real bash / npm test / CI | ❌ | ✅ |
| Real PTY-like shell tools | ❌ | ✅ |
| Native filesystem | Limited (picker) | ✅ |
| Git status / diff | Via API | ✅ native |
| Work Plan + tool loop | ✅ | ✅ |

## Links

- Web: https://zerroai.space  
- Repo: https://github.com/Benjamin5607/zerro_ai_landing  
- Install landing: https://benjamin5607.github.io/zerro_ai_landing/dev-studio.html
