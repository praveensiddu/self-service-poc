# Security Guide

## RBAC

- All mutating routes must enforce RBAC (`require_rbac`).
- Prefer aligning RBAC objects with existing policies (e.g., reuse `/clusters` for cluster-related sub-routes).

## Input validation

- Validate query params (e.g., `env`) and required fields.
- Reject unsafe paths; never allow user-controlled path traversal.

## Secrets

- Do not hardcode tokens.
- Prefer environment variables.

## YAML safety

- Use safe YAML parsing (`yaml.safe_load`).
- Treat YAML files as untrusted inputs.
