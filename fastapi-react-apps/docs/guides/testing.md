# Testing Guide

## What exists

- Backend E2E tests under `backend/tests/e2e/`.
- Frontend E2E tests under `frontend/e2e/` (Playwright).

See `test/TESTING.md` for commands and troubleshooting.

## Practices

- Add `data-testid` attributes for stable selectors.
- Prefer testing user-visible behavior rather than internal implementation.
- For API changes, add/adjust backend E2E tests.
