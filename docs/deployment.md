# Deployment Guide

This document covers local development setup, production builds, and deployment options for the Human-Machine Judgment system.

---

## Local Development

### Backend

Start the reference server with in-memory storage (data resets on restart):

```bash
cd backend
uv run python -m reference_server
```

The server listens on `0.0.0.0:8000` by default.

### Review Console

The review console is served by `hmj serve` as part of the HMJ CLI:

```bash
hmj serve
```

The server listens on `http://127.0.0.1:8457` by default and serves the review console SPA.

For development of the review console itself:

```bash
pnpm --filter @human-machine-judgment/review-console run dev
```

---

## Environment Variables

### Backend

| Variable | Default   | Description         |
| -------- | --------- | ------------------- |
| `HOST`   | `0.0.0.0` | Server bind address |
| `PORT`   | `8000`    | Server listen port  |

---

## Production Build

### Review Console

Build the review console as static files:

```bash
pnpm --filter @human-machine-judgment/review-console run build
```

Output directory: `apps/review-console/dist/`

The built assets are bundled into the `hmj` Python package and served by `hmj serve`.

### Backend

Run the backend with uvicorn directly:

```bash
cd backend
uv run uvicorn reference_server.app:create_app --factory --host 0.0.0.0 --port 8000
```

For production, consider adding `--workers` for multi-process serving:

```bash
cd backend
uv run uvicorn reference_server.app:create_app --factory --host 0.0.0.0 --port 8000 --workers 4
```

---

## Docker Example

### Backend Dockerfile

```dockerfile
FROM python:3.12-slim

WORKDIR /app

# Install uv
COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv

# Copy backend workspace
COPY backend/ ./backend/

# Install dependencies
RUN cd backend && uv sync --all-packages --no-dev

# Expose port
EXPOSE 8000

# Run the server
CMD ["uv", "run", "--directory", "backend", "uvicorn", "reference_server.app:create_app", "--factory", "--host", "0.0.0.0", "--port", "8000"]
```

Build and run:

```bash
docker build -t judgment-server .
docker run -p 8000:8000 judgment-server
```

---

## Nginx Configuration

Serve the frontend static files and proxy API requests to the backend:

```nginx
server {
    listen 80;
    server_name judgment.example.com;

    # Frontend static files
    root /var/www/judgment/dist;
    index index.html;

    # SPA fallback - serve index.html for all frontend routes
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Proxy API requests to the backend
    location /api/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Proxy health endpoint
    location /health {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
    }
}
```

---

## Production Considerations

### CORS

The reference server is configured with `allow_origins=["*"]` for development. In production, restrict this to your frontend domain:

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://judgment.example.com"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### Storage

The reference server uses in-memory storage by default. For persistent data, configure the SQLite storage adapter or implement a custom storage adapter for your database.

### Authentication

The reference server does not implement authentication. Production deployments should add an authentication layer (e.g., OAuth2, API keys, or a reverse proxy with authentication).

### Rate Limiting

The reference server does not implement rate limiting. Production deployments should add rate limiting at the reverse proxy layer or via middleware.

### HTTPS

Always use HTTPS in production. Terminate TLS at your reverse proxy (Nginx, Caddy, or cloud load balancer).
