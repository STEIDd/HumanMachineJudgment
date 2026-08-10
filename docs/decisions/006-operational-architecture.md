# ADR-006: Operational Architecture

**Status**: Accepted
**Date**: 2026-08-08
**Authors**: Courage Lahban

## Context

The v0.1.0 reference implementation uses in-memory storage by default,
has no CLI, and runs as a standalone HTTP server with a browser demo. To
become an operational tool, the system needs a clear runtime architecture
where multiple access paths (CLI, hooks, MCP server, review console)
converge on shared durable state.

## Decision

The operational architecture follows a gateway pattern:

```
Claude Code agent
  ├── PreToolUse hook → hmj hook pre-tool-use → detection pipeline
  ├── MCP server (stdio) → hmj mcp → agent-facing tools
  └── Stop hook → hmj hook stop → finalize candidates

Human operator
  ├── hmj CLI → direct commands (resolve, dismiss, status, etc.)
  └── hmj serve → review console (browser)

All paths → JudgmentClient → SqliteStorage → .judgment/judgment.db
```

Every access path resolves the project by walking parent directories
from the current working directory to find `.judgment/project.toml`.
Every access path opens the same SQLite database at
`.judgment/judgment.db` with WAL mode enabled.

The `hmj` binary is the single entry point for all operations:

- `hmj init` — initialize a project
- `hmj hook <event>` — process a Claude Code hook event
- `hmj mcp` — run the MCP server (stdio transport)
- `hmj serve` — launch the review console
- `hmj status`, `hmj list`, `hmj show`, `hmj resolve`, etc. — CLI commands

## Rationale

A single entry point (`hmj`) simplifies installation, reduces PATH
configuration, and ensures consistent project discovery across all access
paths. SQLite with WAL mode supports concurrent readers and writers,
which is necessary because hooks, the MCP server, the CLI, and the
review console may all access the database simultaneously.

The gateway pattern keeps each access path thin: hooks translate Claude
Code events into detection pipeline calls, the MCP server translates MCP
tool calls into SDK operations, and the CLI translates user commands into
SDK operations. The JudgmentClient and SqliteStorage handle all domain
logic and persistence.

## Consequences

- All access paths depend on the `hmj` package, which depends on
  `judgment-core`, `judgment-sdk`, `judgment-storage-sqlite`, and
  `judgment-mcp`.
- The SQLite database must be configured with WAL mode, a busy timeout
  (5000ms), and synchronous=NORMAL for reliable concurrent access.
- Project discovery (walking parent directories) means the current
  working directory must be within the project tree. This is naturally
  satisfied by Claude Code hooks (which run in the project directory)
  and by CLI commands (which the user runs from the project directory).
- The in-memory storage adapter remains available for testing but is not
  used in any production access path.

## Alternatives Considered

- **Client-server architecture with a persistent daemon**: Would provide
  lower-latency access but adds process management complexity (start,
  stop, health checks, crash recovery). SQLite file-level concurrency
  is sufficient for the expected workload.
- **Separate binaries per access path**: Would complicate installation
  and version management. A single binary with subcommands is simpler.
- **PostgreSQL for shared state**: Over-engineered for a single-machine
  tool. SQLite is zero-configuration and sufficient for the expected
  data volumes.
