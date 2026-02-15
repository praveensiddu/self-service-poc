# ADR 0001: Layered Backend Architecture (Routers/Services/Repositories)

- **Status**: Accepted
- **Date**: 2026-02-15

## Context

The backend manages workspace repositories and YAML files. Without a consistent structure, features become hard to maintain, test, and extend.

## Decision

Use a layered architecture:

- **Routers**: HTTP request/response boundary, RBAC enforcement
- **Services**: orchestration and business rules
- **Repositories**: file access and YAML read/write

## Consequences

- Improves maintainability and testability.
- Requires discipline to keep routers thin.

## Alternatives considered

- Router-only logic (rejected due to complexity and duplication).
- Full DDD layering (rejected as too heavy for current scope).
