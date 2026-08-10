# Performance Review

This document describes the performance characteristics of the Human-Machine Judgment system, covering frontend bundle size, runtime performance, backend performance, and test execution.

---

## Frontend Bundle Size

The reference demo application builds as a single JavaScript chunk of approximately 315 kB (92 kB gzipped) and a CSS file of approximately 54 kB (8 kB gzipped). These sizes are within Vite's default 500 kB chunk size warning threshold.

Key design decisions that minimize bundle size:

- **Zero-runtime CSS.** The UI component library (`judgment-ui`) uses CSS Modules for styling. There is no CSS-in-JS runtime overhead. Styles are extracted at build time into static CSS files.
- **No external state management library.** The reference demo uses React Context for state management, avoiding the bundle cost of Redux, Zustand, MobX, or similar libraries.
- **Tree-shakeable component library.** Each component is in its own directory with a dedicated module, allowing unused components to be eliminated during the production build.

---

## Client-Side Runtime Performance

### Thermal Model Calculations

The thermal model scientific example performs genuine heat transfer calculations (Fourier's law, thermal resistance, Newton's law of cooling) entirely on the client side. These calculations complete in under 1 ms on modern hardware, producing no perceptible delay during user interaction.

### React Rendering

- Components use standard React patterns (functional components, hooks) without performance anti-patterns.
- Lists and grids use stable keys for efficient reconciliation.
- No unnecessary re-renders from context: state is organized to minimize context consumers that re-render on unrelated state changes.

---

## Backend Performance

### Storage Adapters

| Adapter   | Use Case                        | Characteristics                                   |
| --------- | ------------------------------- | ------------------------------------------------- |
| In-memory | Development, testing            | Fastest. Data lost on restart.                    |
| SQLite    | Single-user, persistent storage | Suitable for development and low-concurrency use. |

The in-memory adapter uses Python dictionaries and lists with O(1) lookups by ID and O(n) filtering. The SQLite adapter uses SQLAlchemy ORM with parameterized queries.

### API Response Times

For typical development workloads (hundreds of judgment points), API responses return in single-digit milliseconds with the in-memory adapter. SQLite adds disk I/O overhead but remains under 10 ms for most operations.

### Event Sourcing Overhead

Each state transition appends one event and updates one projection. There is no event replay on every request; projections are materialized and stored alongside events. Event replay is only needed for projection rebuilds, which is an offline operation.

---

## Test Execution Performance

| Test Suite       | Count | Typical Duration | Runner |
| ---------------- | ----- | ---------------- | ------ |
| Python (backend) | ~496  | ~7 seconds       | pytest |
| TypeScript       | ~253  | ~30 seconds      | Vitest |

Python tests run quickly because they use the in-memory storage adapter and do not require any external services. TypeScript tests include component rendering tests via jsdom which adds overhead for DOM simulation.

---

## Build Performance

The Vite build process for the reference demo completes in under 10 seconds on modern hardware. The Python backend has no build step; it runs directly from source using `uv run`.

---

## Scaling Considerations

The reference server is designed for demonstration and development, not for production-scale deployments. For production use:

- Replace the SQLite storage adapter with a production database (PostgreSQL, etc.).
- Add connection pooling and query optimization for high-concurrency scenarios.
- Consider read replicas for event log queries if audit queries are frequent.
- The event sourcing model supports eventual consistency patterns for horizontal scaling.
