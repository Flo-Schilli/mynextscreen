## What this changes, and why

## How it was verified
<!-- Which tests, and what you ran by hand. "CI is green" on its own is not a
     verification of behaviour. -->

## Checklist
- [ ] Tests that would fail without this change
- [ ] `npx nx run-many -t typecheck lint format:check test build` passes
- [ ] Multi-tenancy enforced server-side, not hidden in the UI
- [ ] No credentials in URLs, logs or the DOM
- [ ] I have read and accept [CLA.md](../CLA.md), and my commits are signed off
