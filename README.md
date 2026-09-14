# Issue #17 CI fix 4

Replace only:

`apps/api/test/run-tests.mjs`

This builds `@vexa/shared` before Vitest starts. In a fresh GitHub Actions job the workspace package has no `dist/`, while its `package.json` points `main`/`types` to `dist`. The integration test imports API routes that import `@vexa/shared`, so Vitest cannot resolve the package until it is built.
