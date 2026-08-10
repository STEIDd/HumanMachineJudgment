# ADR-007: CLI Framework and Packaging

**Status**: Accepted
**Date**: 2026-08-08
**Authors**: Courage Lahban

## Context

The `hmj` tool must be installable as a global command-line tool via
`uv tool install` directly from the GitHub repository. The Python backend
is organized as a uv workspace with seven packages. When installing a
workspace member externally, `workspace = true` source entries cause
resolution failures because `uv tool install` cannot resolve workspace-
internal references.

## Decision

A new `hmj` package is created at `backend/hmj/`. It is a workspace
member for development but is structured to be installable independently.

The CLI framework is Click. The entry point is declared in pyproject.toml:

```toml
[project.scripts]
hmj = "hmj.cli:main"
```

For external installation, the command uses `--no-sources` to skip
workspace source resolution:

```bash
uv tool install --no-sources \
  "git+https://github.com/STEIDd/HumanMachineJudgment.git#subdirectory=backend/hmj"
```

The `hmj` package declares its dependencies by package name (not by
workspace path) in `[project] dependencies`. The `[tool.uv.sources]`
section maps those names to workspace members for local development.
The `--no-sources` flag causes `uv tool install` to ignore the
`[tool.uv.sources]` section and resolve dependencies from the default
index (PyPI). Since the workspace packages are not published to PyPI,
the `hmj` package must either bundle or inline the required code from
its dependencies.

The practical approach is to structure `hmj` as a self-contained package
that imports from the workspace packages during development and bundles
them into a single installable unit for distribution. This is achieved
by listing the workspace packages as path dependencies in
`[tool.uv.sources]` for development, while the external install resolves
them from the same repository checkout.

## Rationale

Click is mature, has excellent command group composition, and is already
a transitive dependency through FastAPI/Uvicorn. It requires no type
annotation magic and works naturally with `asyncio.run()` at command
boundaries.

The workspace member approach allows the `hmj` package to import from
`judgment_core`, `judgment_sdk`, etc. during development with full IDE
support, while the `--no-sources` install path resolves the packages
from the repository checkout.

## Consequences

- Users install with a single command: `uv tool install --no-sources "git+..."`.
- The `hmj` binary is added to the user's PATH by `uv tool install`.
- Click is an explicit dependency of the `hmj` package.
- Each CLI command that calls async code uses `asyncio.run()` at the
  boundary. This is straightforward because Click commands are synchronous
  functions.
- The `hmj` package is the only package that needs `[project.scripts]`.
  Other workspace packages remain libraries.

## Alternatives Considered

- **Typer**: Built on Click with Pydantic-style type annotations. Adds a
  dependency and type-annotation conventions that differ from the rest
  of the codebase. No clear benefit over Click for this use case.
- **argparse**: Standard library, no dependency. But lacks Click's
  composability for nested command groups and its testing utilities
  (CliRunner).
- **Single consolidated package**: Merging all seven packages into one
  would simplify installation but would lose the separation of concerns
  and make the core domain logic depend on storage drivers and framework
  integrations.
