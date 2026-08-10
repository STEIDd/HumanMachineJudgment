# Agent Skill

This document describes the Agent Skill for the Human-Machine Judgment system. The skill is based on the Agent Skills specification published at agentskills.io (specification published December 2025). It explains the three-tier progressive loading model, what the skill teaches agents, what it does not enforce, how to install and activate the skill, and how to validate correct behavior.

---

## Specification Basis

The Agent Skill is built on the Agent Skills specification, which defines a standard format for teaching agents domain-specific knowledge and behaviors. The specification is published at agentskills.io, with the initial version released in December 2025.

The Agent Skills specification provides:

- A standard file format for skill definitions.
- A progressive loading model that allows agents to acquire skill knowledge incrementally.
- A separation between what a skill teaches (knowledge) and what a runtime enforces (behavior constraints).
- A mechanism for skill versioning and compatibility checking.

---

## Three-Tier Progressive Loading

The Judgment Points skill uses the three-tier progressive loading model defined by the Agent Skills specification. Each tier provides a progressively deeper level of understanding.

### Tier 1: Summary

The summary tier provides a concise overview of the Judgment Points concept. An agent loading only Tier 1 learns:

- What a Judgment Point is (a durable record of a consequential choice).
- Why Judgment Points exist (to surface decisions that affect outcomes, rather than making them silently).
- The basic categories of choices (objective, framing, assumption, method, data, parameter, validation, interpretation).
- That the agent should look for consequential choices in its workflow and report them rather than making them unilaterally.

The summary tier is small enough to fit within a system prompt or initial context window. It does not include details about the schema, scoring model, or lifecycle mechanics.

### Tier 2: Operational Knowledge

The operational knowledge tier provides the information an agent needs to interact with the Judgment Points system effectively. An agent loading Tier 2 learns:

- The structure of a Judgment Point record (question, context, alternatives, materiality, authority, resolution).
- The six materiality dimensions and how to assess each one.
- The ten hard trigger rules and how to recognize them.
- The four agent roles (Detector, Analyst, Executor, Critic) and what each does.
- The lifecycle states and valid transitions.
- How to format a candidate proposal for submission.
- How to add alternatives with tradeoffs and evidence.
- The distinction between information presentation and decision authority.
- How to avoid recommendation anchoring.

Tier 2 is loaded when the agent is actively working on a task where Judgment Points may arise. It is larger than Tier 1 but still fits within a reasonable context allocation.

### Tier 3: Reference Detail

The reference detail tier provides the complete specification, including:

- Full JSON Schema references for all data types.
- Complete policy model documentation.
- Delegation condition details.
- Staleness detection mechanics.
- Revision history format.
- Event types and their payloads.
- SDK method signatures and usage examples.
- MCP tool specifications.
- Evaluation fixture format.

Tier 3 is loaded on demand when the agent needs specific technical details. It is the largest tier and is not expected to be loaded in full at the start of a session.

---

## What the Skill Teaches

The Judgment Points skill teaches agents the following knowledge and behaviors:

### Recognition of Consequential Choices

The skill teaches the agent to recognize when it is about to make a choice that materially affects the outcome of its work. It provides the eight category definitions and the ten hard trigger descriptions so that the agent can identify consequential choices as they arise.

The skill emphasizes that not every choice is consequential. The agent should distinguish between routine actions (formatting, variable naming, code style) and consequential choices (selecting methods, making assumptions, interpreting results).

### Structured Reporting

The skill teaches the agent how to report a detected choice as a structured Judgment Candidate. It provides the expected output format, including the required fields (question, context, category, trigger, materiality dimensions) and how to populate them.

The skill emphasizes that the report should be complete enough for a reviewer to understand the choice without reconstructing the original context. The question should be specific and clear. The context should explain why the choice arose. The materiality dimensions should be assessed honestly, not inflated or deflated.

### Alternative Identification

The skill teaches the agent how to identify and describe defensible alternatives for a choice. It emphasizes that alternatives should be genuinely different approaches, not trivial variations. Each alternative should include a description, tradeoffs, and (when available) evidence.

### Separation of Information and Decision

The skill teaches the agent to present information, evidence, and analysis without implying a preferred outcome. When the agent has a recommendation, it should be clearly labeled as such and presented separately from factual information.

### Bias Awareness

The skill teaches the agent about recommendation anchoring and why it matters. The agent learns that presenting a recommendation before the human has formed their own assessment can bias the human's judgment. The skill instructs the agent to respect the system's anchoring prevention mechanisms, including initial position capture and information segregation.

---

## What the Skill Does Not Enforce

The skill is a teaching mechanism, not an enforcement mechanism. The distinction is important:

### The Skill Does Not Enforce Lifecycle Rules

The skill teaches the agent about the lifecycle state machine (candidate, pending, investigating, resolved, etc.), but it does not enforce valid transitions. Enforcement is the runtime's responsibility. If the agent attempts an invalid transition (such as resolving a Judgment Point without proper authority), the runtime rejects the operation. The skill's role is to teach the agent how the lifecycle works so that it avoids invalid operations.

### The Skill Does Not Enforce Authorization

The skill teaches the agent about authority modes (human, collaborative, delegated, rule), but it does not enforce authorization. If the agent calls the resolve tool on a Judgment Point with `human` authority, the runtime rejects the call. The skill's role is to teach the agent to check authority before attempting resolution.

### The Skill Does Not Enforce Policy Rules

The skill teaches the agent about policies, materiality thresholds, and intervention levels, but the runtime evaluates policies and determines intervention levels. The skill helps the agent understand what will happen when it proposes a candidate, but the actual policy evaluation is performed by the core runtime.

### The Skill Does Not Validate Schemas

The skill provides schema references so the agent can format its output correctly, but schema validation is performed by the runtime when the agent submits data. The skill reduces the likelihood of schema errors by teaching the expected format, but it does not guarantee conformance.

### The Skill Does Not Replace Human Judgment

The skill teaches the agent to surface choices and prepare information for human decision-making. It does not grant the agent authority to make decisions that the system assigns to humans. Even when the agent has deep domain knowledge, the skill instructs it to defer to the authority configuration.

---

## Installation and Activation

### Skill File Location

The Judgment Points skill definition files are located in the repository under `skills/technical-judgment-review/`. The directory structure is:

```
skills/technical-judgment-review/
  assets/         Tier content files (summary, operational, reference)
  references/     Supporting reference documents
  scripts/        Validation and testing scripts
```

### Installing the Skill

To install the skill for use with an agent:

1. Copy the skill definition directory to the agent's skill directory, or reference it from the agent's configuration.

2. Configure the agent to load the skill at the appropriate tier:
   - For general awareness, load Tier 1 (summary) into the agent's system prompt or initial context.
   - For active participation in judgment workflows, load Tier 2 (operational knowledge) when the agent enters a session where Judgment Points may arise.
   - For reference during specific technical questions, load Tier 3 (reference detail) on demand.

3. Verify that the agent's runtime environment provides access to the Judgment Points system (through the SDK, MCP server, or HTTP API).

### Activating the Skill

The skill is activated when its content is loaded into the agent's context. There is no runtime registration step. The agent's behavior changes because it has acquired the knowledge contained in the skill tiers.

For agents that support the Agent Skills specification natively, activation follows the standard skill loading protocol:

1. The agent discovers available skills through its skill registry.
2. The agent requests skill content at the desired tier.
3. The skill content is loaded into the agent's context.
4. The agent begins applying the skill's knowledge in its workflow.

For agents that do not support the Agent Skills specification, the skill content can be loaded manually by including it in the agent's system prompt or context window.

---

## Validation Fixtures

Validation fixtures verify that an agent has correctly internalized the skill's teachings. Each fixture presents a scenario and specifies the expected agent behavior.

### Fixture Format

Each fixture is a JSON file containing:

```json
{
  "id": "fixture-001",
  "description": "Agent encounters a temperature-dependent material property decision.",
  "scenario": {
    "agentAction": "Setting thermal conductivity to 45 W/m-K for all temperatures.",
    "context": "Analysis covers 300 K to 900 K. Published data shows conductivity varies from 52 W/m-K at 300 K to 31 W/m-K at 900 K."
  },
  "expectedBehavior": {
    "shouldDetect": true,
    "expectedCategory": "assumption",
    "expectedHardTrigger": null,
    "minimumMaterialityScore": 6,
    "shouldProposeAlternatives": true,
    "minimumAlternativeCount": 2
  }
}
```

### Fixture Categories

The validation fixtures cover the following categories:

1. **Detection accuracy.** Scenarios where the agent should detect a consequential choice and scenarios where it should not (to verify that the agent does not over-detect).

2. **Category assignment.** Scenarios where the correct category is tested.

3. **Materiality assessment.** Scenarios where the expected materiality score range is specified.

4. **Hard trigger recognition.** Scenarios designed to activate specific hard trigger rules.

5. **Alternative generation.** Scenarios where the agent should propose multiple defensible alternatives.

6. **Authority respect.** Scenarios where the agent should defer to human authority rather than attempting to resolve.

7. **Anchoring prevention.** Scenarios where the agent should present information without implying a preferred alternative.

### Running Validation

Validation is run by presenting each fixture's scenario to the agent and comparing its response to the expected behavior. The validation script (in `skills/technical-judgment-review/scripts/`) automates this process:

1. Load the skill into the agent at Tier 2.
2. For each fixture, present the scenario to the agent.
3. Parse the agent's response for the expected outputs (detection, category, materiality, alternatives).
4. Compare the agent's outputs to the expected behavior.
5. Report pass/fail for each fixture and aggregate results.

Validation results are recorded in a machine-readable format (JSON) for integration with the evaluation harness.
