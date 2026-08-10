# CLI Reference

Complete reference for the `hmj` command-line tool.

---

## Global Options

```
hmj --version    Show version and exit
hmj --help       Show help and exit
```

---

## Project Commands

### `hmj init`

Initialize a judgment project in the current directory.

```bash
hmj init [--name NAME]
```

| Option         | Description                               |
| -------------- | ----------------------------------------- |
| `--name`, `-n` | Project name (defaults to directory name) |

Creates a `.judgment/` directory containing `project.toml` (UUID-based
project ID), `policy.yaml` (empty default), `judgment.db` (SQLite), and
`.gitignore`.

### `hmj status`

Show judgment point status for the current project.

```bash
hmj status
```

Displays the project name and counts of judgment points by status.

### `hmj doctor`

Check HMJ installation and project health.

```bash
hmj doctor
```

Runs comprehensive health checks with PASS/FAIL/WARN status:

- hmj binary and version
- Project root and `project.toml` validity
- SQLite database accessibility and WAL mode
- Policy file presence
- Claude Code binary detection
- `.mcp.json` MCP server configuration
- `.claude/settings.json` hook configuration
- Review console static assets (packaged or dev build)

---

## Claude Code Integration

### `hmj connect claude`

Register HMJ hooks and MCP server with Claude Code.

```bash
hmj connect claude
```

Writes:

- `.mcp.json` — MCP server entry (`hmj mcp` via stdio)
- `.claude/settings.json` — PreToolUse, PostToolUse, and Stop hook entries

### `hmj disconnect claude`

Remove HMJ entries from Claude Code configuration.

```bash
hmj disconnect claude
```

Removes HMJ entries from `.mcp.json` and `.claude/settings.json`
without affecting other entries.

---

## Hook Processing

### `hmj hook`

Process a Claude Code hook event. Reads JSON from stdin, writes JSON
to stdout.

```bash
hmj hook <event-type>
```

| Argument     | Description                                              |
| ------------ | -------------------------------------------------------- |
| `event-type` | Hook event type: `pre-tool-use`, `post-tool-use`, `stop` |

**Supported event types:**

- `pre-tool-use` — Detection pipeline. Blocks dangerous tool calls and
  creates judgment point candidates. Supports decision deduplication and
  resolution reuse.
- `post-tool-use` — Staleness tracking. Checks whether file edits
  invalidate existing resolutions by comparing artifact fingerprints.
  Only fires for file-modifying tools (Edit, Write, NotebookEdit).
- `stop` — Session enforcement. Blocks session termination when
  unresolved judgment points require attention. Uses `stop_hook_active`
  flag to prevent infinite loops.

This command is called automatically by Claude Code via the hook
configuration. It is not intended for manual invocation.

---

## MCP Server

### `hmj mcp`

Run the MCP server using stdio transport.

```bash
hmj mcp
```

Launched automatically by Claude Code via the `.mcp.json` configuration.
Provides judgment tools to the agent: propose, assess materiality, add
alternative, resolve, dismiss, reopen, link artifact, request comparison.

---

## Review Console

### `hmj serve`

Launch the judgment review console web application.

```bash
hmj serve [--port PORT]
```

| Option   | Default | Description                 |
| -------- | ------- | --------------------------- |
| `--port` | 8457    | Port for the review console |

Serves the review console UI at `http://127.0.0.1:PORT` with the
project's judgment API.

### `hmj open`

Open the review console in a browser and start serving.

```bash
hmj open [--port PORT]
```

Same as `hmj serve` but also opens the URL in the default browser.

---

## Judgment Point Operations

### `hmj list`

List judgment points in the current project.

```bash
hmj list [--status STATUS] [--category CATEGORY]
```

| Option       | Description        |
| ------------ | ------------------ |
| `--status`   | Filter by status   |
| `--category` | Filter by category |

### `hmj show`

Show details of a judgment point.

```bash
hmj show <judgment-id>
```

Displays the point's question, status, category, alternatives,
resolution (if any), and materiality score.

### `hmj resolve`

Resolve a judgment point.

```bash
hmj resolve <judgment-id> --alternative ALT_ID --rationale "reason"
```

| Option                | Required | Description                  |
| --------------------- | -------- | ---------------------------- |
| `--alternative`, `-a` | Yes      | Selected alternative ID      |
| `--rationale`, `-r`   | Yes      | Rationale for the resolution |

### `hmj dismiss`

Dismiss a judgment point.

```bash
hmj dismiss <judgment-id> --reason "reason"
```

| Option           | Required | Description          |
| ---------------- | -------- | -------------------- |
| `--reason`, `-r` | Yes      | Reason for dismissal |

### `hmj reopen`

Reopen a resolved or dismissed judgment point.

```bash
hmj reopen <judgment-id> --reason "reason"
```

| Option           | Required | Description          |
| ---------------- | -------- | -------------------- |
| `--reason`, `-r` | Yes      | Reason for reopening |

### `hmj investigate`

Mark a judgment point for investigation.

```bash
hmj investigate <judgment-id>
```

Transitions the point to `investigating` status.

### `hmj review`

Start an interactive review of a judgment point.

```bash
hmj review <judgment-id>
```

Displays point details and prompts for action (resolve, dismiss, etc.).

---

## Policy Commands

### `hmj policy show`

Show the current project policy.

```bash
hmj policy show
```

Reads and displays the contents of `.judgment/policy.yaml`.

---

## Project File Structure

After `hmj init`, the `.judgment/` directory contains:

```
.judgment/
  project.toml     # Project ID and name
  policy.yaml      # Judgment policies
  judgment.db      # SQLite database
  .gitignore       # Tracks config, ignores DB
```

The `project.toml` file is tracked in version control so all
collaborators share the same project ID. The `judgment.db` file is
gitignored because each developer's local state may differ.

---

## Environment

HMJ discovers the project by walking parent directories from the
current working directory, looking for `.judgment/project.toml`. This
is the same pattern used by git, npm, and cargo.

All commands that operate on a project (everything except `init` and
`--version`) require an initialized project in the current directory
or a parent directory.
