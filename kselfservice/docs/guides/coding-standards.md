# Coding Standards

## Backend (Python)

- Follow PEP8.
- Prefer type hints for public functions.
- Keep routers thin; business logic belongs in services.
- Keep file I/O in repositories/utilities.
- Raise `HTTPException` with clear `detail` for user-facing errors.

## Frontend (JS)

- Container/View separation:
  - Container: state + effects
  - View: rendering only
- Centralize network calls in service modules.
- Use `useCallback`/`useMemo` appropriately to avoid re-render issues.

## Naming

- Routes: use consistent plural nouns (`/clusters`, `/apps`).
- UI views: `feature/Table.container.js` and `feature/Table.view.js`.

## Comments and docs

- Prefer small, clear functions over heavy commenting.
- When behavior is non-obvious, document in `docs/` and/or ADR.
