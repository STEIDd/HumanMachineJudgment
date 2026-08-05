# Interface Specification

This document specifies every state and action in the Human-Machine Judgment user interface. It covers component states, interaction patterns, information display, and design requirements including accessibility.

---

## Empty State

When a project has no Judgment Points, the interface displays an empty state that communicates this clearly without visual clutter.

**Content.** A brief statement indicating that no Judgment Points have been created yet. A single sentence explains what a Judgment Point is and how one might arise during agent-assisted work. No call-to-action buttons are displayed, because Judgment Points are created by detection, not by manual initiation.

**Visual treatment.** A centered message with a subdued icon. No decorative illustration. The empty state occupies the main content area without appearing broken or incomplete.

---

## Loading State

When data is being fetched or a state transition is in progress, the interface displays a loading state.

**Content.** A loading indicator (spinner or progress bar) with a text label describing what is loading (e.g., "Loading Judgment Points," "Recording resolution"). No animated logos or branded loading screens.

**Behavior.** The loading indicator appears after a brief delay (200 ms) to avoid flashing for fast operations. If loading takes longer than 10 seconds, a secondary message appears indicating that the operation is still in progress.

**Accessibility.** The loading indicator is announced to screen readers through an `aria-live` region. The role is set to `status` for non-blocking indicators and `alert` for blocking indicators.

---

## Error State

When an operation fails, the interface displays an error state.

**Content.** A clear, non-technical description of what went wrong. The HTTP status code or internal error code is displayed in a secondary position for debugging purposes. A suggested action is provided when possible (e.g., "Try again," "Check your connection," "Contact your administrator").

**Visual treatment.** The error message is displayed in the context where the error occurred (inline for component-level errors, full-page for page-level errors). The error is visually distinct through a border or background color that meets contrast requirements, not through red text alone.

**Behavior.** Errors are dismissible. If the error is recoverable (e.g., a network timeout), a retry action is provided. If the error is not recoverable, the message directs the user to the appropriate next step.

---

## Judgment Marker

The Judgment Marker is a compact inline element that appears alongside artifacts in the workflow to indicate that a Judgment Point is associated with that location.

### Inline State

The marker appears as a small, unobtrusive indicator adjacent to the artifact. It shows:

- A status badge (color-coded by status, with text label for accessibility).
- The Judgment Point category (abbreviated).

The inline marker does not interrupt the document flow. It is positioned in the margin or as an inline badge.

### Collapsed State

When the user focuses on or hovers over the inline marker, it expands slightly to show:

- The question being decided (truncated to one line).
- The current status.
- The intervention level.

The collapsed state provides enough context for the user to decide whether to expand to the full view.

### Expanded State

When the user activates the marker (click or keyboard Enter), it expands to show:

- The full question.
- Context summary.
- Current status with timestamp.
- Materiality score and intervention level.
- Number of alternatives.
- Resolution summary (if resolved).

The expanded state can be dismissed by clicking outside, pressing Escape, or activating a close button.

---

## Agent Activity Pause State

When the agent's execution is paused because a Judgment Point has reached the `pause` or `require-investigation` intervention level, the interface displays a pause state.

**Content.** A clear message indicating that agent activity is paused and why. The Judgment Point question is displayed prominently. The required action (resolve the Judgment Point) is stated explicitly.

**Visual treatment.** The pause state is visually prominent but not alarming. It uses a distinct background color or border to differentiate it from normal content. The paused Judgment Point is displayed inline with a direct path to the resolution interface.

**Behavior.** The user can navigate directly from the pause state to the Judgment Panel for the paused Judgment Point. Once the Judgment Point is resolved, the pause state is dismissed and the agent resumes.

---

## Judgment Panel

The Judgment Panel is the full detail view for a single Judgment Point. It displays all information needed for investigation and resolution.

### Header Section

- Judgment Point identifier (compact, copyable).
- Question (displayed as the primary heading).
- Category badge.
- Status badge with timestamp.

### Context Section

- Full context text.
- Trigger information (source, description, hard trigger if applicable).

### Materiality Section

- Aggregate score (displayed numerically).
- Each of the six dimensions with its individual score and a brief label.
- Intervention level.
- Detector confidence (if available).

### Alternatives Section

- Each alternative displayed as a distinct block.
- Alternative label, description, and tradeoffs.
- Source badge (agent, user, standard, prior-decision).
- Evidence references linked to the alternative.
- Comparison data (if available).

### Evidence and Unknowns Section

- Linked evidence references, each with artifact type, label, relationship type, and location.
- Known unknowns listed as bullet points.

### Resolution Section (if resolved)

- Selected alternative (highlighted or visually distinguished).
- Rationale text.
- Conditions applied.
- Validation requirements.
- Resolved by (actor identifier) and resolution type.
- Resolved at (timestamp).
- Whether a recommendation was shown.
- Initial position (if captured).

### Actions

The panel provides action buttons appropriate to the current status:

- **candidate**: No user actions (candidates are promoted by the system).
- **pending**: "Begin Investigation," "Dismiss," "Delegate" (if delegation policies permit).
- **investigating**: "Add Alternative," "Request Comparison," "Resolve," "Dismiss."
- **resolved**: "Reopen."
- **delegated**: "Resolve" (for the delegated agent), "Reopen" (for authorized users).
- **stale**: "Reopen," "Confirm Valid" (to remove the stale marking).
- **reopened**: "Begin Investigation," "Dismiss."
- **dismissed**: "Reopen."

---

## Alternative List

The alternative list within the Judgment Panel displays each alternative as a card or row.

**Content per alternative:**

- Label (as heading).
- Description (as body text).
- Tradeoffs (if provided, in a secondary section).
- Source (as a badge or label).
- Evidence references (as links or expandable references).
- Comparison data (if a comparison has been completed, displayed as structured data).

**Ordering.** Alternatives are displayed in the order they were added. No alternative is visually emphasized or positioned to suggest preference. All alternatives receive equal visual weight.

**Interactions.** Users can expand each alternative to see full details. When comparing alternatives, users can select two or more alternatives for side-by-side comparison (see Comparison View below).

---

## Evidence and Unknowns Display

**Evidence references** are displayed as a list of linked items. Each item shows:

- Artifact type icon or label.
- Artifact label (as a link if a location is available).
- Relationship type (depends-on, informs, produced-by, validates, contradicts).
- Description (if provided).

**Unknowns** are displayed as a distinct section listing the known unknowns as bullet points. Each unknown is a plain text statement describing an area where information is incomplete.

---

## Materiality Explanation

The materiality section provides a visual breakdown of the six dimensions. Each dimension is displayed with:

- Dimension name (full name, not abbreviated).
- Score (0 to 3) displayed numerically.
- A brief descriptor for the score level (negligible, low, moderate, high).

The aggregate score is displayed prominently. The intervention level is displayed with a brief description of what it means (e.g., "Pause: execution is halted until this decision is resolved").

If a hard trigger is present, it is displayed separately with a note explaining that the hard trigger overrides the score-based intervention level.

---

## Impact and Dependency View

The impact and dependency view shows which artifacts and other Judgment Points are connected to the current Judgment Point.

**Affected artifacts** are displayed as a list, each with its artifact type, label, and relationship. Clicking an artifact navigates to the artifact's location (if a file path, cell ID, or URI is available).

**Upstream dependencies** show Judgment Points that the current one depends on. If an upstream Judgment Point has been resolved, its resolution is summarized. If it is stale or reopened, a warning indicator is displayed.

**Downstream dependents** show Judgment Points and artifacts that depend on the current one. This helps the user understand the impact of their decision.

---

## Comparison View

The comparison view displays a side-by-side comparison of two or more alternatives.

**Layout.** Alternatives are displayed as columns. Each row corresponds to a comparison dimension (such as accuracy, computational cost, complexity, or domain-specific metrics).

**Content.** If structured comparison data is available (from a `comparison-completed` event), the data is displayed in the appropriate rows. If no structured data is available, the view displays the description and tradeoffs for each alternative in parallel columns.

**Behavior.** Users can select which alternatives to include in the comparison. The comparison view does not rank or order alternatives by preference. It presents the data and lets the user draw their own conclusions.

---

## Initial-Position Capture

For Judgment Points at the `pause` or `require-investigation` intervention level where the policy requires initial position capture, the interface presents a position-capture step before showing any agent recommendations.

**Content.** The alternatives are displayed with their descriptions and factual tradeoffs. No agent recommendation is shown. A text input prompts the user to state their initial assessment or preferred alternative.

**Behavior.** The user's initial position is recorded in the resolution's `initialPosition` field. After the initial position is recorded, the interface reveals any agent recommendations or additional analysis (if available).

**Visual treatment.** The position-capture step is visually distinct from the resolution step. It is clear that the user is stating a preliminary view, not making the final decision.

---

## Delegation Controls

When a Judgment Point's policies permit delegation, the panel displays delegation controls.

**Content.** A delegation option showing which delegation policy would apply, the conditions that must be met, and the agent that would receive resolution authority.

**Behavior.** Clicking the delegate action assigns resolution authority to the specified agent. A confirmation step is displayed before delegation is finalized, showing the delegation conditions in full.

**Restrictions.** If no delegation policy permits delegation for this Judgment Point (due to materiality score, category exclusion, or other conditions), the delegation option is not displayed.

---

## Resolved Summary (Collapsed)

After a Judgment Point is resolved, it can be displayed in a collapsed summary form throughout the interface.

**Content.** The question, the selected alternative's label, the resolution type, the resolved-at timestamp, and a status badge showing "Resolved."

**Behavior.** The collapsed summary can be expanded to the full Judgment Panel by clicking or activating it.

---

## Stale State

When a resolved Judgment Point becomes stale, its visual treatment changes.

**Content.** The resolved summary is augmented with a staleness indicator explaining what changed (e.g., "Upstream dependency 'material-properties-source' was updated on 2026-07-15").

**Visual treatment.** A warning-level visual indicator (border or background) distinguishes stale Judgment Points from valid resolved ones. The staleness indicator does not use color alone; it includes text and an icon.

**Actions.** "Reopen" and "Confirm Valid" actions are available.

---

## Reopened State

When a Judgment Point is reopened, it is displayed with its full history visible.

**Content.** The Judgment Panel shows the current reopened state, the previous resolution in the revision history, and the reason for reopening.

**Visual treatment.** A visual indicator distinguishes reopened Judgment Points from newly created ones. The revision history is displayed in a chronological list within the panel.

---

## Dismissed State

Dismissed Judgment Points are displayed with reduced visual prominence.

**Content.** The question, the dismissal reason, the actor who dismissed it, and the dismissal timestamp.

**Visual treatment.** Dismissed Judgment Points use subdued styling to indicate that they do not require active attention. They remain visible in the project view for audit purposes.

**Actions.** "Reopen" is available.

---

## Project Judgments View

The project judgments view displays all Judgment Points in a project as a sortable, filterable list.

**Content per row:**

- Status badge.
- Question (truncated to fit the row).
- Category.
- Materiality score.
- Intervention level.
- Created/updated timestamp.
- Assigned authority.

**Filters.** Users can filter by status, category, intervention level, and materiality score range.

**Sorting.** Users can sort by any column. The default sort order is by updated timestamp, descending (most recently updated first).

**Pagination.** For projects with many Judgment Points, the list is paginated.

---

## Revision History

The revision history view displays the chronological record of all state changes for a Judgment Point.

**Content per entry:**

- Timestamp.
- Previous status and new status.
- Reason for the change.
- Actor who initiated the change.
- Previous resolution (if the change involved replacing a resolution).

**Layout.** Entries are displayed in reverse chronological order (most recent first). Each entry is a distinct block with clear visual separation.

---

## Authority and Policy Display

The authority section of the Judgment Panel displays the current authority configuration.

**Content.**

- Authority mode (human, collaborative, delegated, rule).
- Assigned actor (if specified).
- Delegation policy (if delegated authority), with a summary of the policy's conditions.
- Active policies that matched this Judgment Point, listed with their names and the rules that applied.

---

## Inaccessible State

When a user does not have sufficient permissions to view or act on a Judgment Point, the interface displays an inaccessible state.

**Content.** A message stating that the user does not have access to this Judgment Point. No details about the Judgment Point are revealed. The user is directed to contact a project administrator if they believe they should have access.

**Behavior.** The inaccessible state replaces the Judgment Panel entirely. No partial information is shown.

---

## Design Requirements

### Visual Restraint

The interface uses a restrained, professional visual language. Colors, typography, and spacing are chosen for clarity and readability, not for visual impact. The interface avoids decorative elements, gradients, shadows, and animations that do not serve a functional purpose.

### Responsiveness

All interface components are responsive and function correctly across screen sizes from 320px (mobile) to 2560px (large desktop). Layout adjustments use standard responsive breakpoints. Content does not overflow or become hidden at any supported screen size.

### Keyboard Accessibility

All interactive elements are reachable and operable with keyboard input alone. The tab order follows a logical sequence through the page content. Focus indicators are visible and meet the minimum size requirements specified in WCAG 2.2.

**Specific keyboard interactions:**

- Judgment Markers: focusable with Tab, expandable with Enter or Space, dismissible with Escape.
- Judgment Panel actions: focusable with Tab, activatable with Enter or Space.
- Alternative list: navigable with arrow keys within the list.
- Comparison view: column navigation with arrow keys.
- Filters and sort controls: standard form control keyboard behavior.

### Screen-Reader Accessibility

All interface components use semantic HTML elements. Where semantic elements are insufficient, ARIA attributes provide additional context.

**Specific screen-reader considerations:**

- Status badges use `aria-label` to convey the status name, not just a color.
- Materiality scores use descriptive text (e.g., "Materiality score 12 out of 18, intervention level: pause").
- Dynamic content updates (new alternatives, status changes) are announced through `aria-live` regions.
- The Judgment Panel uses landmark roles (`main`, `navigation`, `complementary`) to support landmark navigation.
- Form controls in the resolution interface have associated labels.

### High Contrast

The interface meets WCAG 2.2 Level AA contrast requirements for all text and interactive elements. A forced high-contrast mode is supported through the operating system's high-contrast settings.

**Specific contrast requirements:**

- Body text: minimum 4.5:1 contrast ratio.
- Large text: minimum 3:1 contrast ratio.
- Focus indicators: minimum 3:1 contrast ratio against adjacent colors.
- Status badges: status is conveyed through text and shape, not through color alone.

### Reduced Motion

The interface respects the `prefers-reduced-motion` media query. When reduced motion is enabled:

- All transitions and animations are disabled or reduced to instantaneous state changes.
- Loading indicators use static alternatives (such as a static loading message instead of a spinner).
- Focus transitions are instantaneous.

### Error Prevention

The resolution interface includes confirmation steps for irreversible actions (dismissal, delegation, resolution). The confirmation step displays a summary of the action and its effects before the user commits.
