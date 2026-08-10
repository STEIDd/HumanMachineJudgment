# Accessibility Audit

This document describes the accessibility features and compliance status of the Human-Machine Judgment UI component library and reference demo application.

**Target standard:** WCAG 2.2 Level AA

---

## Color and Visual Design

### Color Independence

All status indicators use text labels in addition to color. No information is conveyed through color alone:

- **StatusBadge**: Displays the status as text (e.g., "Pending", "Resolved") alongside any color indicator.
- **CategoryBadge**: Displays the category name as text.
- **InterventionLevelBadge**: Displays the intervention level as text (e.g., "Pause", "Disclose").
- **MaterialityGauge**: Displays the numeric score alongside the visual gauge.
- **StaleIndicator**: Displays "Stale" as text alongside any visual indicator.

### Focus Indicators

- All interactive elements have visible focus indicators with a minimum 3:1 contrast ratio against the background.
- Focus indicators are visible in both light and dark environments via outline styling.

---

## ARIA Attributes

### Labels

- All badges, gauges, and indicators include `aria-label` attributes describing their purpose and current state.
- Form controls have associated `<label>` elements or `aria-label` attributes.

### Live Regions

- **Dynamic content updates** use `aria-live="polite"` to announce changes without interrupting the user. This covers:
  - Status changes on judgment points
  - New items appearing in lists
  - Loading state completion
- **Error states** use `aria-live="assertive"` to immediately announce errors to screen reader users.
- **Loading states** are announced via `aria-live="polite"` with appropriate loading text.

### Dialog Patterns

- **DelegationDialog** uses `role="dialog"` and `aria-modal="true"`.
- **ReopenDialog** uses `role="dialog"` and `aria-modal="true"`.
- **ResolutionForm** uses appropriate form semantics.
- Dialogs trap focus within the dialog while open.
- Pressing Escape dismisses the dialog and returns focus to the trigger element.

### Grid Navigation

- **ComparisonView** uses `role="grid"` with `aria-rowcount` and `aria-colcount`.
- Arrow key navigation is supported within the grid for moving between cells.

---

## Keyboard Navigation

All interactive elements are accessible via keyboard:

| Key          | Action                                         |
| ------------ | ---------------------------------------------- |
| `Tab`        | Move focus to the next interactive element     |
| `Shift+Tab`  | Move focus to the previous interactive element |
| `Enter`      | Activate the focused button or link            |
| `Space`      | Activate the focused button or toggle          |
| `Escape`     | Dismiss the current dialog or panel            |
| `Arrow keys` | Navigate within grids and composite widgets    |

### Component-Specific Keyboard Support

- **JudgmentPanel**: Tab through action buttons, Enter/Space to activate.
- **PolicyRuleEditor**: Tab through form fields, Enter to submit.
- **DependencyGraph**: Arrow keys to navigate between nodes.
- **JudgmentTimeline**: Tab through timeline entries.
- **ProjectJudgmentsView**: Tab through judgment cards, Enter to expand.

---

## Motion and Animation

### Reduced Motion

The `prefers-reduced-motion` media query is respected across all components:

- When `prefers-reduced-motion: reduce` is active, all transitions and animations are disabled.
- No essential information is conveyed through animation alone.
- Transitions are used for visual polish only, not for communicating state changes.

---

## Semantic HTML

- Headings follow a logical hierarchy (h1 > h2 > h3) without skipping levels.
- Lists use `<ul>`, `<ol>`, and `<li>` elements for grouped items.
- Buttons use `<button>` elements (not styled `<div>` or `<span>` elements).
- Links use `<a>` elements with meaningful text.
- Form inputs use appropriate `<input>`, `<select>`, and `<textarea>` elements.

---

## Component Accessibility Summary

| Component              | aria-label | aria-live | Keyboard | Reduced motion |
| ---------------------- | ---------- | --------- | -------- | -------------- |
| StatusBadge            | Yes        | -         | -        | Yes            |
| CategoryBadge          | Yes        | -         | -        | Yes            |
| InterventionLevelBadge | Yes        | -         | -        | Yes            |
| MaterialityGauge       | Yes        | -         | -        | Yes            |
| StaleIndicator         | Yes        | -         | -        | Yes            |
| AlternativeCard        | Yes        | -         | Tab      | Yes            |
| ComparisonView         | Yes        | -         | Grid nav | Yes            |
| JudgmentCard           | Yes        | -         | Tab      | Yes            |
| JudgmentPanel          | Yes        | polite    | Tab      | Yes            |
| JudgmentMarker         | Yes        | -         | Tab      | Yes            |
| JudgmentTimeline       | Yes        | polite    | Tab      | Yes            |
| DependencyGraph        | Yes        | -         | Arrows   | Yes            |
| ResolutionForm         | Yes        | assertive | Tab      | Yes            |
| DelegationDialog       | Yes        | polite    | Trap     | Yes            |
| ReopenDialog           | Yes        | polite    | Trap     | Yes            |
| PolicyRuleEditor       | Yes        | assertive | Tab      | Yes            |
| ProjectJudgmentsView   | Yes        | polite    | Tab      | Yes            |
| ActivityFeed           | Yes        | polite    | Tab      | Yes            |

---

## Automated Testing

### axe-core Integration

Accessibility testing is integrated into the end-to-end test suite via axe-core through Playwright:

- Each page and interactive state is tested for WCAG 2.2 Level AA violations.
- axe-core checks include: color contrast, missing labels, invalid ARIA attributes, keyboard traps, and heading hierarchy.
- Violations are reported as test failures with actionable remediation guidance.

---

## Known Limitations

- The DependencyGraph component renders an SVG-based visualization. Complex graphs with many nodes may be difficult to navigate via screen reader. A tabular alternative view is planned.
- The thermal model demo includes data visualizations that currently lack detailed text descriptions. Adding `aria-describedby` with data summaries is planned.

---

## Testing Recommendations

To manually verify accessibility:

1. Navigate the entire application using only the keyboard (no mouse).
2. Enable a screen reader (VoiceOver on macOS, NVDA on Windows) and verify all content is announced.
3. Set `prefers-reduced-motion: reduce` in your operating system and verify no animations play.
4. Zoom the browser to 200% and verify the layout remains usable.
5. Use a high-contrast color theme and verify all content remains visible.
