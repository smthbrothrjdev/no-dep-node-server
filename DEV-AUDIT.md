# Development Checklist Audit

## Purpose 
This document serves to annotate the development decisions thought process in satisfying the project goals as they are done. It is important that the users or contributors understand the dev teams 'definition of done'. The goals of this document are:

1. Document what the team thinks satisfies the requirements set out in the [README.md](./README.md)
2. Serve as a document to explain the "zen" of the projects goals by demonstration
3. Provide a hook for feedback for the team to improve the code base.

> Since this project does not have a dedicated auditing team, we initially will be using AI as the external auditor. Once this project is more mature we will roll over to manual audits.

---

## Non-Goals
- Reimplement Node’s HTTP parser
- Compete with Express/Fastify feature completeness
- Optimize for maximum throughput at this stage

---

## Project Zen
- Prefer explicit over implicit behavior
- Prefer small composable primitives over frameworks
- Leverage Node core where appropriate
- Build only what is required to understand the system

---

## Current Status
We are currently in the early phases of native node implementation of Epic 1: Core HTTP Foundation

### 1. Core HTTP Foundation
- [X] Raw TCP listener
- [ ] HTTP request parser
- [ ] HTTP response serializer
- [ ] Routing layer
- [ ] Middleware pipeline
- [ ] Static file handler
- [ ] MIME detection
- [ ] Body parsers
- [ ] Cookie parser
- [ ] URL & query parsing

---

## Line Items

### Raw TCP Listener

**Status**: Complete (via Node core)

**Assessment**: Acceptable use of Node HTTP server.

**Definition of Done**:
- Server accepts incoming TCP connections
- Graceful shutdown handles open sockets

**Risks**:
- Over-reliance on Node internals (acceptable)

**Priority**: Low

---

### HTTP Request Parser

**Status**: Partial

**Definition of Done**:
- Supports body parsing (JSON at minimum)
- Enforces body size limits
- Handles malformed input safely
- Supports chunked input

**Risks**:
- Unbounded memory usage
- Malformed request crashes

**Priority**: High

---

### HTTP Response Serializer

**Status**: Partial

**Definition of Done**:
- Standard response helpers exist
- Consistent JSON and error responses
- Centralized header management

**Risks**:
- Inconsistent API responses
- Header misconfiguration

**Priority**: Medium

---

### Routing Layer

**Status**: Not Implemented

**Definition of Done**:
- Route registration abstraction exists
- Supports method + path matching
- Supports parameter extraction
- Core loop does not require modification for new routes

**Risks**:
- Tight coupling of logic
- Poor scalability of codebase

**Priority**: High

---

### Middleware Pipeline

**Status**: Not Implemented

**Definition of Done**:
- Chainable request lifecycle exists
- Supports pre/post processing
- Enables reusable logic (auth, logging, etc.)

**Risks**:
- Code duplication
- Hard-to-maintain request flow

**Priority**: High

---

### Static File Handler

**Status**: Mostly Complete

**Definition of Done**:
- Serves files securely
- Prevents path traversal
- Supports caching headers
- Implements ETag

**Risks**:
- Inefficient caching without ETag

**Priority**: Medium

---

### MIME Detection

**Status**: Partial

**Definition of Done**:
- Covers common file types
- Has fallback behavior
- Easily extendable mapping

**Risks**:
- Incorrect content types
- Maintenance burden

**Priority**: Low

---

### Body Parsers

**Status**: Not Implemented

**Definition of Done**:
- JSON parser implemented
- Size limits enforced
- Content-Type validated
- Streaming supported

**Risks**:
- DoS via large payloads
- Invalid data handling

**Priority**: High

---

### Cookie Parser

**Status**: Not Implemented

**Definition of Done**:
- Parses Cookie header
- Serializes Set-Cookie correctly
- Supports security flags (HttpOnly, Secure, SameSite)

**Risks**:
- Insecure session handling
- CSRF exposure (future)

**Priority**: Medium

---

### URL & Query Parsing

**Status**: Partial

**Definition of Done**:
- Centralized URL parsing
- Query string converted to object
- Safe decoding

**Risks**:
- Parsing inconsistencies
- Edge case failures

**Priority**: Medium
