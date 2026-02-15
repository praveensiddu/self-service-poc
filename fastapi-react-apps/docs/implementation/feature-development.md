# Feature Development Guide

## Backend: adding a new feature

1. **Models**: add/extend Pydantic models under `backend/models/`.
2. **Repositories**: implement file I/O under `backend/repositories/`.
3. **Services**: implement orchestration/business logic under `backend/services/`.
4. **Routers**: expose endpoints under `backend/routers/` with RBAC.
5. **Register router**: ensure it’s included in `backend/main.py`.

## Frontend: adding a new feature

1. **Service function**: add API call to `frontend/js/app/services/*Service.js`.
2. **Hook**: add a custom hook under `frontend/js/app/hooks/` or feature-local hooks.
3. **UI**:
   - Container: `*.container.js` for state/effects
   - View: `*.view.js` for rendering
4. **Tables**:
   - Prefer `useTableFilter` for filtering.
   - Prefer `data-testid` attributes for E2E tests.

## Documentation updates

For any user-visible behavior change:

- Update relevant docs under `docs/`.
- Add an ADR if the change introduces a new architectural pattern or a breaking decision.
