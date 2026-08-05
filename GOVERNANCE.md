# Project Governance

## Project Stage

Human-Machine Judgment is in the early research and reference implementation stage. The project provides a public reference implementation of judgment point concepts for technical agent workflows. Governance structures described here are intentionally lightweight and will evolve as the project grows.

## Decision Making

Decisions about the project are made by the project maintainers through open discussion on GitHub issues and pull requests. There is no formal voting process at this stage. Maintainers consider input from all contributors and aim to reach consensus where possible. When consensus cannot be reached, the project lead makes the final decision.

All significant decisions, including changes to the specification, architecture, and project direction, are discussed publicly on GitHub before being adopted.

## Roles

### Maintainer

Maintainers have write access to the repository and are responsible for:

- Reviewing and merging pull requests.
- Triaging issues and managing the issue tracker.
- Making decisions about the project's direction and priorities.
- Ensuring that contributions align with the project's goals and quality standards.
- Maintaining project documentation and governance.

The current list of maintainers is in [MAINTAINERS.md](MAINTAINERS.md).

### Contributor

Anyone who submits a pull request, opens an issue, participates in discussions, or otherwise contributes to the project is a contributor. Contributors are expected to follow the [Code of Conduct](CODE_OF_CONDUCT.md) and the [Contributing Guidelines](CONTRIBUTING.md) where applicable.

Contributors who demonstrate sustained, high-quality involvement may be invited to become maintainers at the discretion of the existing maintainers.

## Specification Decisions

The judgment point specification is the core intellectual output of this project. Changes to the specification follow a stricter process than routine code changes:

1. **Proposal.** Specification changes begin as a GitHub issue describing the proposed change, its motivation, and its expected impact.
2. **Discussion.** The proposal is discussed openly. Maintainers and contributors provide feedback, raise concerns, and suggest alternatives.
3. **Draft.** If the proposal gains support, a pull request is submitted with the proposed specification changes, including any necessary updates to the reference implementation.
4. **Review.** The pull request is reviewed by at least one maintainer. Specification changes receive additional scrutiny for clarity, consistency, and backward compatibility.
5. **Merge.** Once approved, the pull request is merged by a maintainer.

## Relationship to WEEMS

This project is a public reference implementation. It is not an official WEEMS product, and it is not affiliated with, endorsed by, or sponsored by the WEEMS trademark owner. The project references WEEMS only to provide context for how judgment point concepts may apply in practice. See [TRADEMARKS.md](TRADEMARKS.md) for details on trademark usage.

## Changes to Governance

This governance document may be updated as the project evolves. Changes to governance follow the same process as specification changes: proposal via issue, public discussion, and approval by maintainers.
