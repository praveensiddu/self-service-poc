# Architecture

## System overview

This repository contains a FastAPI backend that serves both:

- REST APIs under `/api/v1/...`
- Static frontend assets (React via script tags + Babel standalone)

The system operates against a workspace containing cloned Git repositories (requests/control/templates/rendered). The API modifies YAML in these repos; external GitOps automation is responsible for turning requests into rendered output and cluster state.

## Component diagram

```mermaid
flowchart LR
  Browser[Browser UI] -->|HTTP| FastAPI[FastAPI Server]

  FastAPI -->|read/write YAML| Workspace[(Workspace FS)]
  Workspace --> Requests[Requests Repo]
  Workspace --> Control[Control Repo]
  Workspace --> Templates[Templates Repo]
  Workspace --> Rendered[Rendered Repo]

  FastAPI --> RBAC[Casbin RBAC]
```

## Backend layering

```mermaid
flowchart TB
  R[Routers] --> S[Services]
  S --> Repo[Repositories]
  Repo --> FS[Workspace YAML + Git repos]
```

## Key flows

### Egress IP allocation view + release

```mermaid
sequenceDiagram
  participant UI as UI
  participant API as API
  participant FS as Workspace YAML

  UI->>API: GET /api/v1/apps/{app}/egress_ips?env=dev
  API->>FS: Read rendered_dev/ip_provisioning/*/egressip-allocated.yaml
  API->>FS: Read requests/dev/{app}/*/namespace_info.yaml
  API-->>UI: rows (cluster, allocation_id, allocated_ips, namespaces)

  UI->>API: DELETE /api/v1/apps/{app}/egress_ips?env=dev&cluster=01&allocation_id=...
  API->>FS: Validate no namespaces reference egress_nameid
  API->>FS: Remove key from rendered_dev/ip_provisioning/{cluster}/egressip-allocated.yaml
  API-->>UI: {deleted:true}
```

## Constraints

- Workspace must be initialized and repos cloned.
- Rendered repo is treated as output/state store for allocations.
- UI is served as static assets; no build pipeline is required.
