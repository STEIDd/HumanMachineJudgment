# Agent Runtime Integration

This document describes how the Human-Machine Judgment system integrates
with agent runtimes. It covers the hook-based detection system, the four
agent roles, detection mechanisms, structured output formats, confidence
recording, the separation of recommendation from decision, and the
programmatic interfaces available through the SDK.

---

## Claude Code Integration

HMJ integrates with Claude Code through four mechanisms:

### PreToolUse Hook (Detection)

The `hmj hook pre-tool-use` command is registered as a Claude Code
PreToolUse hook. Every tool call passes through the detection pipeline:

1. The hook receives the tool name and input as JSON on stdin.
2. The detection pipeline applies rules:
   - **ToolNameDetectionRule** — matches tool names (e.g., Bash) to
     categories and intervention levels.
   - **ArgumentPatternRule** — regex patterns on tool input detect
     dangerous operations (e.g., `rm -rf`, `git push --force`,
     `DROP TABLE`).
   - **HardTriggerDetectionRule** — immediate escalation for
     safety-critical patterns.
3. If a detection matches at `pause` or higher intervention level, the
   hook blocks the tool call and creates a judgment point.
4. Decision deduplication prevents duplicate judgment points for the
   same decision (based on a SHA-256 decision key that includes the
   project ID, category, tool name, and normalized arguments).
5. If a valid resolution already exists for the same decision key,
   the hook allows the action without creating a new point.

### PostToolUse Hook (Staleness Tracking)

The `hmj hook post-tool-use` command is registered as a Claude Code
PostToolUse hook for file-modifying tools (Edit, Write, NotebookEdit).
After a tool execution completes:

1. The hook identifies the modified file path from the tool input.
2. It searches for resolved judgment points whose resolution scope
   includes fingerprints of the modified file.
3. If the file's fingerprint has changed since resolution, the affected
   judgment point is marked stale.
4. Claude receives additional context informing it that a previous
   resolution has been invalidated.

PostToolUse hooks cannot block tool execution (the tool has already
run). They provide informational feedback about resolution staleness.

### Stop Hook (Session Enforcement)

The `hmj hook stop` command is registered as a Claude Code Stop hook.
When Claude attempts to end a session:

1. The hook checks `stop_hook_active` to prevent infinite loops.
2. It queries for unresolved judgment points in the current session
   that have intervention level `pause` or `require-investigation`.
3. If unresolved required points exist, the hook blocks the stop and
   directs the user to resolve them.
4. If all session points are resolved, dismissed, or below the
   enforcement threshold, the stop is allowed.

### MCP Server (Agent Tools)

The `hmj mcp` command runs as a stdio MCP server, providing the agent
with structured tools for judgment point management. See
[MCP Integration](./mcp-integration.md) for details.

---

## The Four Agent Roles

The Judgment Points system defines four distinct roles that agents may occupy in relation to a Judgment Point. These roles describe responsibilities, not necessarily distinct agent instances; a single agent may perform multiple roles in different phases of the workflow.

### Detector

The Detector identifies consequential choices as they occur during agent execution. It operates continuously, examining each proposed action and evaluating whether it constitutes a choice that should be surfaced.

**Responsibilities:**

- Monitor agent actions for consequential choices.
- Apply hard trigger rules to each proposed action.
- Apply soft trigger heuristics to identify potential candidates.
- Produce structured Judgment Candidate records with preliminary materiality assessments.
- Record detector confidence for each candidate.

**Interaction with the Judgment Points system:**

- Calls the SDK's `proposeCandidate` method (or the MCP `judgment.propose` tool) to submit detected candidates.
- Provides trigger information, including which rule or heuristic matched and the source of the detection.
- Does not make resolution decisions. The Detector's role ends once the candidate is submitted.

### Analyst

The Analyst investigates a Judgment Point once it has been promoted to active status. It gathers information, identifies alternatives, and prepares structured comparisons.

**Responsibilities:**

- Identify defensible alternatives for the choice.
- Gather evidence that supports or informs each alternative.
- Prepare structured comparison data (such as quantitative differences in outcomes between alternatives).
- Assess tradeoffs for each alternative.
- Identify knowns and unknowns relevant to the decision.
- Record the source of each alternative (agent-proposed, user-provided, standard-specified, or carried from a prior decision).

**Interaction with the Judgment Points system:**

- Calls the SDK's `addAlternative` method to add alternatives to the Judgment Point.
- Calls the SDK's `linkArtifact` method to attach evidence references.
- Calls the SDK's `requestComparison` method to initiate structured comparison calculations.
- Calls the SDK's `completeComparison` method to record comparison results.
- Does not make the resolution decision. The Analyst prepares information; the authority decides.

### Executor

The Executor implements the resolution of a Judgment Point. Once a decision has been recorded, the Executor carries out the chosen alternative in the technical workflow.

**Responsibilities:**

- Read the resolution details (selected alternative, conditions, validation requirements).
- Implement the chosen alternative in the relevant code, parameters, or artifacts.
- Link produced artifacts back to the Judgment Point using artifact references with the `produced-by` relationship.
- Execute any validation requirements specified in the resolution.
- Report whether validation requirements were met.

**Interaction with the Judgment Points system:**

- Reads the Judgment Point's resolution through the SDK's `getJudgmentPoint` method.
- Calls the SDK's `linkArtifact` method to record artifacts produced by the resolution.
- Does not modify the resolution. The Executor implements what was decided.

### Critic

The Critic reviews the quality and consistency of Judgment Point records. It operates as a quality assurance function, identifying gaps, inconsistencies, or weaknesses in the decision records.

**Responsibilities:**

- Check that resolutions are supported by the evidence linked to the Judgment Point.
- Verify that all listed alternatives were adequately considered before resolution.
- Assess whether validity conditions are reasonable and verifiable.
- Flag resolutions where the rationale is too brief, vague, or does not address the relevant tradeoffs.
- Identify potential anchoring bias by comparing the initial position (if recorded) with the final resolution and the recommendation shown.

**Interaction with the Judgment Points system:**

- Reads Judgment Points through the SDK's `listJudgmentPoints` and `getJudgmentPoint` methods.
- May create new candidates (through the Detector role) if the review identifies a decision that was made without adequate scrutiny.
- Does not modify existing Judgment Points directly. The Critic produces review reports and flags.

---

## Deterministic Rule-Based Detection

The primary detection mechanism is deterministic and rule-based. Hard trigger rules are evaluated against the agent's proposed action context. Each rule is a function that takes the action context as input and returns either a match (with the trigger rule identifier and forced intervention level) or no match.

The action context provided to detection rules includes:

- The proposed action type (e.g., set parameter, select method, exclude data, formulate conclusion).
- The target of the action (which artifact, parameter, or model is being affected).
- The current values and proposed new values (if applicable).
- Metadata about the workflow state (which Judgment Points are already active, which artifacts are linked).

Rule evaluation is synchronous and fast. It does not involve model inference, network calls, or probabilistic computation. Every rule produces the same result for the same input.

The ten hard trigger rules (documented in `docs/materiality-and-policy.md`) are the default rule set. Additional custom rules can be registered through the SDK's `registerDetectionRule` method.

---

## Optional Model-Assisted Detection

In addition to deterministic rules, the system supports optional model-assisted detection for identifying subtle or context-dependent consequential choices that rules alone might miss.

Model-assisted detection operates as follows:

1. The agent's action context is formatted as a structured prompt.
2. The prompt is sent to a model provider through a provider adapter interface.
3. The model returns a structured response indicating whether the action constitutes a consequential choice, and if so, a preliminary materiality assessment.
4. The model's response is treated as a soft trigger. It creates a candidate but does not force a specific intervention level.

**Provider neutrality.** The model-assisted detection interface accepts any model provider through an adapter. The adapter interface defines a single method: `assess(prompt: string): Promise<DetectionResult>`. Implementations can target any model API without changing the detection logic.

**No hard dependency.** Model-assisted detection is optional. If no model provider is configured, the system operates using deterministic rules only. The core package has no dependency on any model provider.

**Confidence requirement.** Model-assisted detections must include a confidence value between 0.0 and 1.0. This confidence is recorded in the candidate's materiality assessment as `detectorConfidence`. Policies can use the confidence value to determine whether a candidate should be promoted.

---

## Structured Candidate Output Format

When a Detector (rule-based or model-assisted) identifies a consequential choice, it produces a structured candidate conforming to the `JudgmentPoint` schema. The candidate includes, at minimum:

```json
{
  "id": "<generated unique identifier>",
  "projectId": "<current project identifier>",
  "category": "<one of: objective, framing, assumption, method, data, parameter, validation, interpretation>",
  "question": "<the specific question being decided>",
  "context": "<background explaining why this choice has arisen>",
  "trigger": {
    "source": "<agent | rule | skill | tool | user | dependency-change>",
    "description": "<human-readable description of what triggered detection>",
    "hardTrigger": "<hard trigger rule identifier, if applicable>",
    "ruleId": "<rule identifier, if applicable>"
  },
  "materiality": {
    "score": "<integer 0-18>",
    "dimensions": {
      "methodologicalDiscretion": "<integer 0-3>",
      "downstreamInfluence": "<integer 0-3>",
      "uncertainty": "<integer 0-3>",
      "consequence": "<integer 0-3>",
      "reversibility": "<integer 0-3>",
      "accountabilityRequirement": "<integer 0-3>"
    },
    "detectorConfidence": "<number 0.0-1.0, optional>",
    "hardTrigger": "<hard trigger name, if one matched>",
    "interventionLevel": "<trace | disclose | pause | require-investigation>"
  },
  "status": "candidate",
  "alternatives": [],
  "affectedArtifactIds": ["<identifiers of artifacts affected by this choice>"],
  "authority": {
    "mode": "<human | collaborative | delegated | rule>"
  },
  "validityConditions": [],
  "reopenConditions": [],
  "createdAt": "<ISO 8601 timestamp>",
  "updatedAt": "<ISO 8601 timestamp>"
}
```

This output conforms to the `judgment-point.schema.json` schema and can be validated against it at runtime.

---

## Confidence Recording

Every detection, whether rule-based or model-assisted, records a confidence value in the materiality assessment:

- **Rule-based detections** set `detectorConfidence` to 1.0, because deterministic rules are either matched or not matched. When a rule matches, the system has full confidence in the detection.
- **Model-assisted detections** set `detectorConfidence` to the value returned by the model. This value reflects the model's self-reported confidence in its assessment.
- **User-initiated detections** omit `detectorConfidence`, because the assessment was manual and confidence is implicit in the human's decision to create the candidate.

Policies may use `detectorConfidence` in delegation conditions. For example, a policy might require `requiredConfidence >= 0.9` for delegation, meaning that only high-confidence detections are eligible for automated resolution.

---

## Separation of Recommendation from Decision

The Judgment Points system maintains a strict separation between information presentation and decision authority. This separation has five distinct categories:

### 1. Computed Result

A computed result is the output of a calculation or analysis. It is factual (within the model's scope) and does not involve judgment. Computed results are presented as evidence, not as recommendations.

**Example.** "The von Mises stress at the critical location is 245 MPa."

### 2. External Requirement

An external requirement is a constraint imposed by a standard, code, regulation, contract, or organizational policy. It is not a recommendation from the agent; it is a fact about the governing framework.

**Example.** "ASME BPVC Section VIII Division 2 specifies a maximum allowable stress of 138 MPa for this material at the design temperature."

### 3. Agent Recommendation

An agent recommendation is the agent's suggested course of action based on its analysis. Recommendations are clearly labeled as such and are never presented as the only option or as the default selection.

**Example.** "Based on the comparison, alternative B (temperature-dependent properties) provides better accuracy for this operating range. However, both alternatives produce results within the acceptance criteria."

### 4. User Judgment

A user judgment is the human decision-maker's own assessment and decision. It may agree with, disagree with, or modify the agent's recommendation. User judgment is the authoritative resolution for Judgment Points with `human` or `collaborative` authority mode.

### 5. Delegated Decision

A delegated decision is a resolution made by an agent under an explicit delegation policy. It is recorded as `resolutionType: "delegated"` and includes the delegation policy identifier. Delegated decisions are subject to the conditions specified in the delegation policy.

This five-category separation ensures that no agent output is ambiguously positioned between information and decision. Every piece of content presented to the user is categorized, and the resolution record tracks which category the decision fell into.

---

## Recommendation Anchoring Prevention

Recommendation anchoring is a cognitive bias where exposure to an AI-generated recommendation influences a human's subsequent judgment, even when the human believes they are deciding independently. The Judgment Points system implements several mechanisms to reduce anchoring:

### Initial Position Capture

For Judgment Points at the `pause` or `require-investigation` intervention level, the system may prompt the decision-maker to state their initial position before any agent recommendation is displayed. This initial position is recorded in the resolution's `initialPosition` field.

The initial position capture is not always required; it is configurable via policy and typically applied to high-materiality choices. When it is applied, the system presents the alternatives and their factual tradeoffs but withholds any agent recommendation or preference indication until the initial position is recorded.

### Recommendation Visibility Tracking

The resolution schema includes a `recommendationShown` boolean field. This field records whether an agent recommendation was displayed to the decision-maker before resolution. When `recommendationShown` is true, the Critic role can flag the resolution for potential anchoring bias analysis.

### Alternative Ordering

When alternatives are presented to the user for a decision that requires human judgment, the system does not order them in a way that implies preference. Alternatives are presented in the order they were added, or in alphabetical order by label, without highlighting or visual emphasis that would suggest one is preferred.

### Information Segregation

Factual information (computed results, external requirements) is presented separately from agent recommendations. The user sees the evidence and tradeoffs first, then (if and when the system or policy permits) the agent's recommendation is shown in a clearly demarcated section.

---

## Connecting an External Agent

External agents (those not directly using the Python SDK) can interact with the Judgment Points system through two interfaces:

### MCP Integration

External agents that support the Model Context Protocol can use the MCP tools exposed by `judgment-mcp`. This is the recommended integration path for agents that are MCP clients. See `docs/mcp-integration.md` for details.

### HTTP API Integration

External agents can interact with the reference server's HTTP API. The reference server (`backend/reference_server`) exposes REST endpoints for all Judgment Point operations. Agents make standard HTTP requests to create candidates, query Judgment Points, add alternatives, and record resolutions.

### Agent Skill

Agents that support the Agent Skills specification can load the Judgment Points skill definition, which teaches the agent how to detect consequential choices and interact with the Judgment Points system. See `docs/agent-skill.md` for details.

---

## Using the SDK Programmatically

The `judgment_sdk` Python package provides a typed interface for all Judgment Point operations. The following examples show common operations.

### Proposing a Candidate

```python
from judgment_sdk import JudgmentClient
from judgment_storage_memory import MemoryStorage

storage = MemoryStorage()
client = JudgmentClient(storage=storage)

candidate = client.propose_candidate(
    project_id="thermal-analysis-2026",
    category="assumption",
    question="Should material properties be treated as constant or temperature-dependent?",
    context=(
        "The analysis covers a temperature range of 300 K to 900 K. "
        "Material properties vary significantly over this range for the alloy in question."
    ),
    trigger={
        "source": "rule",
        "description": "Hard trigger: assumption introduces simplification with downstream impact.",
        "hard_trigger": "assumption-with-downstream-impact",
    },
    materiality={
        "score": 10,
        "dimensions": {
            "methodological_discretion": 2,
            "downstream_influence": 2,
            "uncertainty": 1,
            "consequence": 2,
            "reversibility": 1,
            "accountability_requirement": 2,
        },
        "detector_confidence": 1.0,
        "intervention_level": "pause",
    },
    affected_artifact_ids=[
        "cell-thermal-conductivity",
        "cell-heat-capacity",
        "cell-temperature-field",
    ],
    authority={"mode": "human"},
    validity_conditions=["Source data covers the operating temperature range"],
    reopen_conditions=["Operating temperature range changes"],
)
```

### Adding an Alternative

```python
client.add_alternative(
    judgment_id=candidate.id,
    alternative_id="alt-constant",
    label="Constant properties at reference temperature",
    description=(
        "Use material properties evaluated at a single reference temperature "
        "(e.g., 600 K) for all calculations."
    ),
    tradeoffs=(
        "Simpler computation, faster execution, but loses accuracy "
        "at temperatures far from the reference."
    ),
    source="agent",
)
```

### Recording a Resolution

```python
client.resolve(
    judgment_id=candidate.id,
    selected_alternative_id="alt-temperature-dependent",
    rationale=(
        "The operating temperature range of 300 K to 900 K is wide enough that "
        "constant properties would introduce errors exceeding 15% at the extremes. "
        "Temperature-dependent properties are necessary for acceptable accuracy."
    ),
    uncertainty=["Property data is interpolated between published data points at 100 K intervals"],
    conditions=["Use published source data covering 300 K to 900 K"],
    validation_requirements=[
        "Verify that computed temperature field is within 5% of benchmark solution",
    ],
    resolved_by="user:engineer-01",
    resolution_type="direct-human",
    alternatives_considered=["alt-constant", "alt-temperature-dependent"],
    recommendation_shown=False,
)
```

### Querying Judgment Points

```python
all_pending = client.list_judgment_points(
    project_id="thermal-analysis-2026",
    status=["pending", "investigating"],
)

point = client.get_judgment_point(judgment_id=candidate.id)

events = client.get_events(judgment_id=candidate.id)
```

---

## Agent Workflow Patterns

### Detection-Only Pattern

The simplest integration pattern: an agent runs a Detector that submits candidates but does not perform analysis or resolution. The user reviews candidates through the UI and resolves them manually.

### Full-Lifecycle Pattern

The agent performs all four roles in sequence: Detector identifies the choice, Analyst investigates alternatives, the system pauses for user resolution, and Executor implements the decision. This pattern is suitable for workflows where the agent handles the complete technical process.

### Delegated-Resolution Pattern

The agent performs Detector and Analyst roles, and the delegation policy permits the agent to also perform resolution for low-materiality choices. High-materiality choices pause for human resolution. This pattern reduces interruption burden for routine decisions while maintaining human oversight for significant ones.

### Retrospective Review Pattern

The agent completes its work without pausing, logging all detected candidates at the trace level. After the work is complete, a Critic reviews the log and flags decisions that warranted more scrutiny. This pattern is suitable for exploratory or preliminary analyses where pausing would be disruptive.
