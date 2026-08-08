# Getting Started

This guide walks you through setting up the Human-Machine Judgment project locally and exploring the core workflow.

---

## Prerequisites

| Tool    | Version | Purpose                    |
| ------- | ------- | -------------------------- |
| Python  | 3.12+   | Backend runtime            |
| Node.js | 22+     | Frontend tooling           |
| pnpm    | 10+     | TypeScript package manager |
| uv      | latest  | Python package manager     |
| Git     | any     | Version control            |

---

## 1. Clone the Repository

```bash
git clone https://github.com/STEIDd/HumanMachineJudgment.git
cd HumanMachineJudgment
```

---

## 2. Install Dependencies

Install TypeScript dependencies at the repository root:

```bash
pnpm install
```

Install Python dependencies in the backend workspace:

```bash
cd backend
uv sync --all-packages
cd ..
```

---

## 3. Start the Backend

The reference server runs on port 8000 with in-memory storage by default:

```bash
cd backend
uv run python -m reference_server
```

Verify the server is running:

```bash
curl http://localhost:8000/health
# {"status":"ok"}
```

---

## 4. Start the Frontend

In a separate terminal, start the reference demo application:

```bash
pnpm --filter @human-machine-judgment/reference-demo run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 5. Walk Through the Judgment Lifecycle

The reference demo provides an interactive walkthrough of the judgment point lifecycle. Here is the typical flow:

### Create a Judgment Point

1. Navigate to a project in the demo application.
2. Click "Create Judgment Point" and fill in the form: category, question, context, materiality dimensions, and alternatives.
3. The point is created in `candidate` status.

### Promote to Pending

1. Select the candidate judgment point.
2. Click "Promote" to move it to `pending` status, indicating it requires attention.

### Investigate

1. From the `pending` state, click "Investigate" to begin structured evaluation.
2. The point moves to `investigating` status. Compare alternatives, review tradeoffs, and gather evidence.

### Resolve

1. Once investigation is complete, click "Resolve."
2. Select an alternative, provide a rationale, and submit.
3. The point moves to `resolved` status with a full resolution record.

### Additional Actions

- **Dismiss**: Remove a judgment point that is no longer relevant, with a reason.
- **Delegate**: Assign a judgment point to another actor under a delegation policy.
- **Reopen**: Reopen a resolved, stale, or dismissed point when conditions change.
- **Mark Stale**: Flag a resolved point whose conditions have changed.

---

## 6. Try the Thermal Model Demo

The reference demo includes a scientific example using genuine heat transfer calculations:

1. Navigate to the "Thermal Analysis" project in the demo.
2. Observe how judgment points arise naturally from engineering decisions: mesh density, boundary conditions, material properties, convergence criteria.
3. Walk through the full lifecycle for a thermal modeling decision.

---

## 7. Run the Tests

### TypeScript tests

```bash
pnpm run test
```

### Python tests

```bash
cd backend
uv run pytest
```

### Evaluation harness

```bash
cd backend
uv run pytest ../evals/ -v
```

---

## 8. Explore the API

The backend exposes a REST API. See the [API Reference](./api-reference.md) for full endpoint documentation.

Quick examples:

```bash
# List judgment points for a project
curl http://localhost:8000/api/v1/projects/proj-1/judgment-points

# Get events for a project
curl http://localhost:8000/api/v1/projects/proj-1/events

# List policies
curl http://localhost:8000/api/v1/projects/proj-1/policies
```

---

## Next Steps

- Read the [Architecture](./architecture.md) document to understand the system design.
- Read the [Deployment Guide](./deployment.md) for production setup instructions.
- Review the [API Reference](./api-reference.md) for complete endpoint documentation.
- Explore the UI component library in `packages/judgment-ui/`.
