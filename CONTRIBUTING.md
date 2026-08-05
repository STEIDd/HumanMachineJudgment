# Contributing to Human-Machine Judgment

Thank you for your interest in contributing to this project. This document explains how to participate effectively.

## Project Scope

Human-Machine Judgment is a reference implementation of Judgment Points for technical agent workflows. It provides schemas, runtime libraries, storage adapters, evaluation tooling, and reference applications that demonstrate how judgment points work in practice. Contributions should align with this scope.

## Current Maturity

This project is in early research and development, prior to a 1.0 release. APIs, schemas, and architectural decisions may change. Contributors should expect that interfaces are not yet stable and that breaking changes will occur during this period.

## Code of Conduct

All participants are expected to follow the [Code of Conduct](CODE_OF_CONDUCT.md). Read it before contributing.

## Security

Do not report security vulnerabilities through public GitHub issues. Follow the process described in [SECURITY.md](SECURITY.md) instead.

## Prerequisites

To work on this project, you need:

- **Node.js** >= 22.0.0
- **pnpm** >= 10.0.0

Verify your environment:

```sh
node --version   # should print v22.x.x or later
pnpm --version   # should print 10.x.x or later
```

## Local Setup

```sh
git clone https://github.com/STEIDd/HumanMachineJudgment.git
cd HumanMachineJudgment
pnpm install
pnpm run build
```

## Development Commands

All commands are run from the repository root.

| Command                     | Purpose                                                  |
| --------------------------- | -------------------------------------------------------- |
| `pnpm run build`            | Build all packages and applications                      |
| `pnpm run test`             | Run all tests                                            |
| `pnpm run test:unit`        | Run unit tests only                                      |
| `pnpm run test:integration` | Run integration tests only                               |
| `pnpm run lint`             | Check for linting errors                                 |
| `pnpm run lint:fix`         | Automatically fix linting errors                         |
| `pnpm run format`           | Check formatting with Prettier                           |
| `pnpm run format:fix`       | Automatically fix formatting                             |
| `pnpm run typecheck`        | Run TypeScript type checking                             |
| `pnpm run validate`         | Run format, lint, typecheck, test, and build in sequence |
| `pnpm run clean`            | Remove build artifacts                                   |

Run `pnpm run validate` before submitting a pull request. This command runs all checks in the same order that CI uses.

## Repository Architecture

This is a monorepo managed with pnpm workspaces. The workspace roots are defined in `pnpm-workspace.yaml`.

```
packages/           Publishable libraries
  judgment-core/      Core runtime logic
  judgment-schemas/   JSON Schema definitions and validation
  judgment-sdk/       Developer SDK
  judgment-mcp/       Model Context Protocol server
  judgment-langgraph/ LangGraph adapter
  judgment-storage-memory/   In-memory storage adapter
  judgment-storage-sqlite/   SQLite storage adapter
  judgment-ui/        UI components

apps/               Runnable applications
  reference-demo/     Interactive reference demonstration
  reference-server/   Reference server implementation
  documentation/      Documentation site

schemas/            Standalone schema files and validation fixtures

skills/             Agent Skill definitions
  technical-judgment-review/  Technical judgment review skill

evals/              Evaluation harness and fixtures
  fixtures/           Test fixtures for evaluation
  interruption-burden/ Interruption burden evaluation
  trigger-detection/  Trigger detection evaluation
  workflow-comparison/ Workflow comparison evaluation

docs/               Prose documentation source
  decisions/          Architecture decision records

examples/           Example workflows and configurations
  reduced-order-thermal-model/  Reference scientific workflow
```

## Branching

Create branches from `main` using one of these prefixes:

- `feature/` for new functionality
- `fix/` for bug fixes
- `docs/` for documentation changes
- `refactor/` for code restructuring without behavior changes

Examples: `feature/add-sqlite-storage`, `fix/schema-validation-error`, `docs/update-contributing-guide`.

## Commits

Follow the conventional commits format:

```
<type>(<scope>): <description>

[optional body]

[optional footer(s)]
```

Common types: `feat`, `fix`, `docs`, `refactor`, `test`, `chore`, `build`, `ci`.

The scope should identify the affected package or area, such as `judgment-core`, `schemas`, or `evals`.

Examples:

```
feat(judgment-core): add resolution status tracking
fix(judgment-schemas): correct required fields in category schema
docs(contributing): clarify branch naming conventions
test(evals): add fixture for multi-step workflow
```

Keep the subject line under 72 characters. Use the body to explain what changed and why, not how.

## Pull Request Process

1. Create a branch following the naming conventions above.
2. Make your changes, keeping each pull request focused on a single concern.
3. Run `pnpm run validate` and confirm that all checks pass.
4. Push your branch and open a pull request against `main`.
5. Fill out the pull request template completely.
6. Wait for CI to pass and for at least one maintainer review.
7. Address review feedback by pushing additional commits to the same branch.
8. A maintainer will merge the pull request once it is approved and all checks pass.

Do not force-push to a branch that is under review unless asked to do so.

## Required Checks

Every pull request must pass the following before it can be merged:

- **Formatting.** `pnpm run format` must report no issues.
- **Linting.** `pnpm run lint` must report no errors.
- **Type checking.** `pnpm run typecheck` must succeed.
- **Tests.** `pnpm run test` must pass with no failures.
- **Build.** `pnpm run build` must complete without errors.

## Test Expectations

- Use [Vitest](https://vitest.dev/) for unit and integration tests.
- Use [Playwright](https://playwright.dev/) for end-to-end tests.
- New functionality should include tests. Bug fixes should include a test that reproduces the bug.
- Place unit tests adjacent to the code they test, using the `.test.ts` or `.spec.ts` suffix.
- Place integration tests in a `__tests__` directory within the relevant package.
- Test file names should clearly describe what they test.

## Documentation Style

Write in direct, professional prose. Avoid promotional language, superlatives, and filler words. Do not use em dashes. Use commas, periods, semicolons, or separate sentences instead.

State what things are and what they do. Do not describe them as "powerful," "elegant," "seamless," or similar.

Use second person ("you") when addressing the reader in guides. Use third person when describing system behavior.

## Accessibility Expectations

All user-facing components and interfaces must meet the following standards:

- **axe-core checks.** Run automated accessibility checks using axe-core. All violations must be resolved before merging.
- **Keyboard navigation.** All interactive elements must be reachable and operable with keyboard input alone.
- **Screen reader support.** Use semantic HTML, appropriate ARIA attributes, and meaningful labels. Test with at least one screen reader.

Include accessibility tests in your pull request when modifying UI components.

## How to Add Common Items

### A Judgment Category

1. Define the category in a JSON Schema file under `schemas/`.
2. Add a corresponding TypeScript type in `packages/judgment-schemas/`.
3. Include validation tests for valid and invalid category documents.
4. Update the schema documentation in `docs/`.

### A Policy Rule

1. Add the rule definition in the appropriate package under `packages/`.
2. Include the rule's logic in the core evaluation pipeline if applicable.
3. Write tests covering the rule's acceptance and rejection conditions.
4. Document the rule's purpose and expected behavior.

### A Schema Field

1. Update the relevant JSON Schema file in `schemas/`.
2. Update the corresponding TypeScript type in `packages/judgment-schemas/`.
3. Run `pnpm run validate:schemas` to confirm the schema is valid.
4. Add tests for serialization and deserialization of the new field.
5. Update any affected documentation.

### An MCP Tool or Resource

1. Add the tool or resource definition in `packages/judgment-mcp/`.
2. Follow the Model Context Protocol specification for tool and resource structure.
3. Include tests that verify the tool's inputs, outputs, and error handling.
4. Document the tool's purpose, parameters, and return values.

### An Agent Skill Reference

1. Create a new directory under `skills/` with a descriptive name.
2. Include a skill definition file following the existing structure in `skills/`.
3. Add any supporting configuration or prompt files.
4. Document the skill's intended use case and expected behavior.

### An Example Workflow

1. Add the workflow under `examples/` in a clearly named directory.
2. Include a README within the directory that explains the workflow's purpose, setup, and expected outcome.
3. Ensure the workflow can be run with the instructions provided.

### An Evaluation Fixture

1. Add the fixture under `evals/fixtures/` or in the appropriate evaluation subdirectory.
2. Include both the input data and the expected output.
3. Write or update tests that exercise the fixture.
4. Document what the fixture tests and any edge cases it covers.

## Reporting a Conceptual Disagreement

If you disagree with a design decision, specification choice, or conceptual direction, open an issue using the **Conceptual Feedback** template. Describe the part of the specification or design you are addressing, explain your concern, and propose an alternative if you have one.

Conceptual disagreements are treated as technical discussions. They are evaluated on their reasoning and evidence, not on seniority or volume. See [GOVERNANCE.md](GOVERNANCE.md) for how specification decisions are made.

## Backward Compatibility

Once a schema version or API is published in a release, breaking changes require:

1. A deprecation notice in the current version.
2. A migration path documented for users of the old interface.
3. A new major version if the change cannot be made backward-compatible.
4. A changeset entry that clearly describes the breaking change.

During the pre-1.0 period, breaking changes may occur in minor versions, but they must still be documented in the changelog with migration guidance.

## Release and Versioning

This project uses [changesets](https://github.com/changesets/changesets) for release management.

When your pull request includes changes that should appear in the changelog or affect a package version, add a changeset:

```sh
pnpm changeset
```

Follow the prompts to select the affected packages and describe the change. Commit the generated changeset file with your pull request.

Versioning follows [Semantic Versioning](https://semver.org/):

- **Patch** (0.1.x): Bug fixes and minor corrections.
- **Minor** (0.x.0): New features, non-breaking additions.
- **Major** (x.0.0): Breaking changes (after 1.0 is reached).

Maintainers are responsible for publishing releases.

## Licensing

This project is licensed under [Apache-2.0](LICENSE).

By submitting a contribution, you certify that you have the right to submit it under this license and that you agree to the [Developer Certificate of Origin](https://developercertificate.org/) (DCO). The DCO is a lightweight attestation that you wrote or have the right to submit the code you are contributing. You are not required to sign a Contributor License Agreement.
