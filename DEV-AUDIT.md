# Development Checklist Audit: Epic 1 Core HTTP Foundation

## Purpose
This document records the development team's audit of progress toward the project goals in [README.md](./README.md), with additional contributor expectations from [CONTRIBUTING.md](./CONTRIBUTING.md). It is meant to:

1. Document what satisfies each requirement in the README project checklist.
2. Explain the project's "zen" through concrete implementation decisions.
3. Provide a feedback hook for improving the codebase before later epics build on it.

> Since this project does not have a dedicated auditing team, we initially use AI-assisted review as an external audit. Once this project is more mature, this should roll over to a human/manual audit process.

---

## Scope

This audit remains focused on **Epic 1: Core HTTP Foundation**. Items from later epics may be mentioned only when they affect Epic 1 readiness, documentation accuracy, or contributor workflow.

### Source Inputs Reviewed

- `README.md` project goals, setup, configuration, usage examples, and Epic 1 checklist.
- `CONTRIBUTING.md` production dependency policy, coding standards, manual checks, and checklist tracking guidance.
- Current source tree, especially `src/index.ts`, `src/endpoints/res.ts`, `src/perf/metrics.ts`, and `src/utils/cliFlags.ts`.
- `package.json` scripts and dependency posture.

---

## Non-Goals

- Reimplement Node's internal HTTP parser in the immediate term.
- Compete with Express/Fastify feature completeness.
- Optimize for maximum throughput before the foundation is correct, documented, and testable.
- Add production dependencies to close gaps that can reasonably be handled with Node core.

---

## Project Zen

- **Dependency discipline:** no production dependencies; TypeScript and Node typings are dev-only.
- **Node-core first:** use native `http`, `fs`, `path`, timers, and process lifecycle primitives before introducing abstractions.
- **Explicit behavior:** request handling should be easy to trace from entrypoint to response.
- **Small composable primitives:** pull reusable concerns out of the main request callback when they become stable.
- **Safety before breadth:** path handling, body limits, malformed input handling, and predictable response shapes matter more than broad framework-like features.
- **Documentation must match behavior:** README examples and checklist state should reflect the runnable server, not desired future state.

---

## Current Repository Status

The repository is still in the early phase of Epic 1, but it has moved beyond a placeholder server. The current implementation uses Node's built-in `http.createServer`, serves static assets from a compiled `dist/public` directory, exposes a `/healthz` endpoint, includes basic MIME detection, supports `GET` and `HEAD` for static files, handles `If-Modified-Since`, applies a short cache policy, tracks sockets for graceful shutdown, and has optional console performance metrics.

Important current-state observations:

- The README says `STATIC_DIR` can configure the static path, but the implementation currently hardcodes `PUBLIC_DIR` to `join(__dirname, 'public')`.
- The README says `/healthz` returns `200` JSON, but the implementation currently returns HTML from `src/endpoints/res.ts` and sets `Content-Type: text/html`.
- The README project checklist is not yet marked to reflect implemented partials. Per CONTRIBUTING.md, implemented checklist items should be crossed off with brief progress notes.
- There are no automated tests yet, and `npm test` is currently a failing placeholder.

---

## Epic 1 Checklist Re-Evaluation

### 1. Core HTTP Foundation

- [x] Raw TCP listener: accept incoming socket connections.  
  **Audit status:** Complete via Node's `http.createServer`, with explicit socket tracking for shutdown.
- [~] HTTP/1.1 request parser: parse start-line, headers, and body (`Content-Length`, chunked).  
  **Audit status:** Partial via Node core for start-line/headers/basic HTTP handling; no project-owned body parsing, limits, or explicit chunked-body behavior.
- [~] HTTP/1.1 response serializer: format status line, headers, body (chunked).  
  **Audit status:** Partial via direct `res.writeHead`/`res.end` calls; no centralized response helper or consistent error/JSON serializer.
- [ ] Routing layer: match method + path (params, wildcards, regex).  
  **Audit status:** Not implemented; route checks are inline in `src/index.ts`.
- [ ] Middleware pipeline: chainable handlers (logging, auth, body parsing).  
  **Audit status:** Not implemented; metrics hook is an inline lifecycle listener, not reusable middleware.
- [~] Static file handler: serve files; handle `If-Modified-Since` / ETag.  
  **Audit status:** Partial-to-mostly complete for safe file serving and `If-Modified-Since`; ETag is missing.
- [~] MIME type detection: map extensions to `Content-Type`.  
  **Audit status:** Partial; common mappings exist inline, but there is no standalone/extensible module or tests.
- [ ] Body parsers: JSON, URL-encoded, multipart/form-data (streaming).  
  **Audit status:** Not implemented.
- [ ] Cookie parser/serializer: parse `Cookie`; sign/serialize `Set-Cookie`.  
  **Audit status:** Not implemented.
- [~] URL & query parsing: parse path, query strings, decode params.  
  **Audit status:** Partial; static-file path strips query/hash and decodes path, but no centralized URL/query abstraction exists.

Legend: `[x]` complete, `[~]` partial, `[ ]` not implemented.

---

## Line Items

### Raw TCP Listener

**Status:** Complete via Node core

**Current Evidence:**
- `http.createServer` accepts incoming HTTP connections.
- `server.listen(PORT)` binds the server.
- `server.on('connection')` tracks sockets.
- `SIGINT`/`SIGTERM` handlers close the server and destroy remaining sockets after a timeout.
- `keepAliveTimeout` and `headersTimeout` are set to helpful defaults.

**Assessment:** Acceptable for this project's current direction. The README's phrase "Raw TCP listener" can be interpreted as a low-level `net` implementation, but the audit's non-goals and project zen support using Node core HTTP while the project explores server foundations without framework dependencies.

**Definition of Done:**
- Server accepts incoming TCP connections. **Met.**
- Server starts on configured/default port. **Met for `PORT`.**
- Graceful shutdown handles open sockets. **Met.**
- No production dependencies are required. **Met.**

**Remaining Work:**
- Decide whether README wording should remain "Raw TCP listener" or clarify "Node core HTTP listener" for Epic 1.
- Add integration tests that start the server on an ephemeral port and assert it accepts requests.

**Risks:**
- If the project later intends to teach raw socket parsing, relying on `http.createServer` may not satisfy that educational goal.

**Priority:** Low

---

### HTTP Request Parser

**Status:** Partial

**Current Evidence:**
- Node core parses method, URL, headers, and stream framing into `IncomingMessage`.
- Static handling reads `req.method`, `req.url`, and request headers.
- No request-body parser exists for JSON, URL-encoded, multipart, or raw bodies.
- No explicit body size limits are enforced at the application layer.

**Assessment:** Sufficient for static files and a simple health endpoint, but not sufficient for the README's Epic 1 request-parser checklist. Current behavior depends on Node's parser and does not expose a project-owned parsing abstraction.

**Definition of Done:**
- Supports body parsing, JSON at minimum. **Not met.**
- Enforces body size limits. **Not met.**
- Handles malformed input safely and predictably. **Partially met by Node core, not audited at app layer.**
- Supports chunked input where relevant. **Not met at body-parser layer.**
- Produces clear `400`/`413` style errors for invalid input. **Not met.**

**Recommended Next Step:**
- Add a small body-reading utility based on async iteration over `IncomingMessage` with a byte limit, content-type validation, and JSON parse errors mapped to consistent responses.

**Risks:**
- Future endpoints may accidentally buffer unbounded bodies.
- Malformed JSON/body handling may become inconsistent if each route implements parsing independently.

**Priority:** High

---

### HTTP Response Serializer

**Status:** Partial

**Current Evidence:**
- Responses are sent directly with `res.writeHead`, `res.end`, and stream piping.
- Static files set `Content-Type`, `Content-Length`, `Last-Modified`, `Cache-Control`, and `X-Content-Type-Options`.
- `/healthz` returns HTML, while README documents JSON.
- 404 and stream errors use plain text.

**Assessment:** Node serializes the wire format correctly, but the project lacks a response abstraction. The mismatch between README and `/healthz` behavior should be resolved before marking this complete.

**Definition of Done:**
- Standard response helpers exist. **Not met.**
- Consistent JSON and error responses. **Not met.**
- Centralized header management for common headers. **Partially met for static responses only.**
- `HEAD` responses avoid a body while preserving headers. **Met for static files.**

**Recommended Next Step:**
- Introduce small helpers such as `sendText`, `sendJson`, `sendNotFound`, and `sendError`, then update `/healthz` to match README or update README to match intentional HTML behavior.

**Risks:**
- Inconsistent content types and response bodies.
- Security headers may be applied unevenly.

**Priority:** Medium

---

### Routing Layer

**Status:** Not Implemented

**Current Evidence:**
- Static file handling is tried first.
- `/healthz` is checked with a direct inline `if` statement.
- Fallback 404 is inline.
- There is no route registry, parameter extraction, wildcard matching, or regex support.

**Assessment:** Inline routing is acceptable for the current small server but does not satisfy the README criterion. As soon as a second API endpoint is added, the project should introduce a minimal routing primitive.

**Definition of Done:**
- Route registration abstraction exists. **Not met.**
- Supports method + path matching. **Only inline, not abstracted.**
- Supports params, wildcards, and optionally regex. **Not met.**
- Core server loop does not need modification for every new route. **Not met.**

**Recommended Next Step:**
- Add a no-dependency router that registers `{ method, pattern, handler }` entries and returns params/query context. Keep the first version intentionally small.

**Risks:**
- The entrypoint will become a long chain of route conditionals.
- Future middleware/body parsing work may couple too tightly to route-specific code.

**Priority:** High

---

### Middleware Pipeline

**Status:** Not Implemented

**Current Evidence:**
- Metrics are attached with `res.on('finish')` directly in the request callback.
- There is no `next()` chain, composition function, or request context object.
- Static serving, health response, and fallback behavior are ordered manually.

**Assessment:** A full Express-style pipeline is not needed, but Epic 1 requires chainable handlers. A small composition primitive would support logging, metrics, body parsing, security headers, and future auth without adding dependencies.

**Definition of Done:**
- Chainable request lifecycle exists. **Not met.**
- Supports pre-processing and post-processing. **Not met, except ad hoc `finish` listener.**
- Enables reusable logging/auth/body parsing logic. **Not met.**
- Handles async errors consistently. **Not met.**

**Recommended Next Step:**
- Implement a minimal middleware signature and context, then migrate metrics and common response headers into middleware-like functions.

**Risks:**
- Request flow becomes harder to reason about as endpoints grow.
- Duplicate security and error handling logic.

**Priority:** High

---

### Static File Handler

**Status:** Partial / Mostly Complete

**Current Evidence:**
- Serves `GET` and `HEAD`.
- Resolves `/` to `/index.html`.
- Uses `decodeURIComponent`, `normalize`, `resolve`, `relative`, and `isAbsolute` to reduce path traversal risk.
- Serves directory `index.html` when a directory is requested.
- Streams files with `createReadStream` rather than reading the whole file.
- Handles `If-Modified-Since` and returns `304` where applicable.
- Adds `Cache-Control`, `Last-Modified`, and `X-Content-Type-Options`.
- Does not implement ETag.
- Does not honor README's documented `STATIC_DIR` environment variable.

**Assessment:** This is one of the strongest Epic 1 areas. The main blockers are ETag support, tests for traversal/conditional requests, and documentation/configuration alignment.

**Definition of Done:**
- Serves files securely. **Mostly met; needs tests.**
- Prevents path traversal. **Implemented; needs tests for encoded traversal and edge cases.**
- Supports `GET` and `HEAD`. **Met.**
- Supports caching headers. **Partially met.**
- Implements `If-Modified-Since`. **Met.**
- Implements ETag. **Not met.**
- Honors configured static directory. **Not met despite README.**

**Recommended Next Step:**
- Add weak ETags based on size and mtime, handle `If-None-Match`, and wire `STATIC_DIR` safely.

**Risks:**
- `decodeURIComponent` can throw on malformed escapes; currently that would be caught only by the outer async server behavior if not explicitly handled.
- `isInside` returns false when parent and child are equal; this is okay for files but should be consciously tested with directory paths.
- Static-directory configuration mismatch can confuse users and contributors.

**Priority:** Medium

---

### MIME Detection

**Status:** Partial

**Current Evidence:**
- Inline `guessMime` covers common text, script, image, icon, and JSON extensions.
- Fallback is `application/octet-stream`.
- Mapping is not exported or tested.

**Assessment:** Good enough for current `public/` assets, but should be extracted and tested before being considered complete.

**Definition of Done:**
- Covers common file types needed by `public/`. **Met for current assets.**
- Provides safe fallback. **Met.**
- Easily extendable mapping. **Partially met; inline map is easy to edit but not modular.**
- Has unit tests. **Not met.**

**Recommended Next Step:**
- Move MIME mapping to a small utility module and test common extensions plus fallback behavior.

**Risks:**
- Incorrect content types for future assets.
- Inline growth in `src/index.ts`.

**Priority:** Low

---

### Body Parsers

**Status:** Not Implemented

**Current Evidence:**
- No endpoints consume request bodies.
- No parser modules exist.

**Assessment:** This is a major remaining Epic 1 gap. It should be implemented only after basic response helpers are available so errors are consistent.

**Definition of Done:**
- JSON parser implemented. **Not met.**
- URL-encoded parser implemented. **Not met.**
- Multipart/form-data parser strategy documented or implemented streaming-first. **Not met.**
- Size limits enforced. **Not met.**
- Content-Type validated. **Not met.**
- Invalid payloads produce safe client errors. **Not met.**

**Recommended Next Step:**
- Start with JSON only: `readBody(req, { limitBytes })` and `readJson(req, opts)`. Defer multipart until routing/middleware abstractions exist.

**Risks:**
- DoS from unbounded buffering when POST/PUT endpoints are introduced.
- Inconsistent validation and parse errors.

**Priority:** High

---

### Cookie Parser / Serializer

**Status:** Not Implemented

**Current Evidence:**
- No cookie parsing or `Set-Cookie` helper exists.
- No current endpoints need cookies.

**Assessment:** Not required for today's server behavior, but it is explicitly listed in Epic 1 and will matter before auth/session work in later epics.

**Definition of Done:**
- Parses `Cookie` header into a predictable object/map. **Not met.**
- Serializes `Set-Cookie` correctly. **Not met.**
- Supports `HttpOnly`, `Secure`, `SameSite`, `Path`, `Domain`, `Max-Age`, and `Expires`. **Not met.**
- Signing strategy is documented before implementation. **Not met.**

**Recommended Next Step:**
- Implement unsigned parse/serialize helpers first; defer signing until auth/session requirements are clearer.

**Risks:**
- Incorrect cookie serialization can create security issues in future authentication work.

**Priority:** Medium

---

### URL & Query Parsing

**Status:** Partial

**Current Evidence:**
- Static handler splits `req.url` on `?` and `#`.
- The decoded path is normalized before file resolution.
- There is no centralized parser returning path, query params, hash-stripped path, or decoded route params.

**Assessment:** Current behavior is enough for static file lookup, but not enough for routing or API endpoints. A central parser should be added before expanding routes.

**Definition of Done:**
- Centralized URL parsing. **Not met.**
- Query string converted to object or `URLSearchParams`. **Not met.**
- Safe decoding with malformed-URL handling. **Partially met but fragile.**
- Shared between router and static handler. **Not met.**

**Recommended Next Step:**
- Use Node's `URL` with a local base to parse request URLs, catch malformed values, and pass `pathname`/`searchParams` through request context.

**Risks:**
- Parsing inconsistencies between static files and future API routes.
- Malformed percent-encoding can cause unexpected 500s if not handled.

**Priority:** Medium

---

## Documentation and Contributor Workflow Findings

### README Alignment

**Status:** Needs Update

The README is mostly directionally accurate, but current behavior differs in a few contributor-visible ways:

- `STATIC_DIR` is documented but not implemented.
- `/healthz` is documented as JSON but currently returns HTML.
- `npm run dev` is documented, but `package.json` currently provides `watch`, `start`, `start:perf`, and no `dev` script.
- The checklist remains unchecked even for areas with partial or complete implementation.

**Recommendation:** Either update README to match current behavior or update code/scripts to match README. CONTRIBUTING.md asks contributors to keep checklist progress current, so documentation drift should be treated as a quality issue.

### Testing Alignment

**Status:** Needs Implementation

CONTRIBUTING.md asks for tests where feasible and manual checks for `/healthz` and static `public/index.html`. Current automated coverage is absent, and `npm test` intentionally fails.

**Recommendation:** Add `node:test` integration tests for:

- `/healthz` status and content type.
- `/` serving the compiled public index.
- `HEAD /` returning headers without a body.
- traversal attempts returning non-file responses.
- `If-Modified-Since` returning `304` for unchanged files.

---

## Suggested Next Milestones for Epic 1

1. **Fix documentation/runtime mismatches:** choose whether `/healthz` is JSON or HTML, add or remove `STATIC_DIR`, and align package scripts with README.
2. **Extract response helpers:** centralize JSON, text, error, and not-found responses.
3. **Add URL parsing utility:** safe `URL` parsing with consistent `pathname` and `searchParams` behavior.
4. **Add minimal router:** method + path matching first; params/wildcards next.
5. **Add tests using `node:test`:** especially for static serving and health checks.
6. **Add body-size-limited JSON parser:** do this before any new write endpoints.
7. **Finish static caching:** implement ETag and `If-None-Match`.
8. **Extract MIME utility:** make it testable and reusable.

---

## Audit Conclusion

Epic 1 is **partially complete**. The project has a working dependency-free Node server with meaningful static hosting, graceful shutdown, basic health handling, and optional performance logging. However, Epic 1 should not be considered complete until routing, middleware, response helpers, body parsing, cookie handling, centralized URL/query parsing, ETag support, and tests are in place.

The most important near-term action is to reduce drift between README/CONTRIBUTING expectations and runtime behavior. Once documentation, tests, and small primitives are aligned, the project will have a stronger foundation for later security, authentication, observability, and operations epics.
