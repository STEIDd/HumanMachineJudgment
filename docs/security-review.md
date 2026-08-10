# Security Review

This document reviews the security posture of the Human-Machine Judgment reference implementation against the OWASP Top 10 and other common web application security concerns.

> **Scope.** This review covers the reference server and reference demo. The reference server is intentionally unauthenticated and is designed for local development and demonstration. Production deployments must add authentication, authorization, and other security controls.

---

## OWASP Checklist

### XSS (Cross-Site Scripting)

**Status: Mitigated by default**

- React escapes all output by default. Text content rendered via JSX is automatically escaped.
- No usage of `dangerouslySetInnerHTML` anywhere in the codebase.
- CSS Modules prevent CSS injection via class name isolation.
- User-supplied data is rendered as text content, not as HTML.

### CSRF (Cross-Site Request Forgery)

**Status: Not applicable for reference server**

- The reference server does not use cookie-based or session-based authentication.
- All API communication uses JSON request bodies with `Content-Type: application/json`.
- Production deployments that add cookie-based auth must also add CSRF protection.

### SQL Injection

**Status: Mitigated**

- The SQLite storage adapter uses SQLAlchemy ORM with parameterized queries throughout.
- No raw SQL strings are constructed from user input.
- All query parameters are bound through SQLAlchemy's parameter binding mechanism.

### CORS (Cross-Origin Resource Sharing)

**Status: Development configuration only**

- The reference server is configured with `allow_origins=["*"]` to support local development with the frontend on a different port.
- Production deployments must restrict `allow_origins` to the specific frontend domain.

### Dependency Audit

- Run `pnpm audit` to check for known vulnerabilities in TypeScript dependencies.
- Run `uv pip audit` or use `pip-audit` to check Python dependencies.
- The project uses minimal dependencies to reduce attack surface.
- Key dependencies (FastAPI, Pydantic, SQLAlchemy, React, Vite) are actively maintained.

### Secrets Management

**Status: Clean**

- No API keys, credentials, tokens, or secrets exist in the codebase.
- No `.env` files are committed to version control.
- The `.gitignore` excludes common secret file patterns.

### Input Validation

**Status: Comprehensive**

- All API inputs on the backend are validated through Pydantic models.
- Pydantic enforces type constraints, value ranges (e.g., materiality scores 0--18, dimension scores 0--3), and required fields.
- Invalid input returns a `422 Unprocessable Entity` response with details about which fields failed validation.
- Query parameters are validated with FastAPI's `Query` constraints (e.g., `ge=0`, `le=200` for pagination).

### Authentication

**Status: Not implemented**

- The reference server is intentionally unauthenticated for demonstration purposes.
- All endpoints are publicly accessible when the server is running.
- Production deployments must implement authentication. Options include:
  - OAuth2/OIDC for user authentication
  - API keys for programmatic access
  - Reverse proxy authentication (e.g., Nginx with auth module)

### Authorization

**Status: Domain-level only**

- The authority model (human, collaborative, delegated, rule) enforces who can resolve judgment points at the domain level.
- There is no HTTP-level authorization (no bearer tokens, no role-based access control on endpoints).
- Production deployments should map authenticated users to the domain authority model.

### Rate Limiting

**Status: Not implemented**

- The reference server does not implement rate limiting.
- Production deployments should add rate limiting at the reverse proxy layer or via ASGI middleware.

---

## Additional Security Considerations

### Data at Rest

- The in-memory storage adapter holds data only in process memory.
- The SQLite storage adapter stores data in a local file without encryption.
- Production deployments should use encrypted storage for sensitive judgment point data.

### Data in Transit

- The reference server runs over plain HTTP.
- Production deployments must use HTTPS. Terminate TLS at the reverse proxy.

### Error Handling

- Error responses include descriptive messages but do not leak internal implementation details (no stack traces, no file paths, no dependency versions).
- Domain errors are mapped to appropriate HTTP status codes (400, 403, 404, 409, 422).

### Logging

- The reference server uses standard Python logging.
- No sensitive data (credentials, tokens, personally identifiable information) is logged.

### Supply Chain

- All GitHub Actions use pinned SHA references for third-party actions, preventing supply chain attacks via tag manipulation.
- TypeScript dependencies are locked via `pnpm-lock.yaml`.
- Python dependencies are locked via `uv.lock`.
