# Workspace Data Model

## Workspace root

The API operates on a workspace directory that contains cloned repositories under:

- `workspace/kselfserv/cloned-repositories/`

## Requests repository (conceptual)

Environment-scoped app + namespace configuration.

Example (conceptual):

```
requests/<env>/<app>/
  appinfo.yaml
  <namespace>/
    namespace_info.yaml
    resourcequota.yaml
    limitrange.yaml
    rolebinding_requests.yaml
    egress_firewall_requests.yaml
    nsargocd.yaml
```

### Namespace info

`namespace_info.yaml` may include:

- `egress_nameid`: string used to reserve/share an Egress IP.

## Control repository

Cluster inventory and platform settings.

- Clusters are defined in env-scoped YAML (see `backend/README.md`).
- Datacenters are defined as:

`control/datacenters/<env>_datacenters.yaml`

Supported format:

```yaml
- location: virginia
  description: virginia USA datacenter
- location: ohio
  description: ohio USA datacenter
```

## Rendered repository

Automation output; also used by the UI/API for viewing allocations.

### Egress IP allocation state

- `rendered_<env>/ip_provisioning/<cluster>/egressip-allocated.yaml`

Structure (example):

```yaml
app1_foo:
  - 1.2.3.4
app1_bar:
  - 5.6.7.8
```

Where the map key is `allocation_id = <app>_<egress_nameid>`.
