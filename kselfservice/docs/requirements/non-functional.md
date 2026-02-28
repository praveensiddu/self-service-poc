# Non-Functional Requirements

## Security

- RBAC enforced on all mutating endpoints.
- All file access must be constrained to workspace roots.
- No secrets committed in repo; tokens via environment variables.

## Reliability

- API must handle missing YAML files and absent repos gracefully.
- Clear error messages for user-facing operations.

## Observability

- Request/response logging with correlation of request path, status, and timing.
- Errors surfaced in UI via modal.

## Performance

- UI should avoid loading heavy datasets repeatedly; cache where safe.
- YAML reads should be scoped and efficient (avoid scanning entire workspace on every request unless necessary).

## Maintainability

- Follow layered backend architecture (routers/services/repositories).
- Prefer feature-based organization on frontend.
- Changes must be documented (see ADRs).
