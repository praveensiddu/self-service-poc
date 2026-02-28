# API Contracts and Conventions

## Versioning

- APIs are served under `/api/v1`.

## Error format

- Prefer FastAPI `HTTPException(detail=...)` where `detail` is a human-readable string.
- Frontend uses centralized parsing in `frontend/js/app/services/apiClient.js`.

## RBAC

- Use Casbin RBAC via `require_rbac(...)`.
- Mutating endpoints must enforce appropriate role permissions.

## Selected endpoints

### Clusters

- `GET /api/v1/clusters?env=<env>`
- `POST /api/v1/clusters?env=<env>`
- `DELETE /api/v1/clusters/{clustername}?env=<env>`
- `GET /api/v1/clusters/datacenters?env=<env>`

### Egress IP allocations (app-level view)

- `GET /api/v1/apps/{app}/egress_ips?env=<env>`
  - returns rows:
    - `cluster: string`
    - `allocation_id: string`
    - `allocated_ips: string[]`
    - `namespaces: string[]`

- `DELETE /api/v1/apps/{app}/egress_ips?env=<env>&cluster=<cluster>&allocation_id=<allocation_id>`
  - allowed only when no namespaces reference the `egress_nameid` suffix.

## Compatibility

- When changing response shapes, keep backward compatibility when feasible or update the UI and docs together.
