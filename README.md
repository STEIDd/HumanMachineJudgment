# Human-Machine Judgment

Reference implementation of Judgment Points: durable, machine-readable
decision records for consequential choices in technical agent workflows.

## Project Status

**Phase 4 complete.** The Python backend (core runtime, SDK, storage
adapters, MCP server, LangGraph adapter, and reference HTTP API server),
React UI component library (18 components), reference web application
with thermal model example, evaluation harness (12 fixtures), and
documentation are implemented. See [ROADMAP.md](ROADMAP.md) for
phase details.

## What is a Judgment Point?

A Judgment Point is a durable, machine-readable pause in a technical
workflow where a consequential choice is surfaced, investigated, resolved
by an authorized person or an explicit delegation policy, and connected
to the work that depends on it.

A Judgment Point is not required for every action, parameter, tool call,
file edit, or routine approval. It is appropriate when a choice can
materially affect the method, result, validity, interpretation,
accountability, or intended use of technical work.

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

- **Specification**: The complete [Judgment Points specification](docs/judgment-points-specification.md)
  defining primitives, lifecycle, materiality scoring, and integration protocols.
- **JSON Schemas**: Machine-readable schemas for Judgment Points, policies,
  events, resolutions, and artifact references (JSON Schema Draft 2020-12).
- **Python backend**: Core domain logic (state machine, materiality
  scoring, policy engine, event sourcing), developer SDK, in-memory and
  SQLite storage adapters, MCP server, LangGraph adapter, and FastAPI
  reference server with 19 HTTP endpoints.
- **UI component library**: 18 React components for rendering judgment
  points, lifecycle actions, comparison views, and policy management.
- **Reference application**: Interactive web application demonstrating the
  full judgment point lifecycle and a thermal model scientific example.
- **Agent Skill**: A portable [technical-judgment-review](skills/technical-judgment-review/SKILL.md)
  skill following the Agent Skills specification.
- **Evaluation harness**: Python-based fixture suite with 12 test scenarios
  covering candidate detection, skill activation, malformed output,
  unauthorized resolution, and restart/resume behavior.
- **Documentation**: Architecture decisions, lifecycle documentation,
  materiality scoring, API reference, deployment guide, and getting
  started guide.

## What This Repository Does Not Contain

- Proprietary WEEMS source code, infrastructure, prompts, or user data
- A production-ready deployment
- Validated empirical evidence that Judgment Points improve outcomes
  (the evaluation framework is designed to investigate this question)
- External model provider API keys or credentials

## Quick Example

A Judgment Point captures a consequential technical decision:

```json
{
  "id": "jp-004",
  "projectId": "thermal-analysis-001",
  "category": "assumption",
  "question": "Should material properties be treated as constant or temperature-dependent?",
  "status": "resolved",
  "alternatives": [
    {
      "id": "constant",
      "label": "Constant properties",
      "description": "Use properties evaluated at a single reference temperature."
    },
    {
      "id": "temp-dependent",
      "label": "Temperature-dependent properties",
      "description": "Interpolate properties as a function of temperature from the source dataset."
    }
  ],
  "resolution": {
    "selectedAlternativeId": "temp-dependent",
    "rationale": "The predicted temperature range (300-850 K) crosses a region where yield strength decreases by approximately 40%.",
    "conditions": ["Use source data covering 300-900 K"],
    "validationRequirements": [
      "Compare against constant-property results and report the difference"
    ]
  },
  "affectedArtifactIds": ["cell-21", "cell-27", "plot-4", "conclusion-2"]
}
```

## Links

- [Getting Started](docs/getting-started.md)
- [Judgment Points Specification](docs/judgment-points-specification.md)
- [Architecture](docs/architecture.md)
- [API Reference](docs/api-reference.md)
- [Lifecycle](docs/lifecycle.md)
- [Materiality and Policy](docs/materiality-and-policy.md)
- [Terminology](docs/terminology.md)
- [Example Workflow](docs/example-workflow.md)

## Prerequisites

- [Python](https://www.python.org/) >= 3.12
- [uv](https://docs.astral.sh/uv/) (Python package manager)
- [Node.js](https://nodejs.org/) >= 22.0.0 (LTS)
- [pnpm](https://pnpm.io/) >= 10.0.0

## Setup

```bash
git clone https://github.com/STEIDd/HumanMachineJudgment.git
cd HumanMachineJudgment
pnpm install
pnpm run build
cd backend && uv sync --all-packages && cd ..
```

## Development Commands

| Command                     | Description                                           |
| --------------------------- | ----------------------------------------------------- |
| `pnpm run build`            | Build all packages                                    |
| `pnpm run test`             | Run all tests                                         |
| `pnpm run lint`             | Check linting rules                                   |
| `pnpm run format`           | Check code formatting                                 |
| `pnpm run typecheck`        | Run TypeScript type checking                          |
| `pnpm run validate`         | Run all checks (format, lint, typecheck, test, build) |
| `pnpm run validate:schemas` | Validate JSON schemas                                 |
| `pnpm run dev:demo`         | Start the reference demo (Vite dev server)            |
| `pnpm run dev:server`       | Start the reference API server                        |
| `pnpm run dev:docs`         | Start the documentation site                          |

## Packages

### Python (backend/)

| Package                   | Description                                     | Status      |
| ------------------------- | ----------------------------------------------- | ----------- |
| `judgment_core`           | Domain types, state machine, lifecycle, scoring | Implemented |
| `judgment_sdk`            | Developer SDK for Judgment Points               | Implemented |
| `judgment_storage_memory` | In-memory storage adapter                       | Implemented |
| `judgment_storage_sqlite` | SQLite storage adapter                          | Implemented |
| `judgment_mcp`            | MCP server (protocol 2026-07-28)                | Implemented |
| `judgment_langgraph`      | LangGraph interrupt adapter                     | Implemented |
| `reference_server`        | FastAPI HTTP API server                         | Implemented |

### TypeScript (packages/, apps/)

| Package                                                        | Description                                 | Status      |
| -------------------------------------------------------------- | ------------------------------------------- | ----------- |
| [@human-machine-judgment/schemas](packages/judgment-schemas/)  | JSON schemas and generated TypeScript types | Implemented |
| [@human-machine-judgment/ui](packages/judgment-ui/)            | 18 React components for Judgment Point UI   | Implemented |
| [@human-machine-judgment/reference-demo](apps/reference-demo/) | Reference web application                   | Implemented |

## Repository Structure

```
human-machine-judgment/
  backend/
    judgment_core/         Core domain logic (Python, no framework deps)
    judgment_sdk/          Developer SDK
    judgment_storage_memory/   In-memory storage
    judgment_storage_sqlite/   SQLite storage
    judgment_mcp/          MCP server integration
    judgment_langgraph/    LangGraph adapter
    reference_server/      FastAPI HTTP API server
  packages/
    judgment-schemas/      JSON schemas and TypeScript types
    judgment-ui/           React UI component library (18 components)
  apps/
    reference-demo/        Vite + React reference interface
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

The project uses [Vitest](https://vitest.dev/) for TypeScript tests
and [pytest](https://docs.pytest.org/) for Python tests. Playwright
end-to-end tests are scaffolded in `apps/reference-demo/e2e/`.

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

## Current Limitations

- The materiality scoring thresholds are an initial hypothesis and have
  not been validated through empirical study.
- The reference server is intentionally unauthenticated and uses
  `allow_origins=["*"]` for CORS. It is not suitable for production
  deployment without additional security configuration.
- The MCP integration targets protocol version 2026-07-28 but has not
  been tested with the MCP Inspector.
- Playwright end-to-end tests are scaffolded but require browser
  binaries to execute (`npx playwright install`).
- No external model provider integration exists. Model integrations are
  designed to be optional and provider-neutral.
