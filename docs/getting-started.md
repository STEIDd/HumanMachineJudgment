# Getting Started

This guide walks you through installing and using Human-Machine Judgment
(HMJ) with Claude Code.

---

## Prerequisites

| Tool   | Version | Purpose                |
| ------ | ------- | ---------------------- |
| Python | 3.12+   | Runtime                |
| uv     | latest  | Python package manager |

Node.js 22+ and pnpm 10+ are only needed if you want to build the
review console from source.

---

## 1. Install HMJ

```bash
uv tool install hmj --from git+https://github.com/STEIDd/HumanMachineJudgment#subdirectory=backend/hmj
```

Verify the installation:

```bash
hmj --version
hmj --help
```

---

## 2. Initialize a Project

Navigate to the root of the project you want to add judgment tracking to:

```bash
cd your-project
hmj init --name "my-project"
```

This creates a `.judgment/` directory containing:

- `project.toml` — project ID and name
- `policy.yaml` — judgment policies (empty by default)
- `judgment.db` — SQLite database for judgment points and events
- `.gitignore` — tracks config files, ignores the database

---

## 3. Connect to Claude Code

```bash
hmj connect claude
```

This writes two files:

- `.mcp.json` — registers the HMJ MCP server so the agent has
  judgment tools available
- `.claude/settings.json` — registers PreToolUse, PostToolUse, and
  Stop hooks so HMJ can intercept consequential tool calls, track
  artifact modifications, and enforce session-scoped judgment requirements

---

## 4. Use Claude Code Normally

Start Claude Code as usual:

```bash
claude
```

HMJ operates transparently:

- **Detection**: Every tool call passes through the detection pipeline.
  Dangerous or consequential operations (destructive commands, force
  pushes, schema changes) are intercepted.

- **Blocking**: When a consequential choice is detected at `pause` or
  higher intervention level, the tool call is blocked and a judgment
  point is created. Decision deduplication reuses existing resolutions
  for the same decision, avoiding unnecessary interruptions.

- **Staleness tracking**: After file-modifying tools execute, HMJ
  checks whether any resolved judgment point's scope has been
  invalidated by the change. If so, the resolution is marked stale.

- **Session enforcement**: When Claude Code attempts to stop, HMJ
  checks for unresolved judgment points requiring attention and
  blocks the stop if needed.

- **Agent tools**: Via MCP, the agent can propose judgment points, add
  alternatives, assess materiality, and resolve decisions when it has
  delegated authority.

---

## 5. Review Judgment Points

### From the CLI

```bash
hmj list                    # List all judgment points
hmj show <point-id>         # View details of a specific point
hmj resolve <point-id>      # Resolve a judgment point
hmj dismiss <point-id>      # Dismiss a judgment point
hmj status                  # Project overview with counts
```

### From the Review Console

```bash
hmj serve                   # Start at http://127.0.0.1:8457
hmj open                    # Start and open in browser
```

The review console provides:

- Filterable list of all judgment points
- Detail view with context, alternatives, and event timeline
- Resolution form for selecting an alternative and providing rationale
- Dismiss and reopen actions

---

## 6. Check Configuration

```bash
hmj doctor
```

This runs comprehensive health checks and reports PASS/FAIL/WARN
for each: HMJ binary, version, project root, configuration validity,
SQLite database with WAL mode, policy file, Claude Code binary,
MCP server configuration, hook configuration, and review console assets.

---

## 7. Disconnect

To remove HMJ from Claude Code:

```bash
hmj disconnect claude
```

This removes the HMJ entries from `.mcp.json` and
`.claude/settings.json` without affecting other entries.

---

## Development Setup

If you want to work on HMJ itself:

```bash
git clone https://github.com/STEIDd/HumanMachineJudgment.git
cd HumanMachineJudgment

# TypeScript packages
pnpm install
pnpm run build

# Python backend
cd backend
uv sync --all-packages
uv run pytest -v
```

---

## Next Steps

- [CLI Reference](./cli-reference.md) — full command documentation
- [Architecture](./architecture.md) — system design and data flow
- [MCP Integration](./mcp-integration.md) — agent tool interface
- [Materiality and Policy](./materiality-and-policy.md) — scoring and
  intervention levels
