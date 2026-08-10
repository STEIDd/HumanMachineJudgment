# ADR-005: Claude Code Integration Mechanism

**Status**: Accepted
**Date**: 2026-08-08
**Authors**: Courage Lahban

## Context

The Judgment Points system must integrate with Claude Code so that
consequential technical choices are automatically detected during agent
workflows. Claude Code provides three extension mechanisms relevant to
this integration: hooks, MCP servers, and Agent Skills.

Hooks are shell commands that execute before or after specific Claude Code
events (tool calls, session start, session stop). They receive JSON on
stdin and return JSON on stdout. MCP servers provide tools and resources
that the agent can call directly. Agent Skills provide structured prompts
that guide agent behavior.

## Decision

The integration uses all three mechanisms, each serving a distinct role:

**Hooks** (PreToolUse, PostToolUse, Stop) provide the detection and
enforcement pathway:

- **PreToolUse** intercepts every tool call, runs the detection pipeline,
  and returns `hookSpecificOutput` with `permissionDecision: "deny"` if a
  judgment point is needed. Includes decision deduplication to reuse
  existing resolutions and avoid duplicate candidates.
- **PostToolUse** fires after file-modifying tools (Edit, Write,
  NotebookEdit) to track artifact modifications and detect staleness
  in previously resolved judgment points via fingerprint comparison.
- **Stop** enforces session-scoped judgment requirements. Blocks session
  termination when unresolved `pause` or `require-investigation` level
  points remain, with `stop_hook_active` loop prevention.

All hooks call `hmj hook <event-type>`, which reads JSON from stdin
and writes JSON to stdout.

**MCP server** provides the agent-facing tools. The agent calls
`judgment.propose`, `judgment.add_alternative`, `judgment.resolve`
(subject to authority checks), `judgment.link_artifact`, and other tools
to interact with judgment points during its workflow. The MCP server runs
as a stdio subprocess launched by Claude Code.

**Agent Skill** provides behavioral guidance. The existing
`technical-judgment-review` skill in `skills/` tells the agent how to
identify consequential choices and how to use the MCP tools.

The `hmj connect claude` command writes both `.mcp.json` (MCP server
configuration) and `.claude/settings.json` (hook configuration) to
register all three mechanisms.

## Rationale

Hooks provide automatic detection without requiring the agent to
voluntarily call a detection tool. The agent cannot bypass hook-based
detection. MCP tools provide a structured interface for the agent to
interact with judgment points when it chooses to. The Agent Skill provides
soft guidance that the agent can follow or ignore, but hooks enforce the
hard requirements.

This layered approach ensures that:

1. Consequential choices are detected even if the agent ignores the skill.
2. The agent can proactively propose judgment points through MCP tools.
3. Human authority is enforced server-side in the MCP server, not by
   trusting the agent to self-regulate.

## Consequences

- The `hmj` CLI binary must be installed and on `PATH` for hooks to work.
- Hook latency adds overhead to every tool call. The detection pipeline
  must be fast (target: <100ms per invocation).
- The hook process opens and closes the SQLite database on each invocation.
  WAL mode is required for concurrent access.
- `hmj connect claude` and `hmj disconnect claude` manage the configuration
  files. Manual edits to `.mcp.json` or `.claude/settings.json` are
  supported but not required.

## Alternatives Considered

- **MCP-only integration**: The agent would call a detection tool before
  each action. This relies on the agent volunteering to check, which
  cannot be enforced. Hooks provide mandatory interception.
- **HTTP webhook server**: Would require a persistent background process.
  The command-based hook approach is simpler and requires no daemon
  management.
- **IDE extension**: Would be specific to VS Code and would not work
  with Claude Code CLI. The hook mechanism works in all Claude Code
  environments.
