# Coverage Report

Generate backend coverage:

```bash
npm --workspace apps/api run test:coverage
```

Artifacts:

- Console summary in terminal output
- HTML report at `apps/api/coverage/index.html`
- LCOV report at `apps/api/coverage/lcov.info`

Use your CI pipeline to upload `apps/api/coverage` as an artifact.
