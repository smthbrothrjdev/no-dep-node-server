# no-dep-node-server

A tiny, dependency-free Node.js server written in TypeScript (ESM) with a simple static file host for `public/`. Built to explore how far we can go with **zero production dependencies**.

## Why
- **Zero prod deps**: only Node + TypeScript.
- **ESM-first**: modern syntax, native `node --watch` for dev on Node ≥18.
- **Static hosting**: serves `public/` (HTML/CSS/JS) and a minimal API.

## Requirements
- Node.js **18+** (recommended 20/22)
- npm (or pnpm/yarn) for dev scripts
- TypeScript for builds

## Getting started
```bash
# clone
git clone https://github.com/smthbrothrjdev/no-dep-node-server.git
cd no-dep-node-server

# install dev-only tooling (TypeScript)
npm install

# build TS → JS
npm run build

# run compiled server
npm start
```

### Developer mode
```bash
npm run dev
```
> Tip: if `npm run dev` uses `node --watch`, ensure Node ≥18.

## Project layout
```
.
├─ src/                 # TypeScript source (entrypoint: src/index.ts)
├─ public/              # static assets (index.html, styles.css, app.js)
├─ dist/                # build output (gitignored)
├─ tsconfig.json        # TS config
└─ package.json         # scripts + "type": "module"
```

## Configuration
Environment variables:
- `PORT` – listening port (default: 3000)
- `STATIC_DIR` – path to serve static files from (default: `public`)

## Usage examples
- **Static**: open `http://localhost:3000/`.
- **API**: `GET /healthz` → `200 OK` with a small JSON payload.

## Scripts
```jsonc
{
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "start": "node dist/index.js",
    "dev": "npm run build -- --watch & node --watch dist/index.js",
    "clean": "rm -rf dist"
  }
}
```

## Project Scope / Feature Checklist
Tracking your envisioned server features:

### 1. Core HTTP Foundation
- [ ] Raw TCP listener: accept incoming socket connections.
- [ ] HTTP/1.1 request parser: parse start-line, headers, and body (Content-Length, chunked).
- [ ] HTTP/1.1 response serializer: format status line, headers, body (chunked).
- [ ] Routing layer: match method + path (params, wildcards, regex).
- [ ] Middleware pipeline: chainable handlers (logging, auth, body parsing).
- [ ] Static file handler: serve files; handle If-Modified-Since / ETag.
- [ ] MIME type detection: map extensions to Content-Type.
- [ ] Body parsers: JSON, URL-encoded, multipart/form-data (streaming).
- [ ] Cookie parser/serializer: parse `Cookie`; sign/serialize `Set-Cookie`.
- [ ] URL & query parsing: parse path, query strings, decode params.

### 2. Transport Security (TLS)
- [ ] TLS handshake: X.509 cert parsing, handshake, key exchange (ECDHE).
- [ ] Certificate loading & hot-reload (PEM/PKCS#12, cert rotation).
- [ ] SNI support: multiple host certs on one IP.
- [ ] Strong cipher suites: modern ciphers, perfect forward secrecy.
- [ ] TLS session resumption: session tickets or IDs.

### 3. Secure HTTP Hardening
- [ ] HTTPS-only enforcement.
- [ ] HSTS header.
- [ ] CSP header.
- [ ] `X-Content-Type-Options: nosniff`.
- [ ] `X-Frame-Options`.
- [ ] `Referrer-Policy`.
- [ ] `X-XSS-Protection`.
- [ ] CORS engine.
- [ ] CSRF tokens.
- [ ] Input validation & sanitization.
- [ ] Output encoding.
- [ ] Rate limiting.
- [ ] Connection throttling.
- [ ] Brute-force protection.
- [ ] IP allow/deny lists.
- [ ] Security headers configurator.

### 4. Authentication & Authorization
- [ ] Session management.
- [ ] JWT module.
- [ ] Basic auth.
- [ ] OAuth2 authorization code flow.
- [ ] OpenID Connect discovery (optional).
- [ ] RBAC/ACL engine.
- [ ] Password hashing (PBKDF2/scrypt/Argon2).
- [ ] Multi-factor hooks.

### 5. Performance & Scalability
- [ ] Cluster support.
- [ ] Keep-alive & timeouts.
- [ ] Backpressure handling.
- [ ] Gzip/Deflate compression.
- [ ] Caching layer (LRU, Cache-Control, ETag).
- [ ] Zero-copy file transfers.
- [ ] Graceful shutdown.
- [ ] Load-balancing hooks.
- [ ] HTTP/2 (optional).

### 6. Observability & Monitoring
- [ ] Structured logging.
- [ ] Access logs.
- [ ] Correlation IDs.
- [ ] Metrics endpoint.
- [ ] Prometheus format `/metrics`.
- [ ] Health checks: `/healthz`, `/readyz`.
- [ ] Error reporting.
- [ ] Distributed tracing (W3C Trace Context).

### 7. Testing & Quality Assurance
- [ ] Unit tests.
- [ ] Integration tests.
- [ ] Fuzz testing.
- [ ] Benchmark scripts.
- [ ] Linting & style checker.
- [ ] Static analysis.
- [ ] Security test suite.

### 8. Deployment & Operations
- [ ] Config management (env/files, profiles).
- [ ] Zero-downtime deploy, graceful reload.
- [ ] Docker support.
- [ ] Kubernetes probes.
- [ ] Service discovery hooks.
- [ ] CI/CD pipeline.
- [ ] Versioning & changelogs.
- [ ] Documentation generator.

### 9. Compliance & Governance (optional)
- [ ] GDPR data controls.
- [ ] PII redaction.
- [ ] Audit trails.
- [ ] Cookie consent.

### 10. Advanced & “Nice-to-Have”
- [ ] WebSocket support.
- [ ] SSE.
- [ ] HTTP/3 (QUIC).
- [ ] Plugin architecture.
- [ ] Templating engine.
- [ ] GraphQL endpoint.

## CONTRIBUTING
See [CONTRIBUTING.md](./CONTRIBUTING.md).

## License
MIT
