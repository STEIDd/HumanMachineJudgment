# Human-Machine Judgment

Reference implementation of Judgment Points: durable, machine-readable
decision records for consequential choices in technical agent workflows.

## Project Status

**Phase 2: Core runtime, storage, and API.**
The specification, schemas, package structure, core domain logic,
in-memory storage adapter, developer SDK, and reference HTTP API server
are implemented. See [ROADMAP.md](ROADMAP.md) for planned phases.

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
- **Core runtime**: TypeScript packages for the core domain logic
  (state machine, materiality scoring, policy engine, event sourcing),
  developer SDK, and in-memory storage adapter.
- **Reference server**: Fastify HTTP API server with full lifecycle,
  policy, event, and artifact endpoints.
- **Package skeletons**: TypeScript packages for the SQLite storage adapter,
  MCP integration, LangGraph adapter, and React components.
- **Agent Skill**: A portable [technical-judgment-review](skills/technical-judgment-review/SKILL.md)
  skill following the Agent Skills specification.
- **Evaluation framework**: Fixture structure for testing detection quality,
  interruption burden, dependency tracing, and workflow comparison.
- **Documentation**: Architecture decisions, lifecycle documentation,
  materiality scoring, integration guides, and a terminology reference.

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

- [Judgment Points Specification](docs/judgment-points-specification.md)
- [Architecture](docs/architecture.md)
- [Lifecycle](docs/lifecycle.md)
- [Materiality and Policy](docs/materiality-and-policy.md)
- [Terminology](docs/terminology.md)
- [Example Workflow](docs/example-workflow.md)

## Prerequisites

- [Node.js](https://nodejs.org/) >= 22.0.0 (LTS)
- [pnpm](https://pnpm.io/) >= 10.0.0

## Setup

```bash
git clone https://github.com/STEIDd/HumanMachineJudgment.git
cd HumanMachineJudgment
pnpm install
pnpm run build
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

| Package                                                                     | Description                                                        | Status      |
| --------------------------------------------------------------------------- | ------------------------------------------------------------------ | ----------- |
| [@human-machine-judgment/core](packages/judgment-core/)                     | Domain types, state machine, lifecycle, scoring, policy evaluation | Implemented |
| [@human-machine-judgment/schemas](packages/judgment-schemas/)               | JSON schemas and generated TypeScript types                        | Implemented |
| [@human-machine-judgment/sdk](packages/judgment-sdk/)                       | Programmatic API for Judgment Points                               | Implemented |
| [@human-machine-judgment/storage-memory](packages/judgment-storage-memory/) | In-memory storage adapter                                          | Implemented |
| [@human-machine-judgment/storage-sqlite](packages/judgment-storage-sqlite/) | SQLite storage adapter                                             | Skeleton    |
| [@human-machine-judgment/mcp](packages/judgment-mcp/)                       | MCP server (protocol 2026-07-28)                                   | Skeleton    |
| [@human-machine-judgment/langgraph](packages/judgment-langgraph/)           | LangGraph interrupt adapter                                        | Skeleton    |
| [@human-machine-judgment/ui](packages/judgment-ui/)                         | React components for Judgment Point UI                             | Skeleton    |

## Repository Structure

```
human-machine-judgment/
  apps/
    reference-demo/        Vite + React reference interface
    reference-server/      Fastify API server
    documentation/         Documentation site
  packages/
    judgment-core/         Core domain logic (no framework dependencies)
    judgment-schemas/      JSON schemas and TypeScript types
    judgment-sdk/          Programmatic API
    judgment-ui/           React components
    judgment-mcp/          MCP server integration
    judgment-langgraph/    LangGraph adapter
    judgment-storage-memory/   In-memory storage
    judgment-storage-sqlite/   SQLite storage
  schemas/                 JSON Schema source files
  skills/
    technical-judgment-review/   Agent Skill for technical judgment
  examples/
    reduced-order-thermal-model/ Reference scientific workflow
  evals/
    fixtures/              Evaluation test fixtures
    trigger-detection/     Detection quality tests
    interruption-burden/   False interruption tests
    dependency-tracing/    Dependency tracking tests
    workflow-comparison/   Workflow comparison tests
  docs/                    Specification and documentation
    decisions/             Architecture Decision Records
```

## Testing

```bash
pnpm run test           # Run all tests
pnpm run test:unit      # Run unit tests only
```

The project uses [Vitest](https://vitest.dev/) for unit and integration
tests. End-to-end tests using Playwright will be added in a later phase.

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

- The SQLite storage adapter, MCP server, LangGraph adapter, and React
  UI components are not yet implemented (skeleton code only).
- The materiality scoring thresholds are an initial hypothesis and have
  not been validated through empirical study.
- The evaluation framework defines fixture structures but does not yet
  contain executable evaluation harnesses.
- The MCP integration targets protocol version 2026-07-28 but has not been
  tested with the MCP Inspector.
- The reference interface displays placeholder content.
- No external model provider integration exists. Model integrations are
  designed to be optional and provider-neutral.
