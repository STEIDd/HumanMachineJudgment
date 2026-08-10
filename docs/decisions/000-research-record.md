# Research Record

**Date**: 2026-08-04
**Purpose**: Document the current versions and specifications of external
technologies used by this project, verified before implementation began.

## Model Context Protocol (MCP)

| Item                        | Value                                                      | Verified Date |
| --------------------------- | ---------------------------------------------------------- | ------------- |
| Protocol version            | 2026-07-28                                                 | 2026-08-04    |
| Previous protocol version   | 2025-11-25                                                 | 2026-08-04    |
| TypeScript SDK version      | v2.0.0                                                     | 2026-08-04    |
| SDK package structure       | Split: @modelcontextprotocol/server, /client, /core, /node | 2026-08-04    |
| Legacy SDK                  | @modelcontextprotocol/sdk v1.x (maintenance mode)          | 2026-08-04    |
| Sampling status             | Deprecated (12-month removal window from 2026-07-28)       | 2026-08-04    |
| Roots status                | Deprecated (12-month removal window)                       | 2026-08-04    |
| Logging status              | Deprecated (migrate to stderr or OpenTelemetry)            | 2026-08-04    |
| MRTR / input-required       | Active (new in 2026-07-28, SEP-2322)                       | 2026-08-04    |
| Elicitation mechanism       | Via MRTR input-required (old elicitation/create removed)   | 2026-08-04    |
| Subscription mechanism      | subscriptions/listen (replaces resources/subscribe)        | 2026-08-04    |
| Authentication model        | OAuth 2.1 resource servers + RFC 9728 + RFC 8707           | 2026-08-04    |
| Dynamic Client Registration | Deprecated in favor of Client ID Metadata Documents        | 2026-08-04    |
| JSON Schema support         | Full Draft 2020-12 for inputSchema and outputSchema        | 2026-08-04    |

**Sources**:

- MCP Specification 2026-07-28: https://modelcontextprotocol.io/specification/2026-07-28
- MCP Changelog: https://modelcontextprotocol.io/specification/2026-07-28/changelog
- TypeScript SDK v2.0.0: https://github.com/modelcontextprotocol/typescript-sdk/releases
- @modelcontextprotocol/server on npm: https://www.npmjs.com/package/@modelcontextprotocol/server

## Agent Skills Specification

| Item                         | Value                                                               | Verified Date |
| ---------------------------- | ------------------------------------------------------------------- | ------------- |
| Specification URL            | https://agentskills.io/specification                                | 2026-08-04    |
| Initial introduction         | 2025-10-16 (by Anthropic)                                           | 2026-08-04    |
| Open standard publication    | 2025-12-18                                                          | 2026-08-04    |
| Platform adoption            | 26+ platforms (Claude Code, Codex CLI, Gemini CLI, Cursor, VS Code) | 2026-08-04    |
| Core file                    | SKILL.md (YAML frontmatter + Markdown body)                         | 2026-08-04    |
| Loading model                | Three-tier progressive: Discovery, Activation, Reference            | 2026-08-04    |
| Recommended instruction size | Under 5,000 tokens                                                  | 2026-08-04    |

**Sources**:

- Agent Skills Specification: https://agentskills.io/specification
- Anthropic Skills Repository: https://github.com/anthropics/skills

## LangGraph

| Item                   | Value                                        | Verified Date |
| ---------------------- | -------------------------------------------- | ------------- |
| Python package version | 1.2.10                                       | 2026-08-04    |
| JS/TS package version  | 1.4.8 (@langchain/langgraph)                 | 2026-08-04    |
| JS/TS SDK version      | 1.9.16 (@langchain/langgraph-sdk)            | 2026-08-04    |
| GA release             | October 2025 (both Python and JS/TS)         | 2026-08-04    |
| Interrupt mechanism    | interrupt() function + Command(resume=value) | 2026-08-04    |
| Checkpoint persistence | MemorySaver, SqliteSaver, PostgresSaver      | 2026-08-04    |
| State preservation     | Full state snapshot at each superstep        | 2026-08-04    |
| Thread model           | thread_id-based, same ID required for resume | 2026-08-04    |

**Sources**:

- LangGraph on PyPI: https://pypi.org/project/langgraph/
- @langchain/langgraph on npm: https://www.npmjs.com/package/@langchain/langgraph
- LangGraph Interrupts Documentation: https://docs.langchain.com/oss/python/langgraph/interrupts
- LangGraph Persistence Documentation: https://docs.langchain.com/oss/python/langgraph/persistence

## JSON Schema

| Item            | Value                                        | Verified Date |
| --------------- | -------------------------------------------- | ------------- |
| Target draft    | Draft 2020-12                                | 2026-08-04    |
| Meta-schema URI | https://json-schema.org/draft/2020-12/schema | 2026-08-04    |

**Sources**:

- JSON Schema Draft 2020-12: https://json-schema.org/draft/2020-12/json-schema-core

## GitHub Actions and Repository Security

| Item                                      | Value                                                   | Verified Date |
| ----------------------------------------- | ------------------------------------------------------- | ------------- |
| Action pinning recommendation             | Full-length commit SHAs with version comments           | 2026-08-04    |
| Dependabot support for SHA-pinned actions | Supported (parses version comment for upgrades)         | 2026-08-04    |
| CodeQL setup mode used                    | Advanced (custom workflow file)                         | 2026-08-04    |
| CodeQL query suite                        | security-extended                                       | 2026-08-04    |
| Secret scanning                           | Configured via repository settings                      | 2026-08-04    |
| Workflow lockfile feature                 | Public preview expected within 3-6 months of March 2026 | 2026-08-04    |

**Sources**:

- GitHub Actions 2026 Security Roadmap: https://github.blog/news-insights/product-news/whats-coming-to-our-github-actions-2026-security-roadmap/
- GitHub Actions SHA Pinning: https://github.blog/changelog/2025-08-15-github-actions-policy-now-supports-blocking-and-sha-pinning-actions/
- CodeQL Documentation: https://docs.github.com/en/code-security/code-scanning/enabling-code-scanning/configuring-default-setup-for-code-scanning

## Node.js and Tooling

| Item               | Value                                                         | Verified Date |
| ------------------ | ------------------------------------------------------------- | ------------- |
| Node.js version    | 22.17.1 (LTS)                                                 | 2026-08-04    |
| pnpm version       | 10.33.0                                                       | 2026-08-04    |
| TypeScript version | 6.0.3 (TS 7.0 available but unsupported by typescript-eslint) | 2026-08-04    |
| Vitest version     | 4.1.10                                                        | 2026-08-04    |
| ESLint version     | 10.8.0                                                        | 2026-08-04    |
| Prettier version   | 3.9.6                                                         | 2026-08-04    |
| React version      | 19.1.0                                                        | 2026-08-04    |
| Vite version       | 7.x                                                           | 2026-08-04    |
| FastAPI version    | 0.115.x                                                       | 2026-08-04    |

## Known Constraints and Limitations

1. **MCP Sampling is deprecated**. The judgment-mcp package will not build
   on the Sampling mechanism. It uses tools, resources, and MRTR
   input-required instead.

2. **MCP SDK v2.0.0 package split**. The legacy monolithic
   @modelcontextprotocol/sdk package is in maintenance mode. This project
   targets the split packages (@modelcontextprotocol/server, /client, /core).

3. **TypeScript 7.0 peer dependency warnings**. Some packages declare
   TypeScript peer dependency ranges that do not yet include version 7.x.
   These warnings do not affect functionality but may appear during
   installation.

4. **Agent Skills specification stability**. The specification was published
   as an open standard in December 2025 and has been adopted by multiple
   platforms. The project tracks the specification at agentskills.io and
   will update if breaking changes occur.

5. **LangGraph JS/TS adapter**. The LangGraph adapter targets
   @langchain/langgraph v1.4.x. The adapter uses the interrupt() and
   Command(resume=) pattern for durable workflow pauses.
