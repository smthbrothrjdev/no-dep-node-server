# Contributing to no-dep-node-server

Thanks for helping! This project aims to stay **dependency-free in production** and lean in development. Please follow these guidelines.

## Development setup
1. Use Node **18+** (recommend 20/22).
2. Install dev deps and build:
   ```bash
   npm install
   npm run build
   npm start
   ```
3. Dev loop:
   ```bash
   npm run dev
   ```

## Coding standards
- **TypeScript**, ESM modules (`"type": "module"` in package.json).
- No runtime dependencies. Dev tooling only.
- Prefer native Node APIs:
  - `http`/`http2` or `net` over frameworks
  - `fs/promises`, `path`, `URL`, `stream/web`
- Keep functions small; add doc comments when needed.

## Project structure
- `src/`: TypeScript sources (entrypoint: `src/index.ts`).
- `public/`: static assets.
- `dist/`: build output via `tsc`.

## Commits & PRs
- Branch from `main`. Use names like `feat/*`, `fix/*`, `docs/*`.
- Use Conventional Commits: e.g. `feat: add routing`, `fix: parse chunked bodies`.
- PR descriptions should state:
  - What & why
  - Before/after behavior
  - Trade-offs (especially if suggesting a prod dependency)

## Testing & Checklist tracking
- Add tests where feasible (`node:test`).
- Manual checks:
  - `/healthz` returns `200` JSON
  - Static `public/index.html` works
- Use the **Project Scope / Feature Checklist** in `README.md`:
  - Cross off items as you implement them (`- [x]`).
  - Add a brief note or commit linking your progress to checklist items.

## Lint/format
- Maintain consistency in imports, spacing, and JSDoc.
- Add linting tools later; run them pre-PR when added.

## Security & performance
- Avoid unsafe file paths. Use `path` or `URL`.
- No blocking sync ops.
- Validate inputs on new endpoints.

## When are deps OK?
- **Almost never** in production.
- If you must add one:
  - Explain why and alternatives.
  - Prefer dev dependency.
  - Measure its impact.

## Releasing
- Tag releases `vX.Y.Z`; update README if behavior changes.
- Maintain a `CHANGELOG.md` if changes are frequent.

## Code of Conduct
Be respectful and constructive.
