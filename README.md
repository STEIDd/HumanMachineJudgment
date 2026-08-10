# Human-Machine Judgment

Judgment Points: durable, machine-readable decision records for
consequential choices in technical agent workflows.

## What is a Judgment Point?

A Judgment Point is a durable, machine-readable pause in a technical
workflow where a consequential choice is surfaced, investigated, resolved
by an authorized person or an explicit delegation policy, and connected
to the work that depends on it.

A Judgment Point is not required for every action, parameter, tool call,
file edit, or routine approval. It is appropriate when a choice can
materially affect the method, result, validity, interpretation,
accountability, or intended use of technical work.

## Quick Start

```bash
# Install hmj
uv tool install hmj --from git+https://github.com/STEIDd/HumanMachineJudgment#subdirectory=backend/hmj

# Initialize a project
cd your-project
hmj init --name "my-project"

# Connect to Claude Code
hmj connect claude

# Use Claude Code normally — HMJ automatically detects consequential choices
claude

# Review judgment points
hmj list
hmj serve         # Opens review console at http://127.0.0.1:8457
```

## How It Works

When connected to Claude Code, HMJ operates through three integration
points:

1. **Hooks** (PreToolUse) — A deterministic detection pipeline
   intercepts every tool call, evaluates it against rules and policies,
   and blocks execution when a consequential choice requires human
   judgment.

2. **MCP Server** — Provides the agent with structured tools to propose
   judgment points, add alternatives, assess materiality, and (when
   authorized) resolve decisions.

3. **Review Console** — A web interface for reviewing pending judgment
   points, examining alternatives, and recording resolutions with
   rationale.

All three access paths converge on the same SQLite database in
`.judgment/judgment.db`, ensuring a single source of truth.

## Architecture

```
Claude Code
    |
    +--[PreToolUse hook]--> hmj hook pre-tool-use --> detection pipeline
    |                                                      |
    +--[MCP stdio]--------> hmj mcp ---------------------->|
    |                                                      v
    +--[CLI]--------------> hmj resolve/dismiss -----> JudgmentClient
                                                           |
hmj serve ---------> Review Console API ------------------>|
                                                           v
                                                     SqliteStorage
                                                           |
                                                  .judgment/judgment.db
```

## Problem

AI agents executing technical workflows (engineering analysis, scientific
computation, data interpretation) routinely make choices that affect the
validity and meaning of the results. Current agent systems either proceed
without surfacing these choices or interrupt for every action regardless
of consequence.

Judgment Points provide a middle path: detect which choices are
consequential, pause when the project policy requires it, support
investigation and comparison of alternatives, record authorized
resolutions, and carry those resolutions into the computations and
conclusions that depend on them.

## What This Repository Contains

- **`hmj` CLI** — Operational runtime tool. Install globally via
  `uv tool install`, initialize projects, connect to Claude Code, review
  and resolve judgment points.
- **Specification** — The complete [Judgment Points specification](docs/judgment-points-specification.md).
- **JSON Schemas** — Machine-readable schemas (JSON Schema Draft 2020-12).
- **Python backend** — Core domain logic, developer SDK, storage
  adapters, MCP server, LangGraph adapter, and reference HTTP server.
- **Review Console** — React SPA for reviewing judgment points, served
  by `hmj serve`.
- **Agent Skill** — A portable [technical-judgment-review](skills/technical-judgment-review/SKILL.md)
  skill.
- **Evaluation harness** — Fixture-based test scenarios for detection
  and lifecycle behavior.
- **Documentation** — Architecture decisions, lifecycle, materiality
  scoring, API reference, CLI reference.

## Links

- [Getting Started](docs/getting-started.md)
- [CLI Reference](docs/cli-reference.md)
- [Architecture](docs/architecture.md)
- [Judgment Points Specification](docs/judgment-points-specification.md)
- [MCP Integration](docs/mcp-integration.md)
- [Agent Runtime Integration](docs/agent-runtime-integration.md)
- [Lifecycle](docs/lifecycle.md)
- [Materiality and Policy](docs/materiality-and-policy.md)

## Prerequisites

- [Python](https://www.python.org/) >= 3.12
- [uv](https://docs.astral.sh/uv/) (Python package manager)
- [Node.js](https://nodejs.org/) >= 22.0.0 (LTS) — for building the review console
- [pnpm](https://pnpm.io/) >= 10.0.0 — for building the review console

## Installation

### As a tool (recommended)

```bash
uv tool install hmj --from git+https://github.com/STEIDd/HumanMachineJudgment#subdirectory=backend/hmj
```

### From source (development)

```bash
git clone https://github.com/STEIDd/HumanMachineJudgment.git
cd HumanMachineJudgment
pnpm install && pnpm run build
cd backend && uv sync --all-packages && cd ..
```

## CLI Commands

| Command                 | Description                                   |
| ----------------------- | --------------------------------------------- |
| `hmj init`              | Initialize a project in the current directory |
| `hmj status`            | Show project status and point counts          |
| `hmj connect claude`    | Connect HMJ to Claude Code                    |
| `hmj disconnect claude` | Remove HMJ from Claude Code                   |
| `hmj list`              | List judgment points                          |
| `hmj show <id>`         | Show details for a judgment point             |
| `hmj resolve <id>`      | Resolve a judgment point                      |
| `hmj dismiss <id>`      | Dismiss a judgment point                      |
| `hmj reopen <id>`       | Reopen a judgment point                       |
| `hmj serve`             | Start the review console (port 8457)          |
| `hmj open`              | Open the review console in a browser          |
| `hmj mcp`               | Run the MCP server (stdio transport)          |
| `hmj doctor`            | Check the project configuration               |

See [CLI Reference](docs/cli-reference.md) for full details.

## Development Commands

| Command              | Description                                           |
| -------------------- | ----------------------------------------------------- |
| `pnpm run build`     | Build all TypeScript packages                         |
| `pnpm run test`      | Run TypeScript tests                                  |
| `pnpm run lint`      | Check linting rules                                   |
| `pnpm run format`    | Check code formatting                                 |
| `pnpm run typecheck` | Run TypeScript type checking                          |
| `pnpm run validate`  | Run all checks (format, lint, typecheck, test, build) |

### Python Commands

| Command                                      | Description             |
| -------------------------------------------- | ----------------------- |
| `cd backend && uv run pytest -v`             | Run Python tests        |
| `cd backend && uv run ruff check .`          | Lint Python code        |
| `cd backend && uv run ruff format --check .` | Check Python formatting |
| `cd backend && uv run mypy .`                | Type check Python code  |

## Packages

### Python (backend/)

| Package                   | Description                                     |
| ------------------------- | ----------------------------------------------- |
| `hmj`                     | Operational runtime CLI                         |
| `judgment_core`           | Domain types, state machine, lifecycle, scoring |
| `judgment_sdk`            | Developer SDK for Judgment Points               |
| `judgment_storage_memory` | In-memory storage adapter (testing)             |
| `judgment_storage_sqlite` | SQLite storage adapter (production)             |
| `judgment_mcp`            | MCP server (protocol 2026-07-28)                |
| `judgment_langgraph`      | LangGraph interrupt adapter                     |
| `reference_server`        | FastAPI HTTP API server (reference/testing)     |

### TypeScript (packages/, apps/)

| Package                                                        | Description                                 |
| -------------------------------------------------------------- | ------------------------------------------- |
| [@human-machine-judgment/schemas](packages/judgment-schemas/)  | JSON schemas and generated TypeScript types |
| [@human-machine-judgment/review-console](apps/review-console/) | Review console web application              |

## Repository Structure

```
human-machine-judgment/
  backend/
    hmj/                   Operational runtime CLI (hmj)
    judgment_core/         Core domain logic (Python, no framework deps)
    judgment_sdk/          Developer SDK
    judgment_storage_memory/   In-memory storage (testing)
    judgment_storage_sqlite/   SQLite storage (production)
    judgment_mcp/          MCP server integration
    judgment_langgraph/    LangGraph adapter
    reference_server/      FastAPI HTTP API server (reference/testing)
  packages/
    judgment-schemas/      JSON schemas and TypeScript types
  apps/
    review-console/        Review console web application
    documentation/         Documentation site
  schemas/                 JSON Schema source files
  skills/
    technical-judgment-review/   Agent Skill for technical judgment
  evals/                   Evaluation harness and test fixtures
  docs/                    Specification and documentation
    decisions/             Architecture Decision Records
```

## Testing

```bash
pnpm run test                      # TypeScript tests (Vitest)
cd backend && uv run pytest -v     # Python tests (pytest)
cd backend && uv run pytest ../evals/ -v  # Evaluation harness
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for setup instructions, coding
standards, and the contribution process.

## Security

To report a security vulnerability, use
[GitHub Security Advisories](https://github.com/STEIDd/HumanMachineJudgment/security/advisories).
Do not use public issues for security reports. See [SECURITY.md](SECURITY.md).

## License

This project is licensed under the [Apache License 2.0](LICENSE).

See [NOTICE](NOTICE) for attribution information and
[TRADEMARKS.md](TRADEMARKS.md) for trademark guidelines.

## Citation

If you reference this work in academic or technical publications, use the
citation information in [CITATION.cff](CITATION.cff).
