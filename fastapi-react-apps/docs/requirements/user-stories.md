# User Stories

## Applications

- As a user, I can list applications by environment.
- As a manager, I can create a new application.
- As a manager, I can update an application (metadata/settings).
- As a manager, I can delete an application.

## Namespaces

- As a user, I can list namespaces for an application.
- As a manager, I can create a namespace under an application.
- As a manager, I can copy a namespace configuration.
- As a manager, I can delete a namespace.
- As a manager, I can edit namespace configuration blocks:
  - basic info
  - resource quota
  - limit range
  - role bindings
  - egress firewall
  - egress IP configuration

## Clusters

- As a user, I can list clusters available per environment.
- As a platform admin, I can add/edit cluster definitions.
- As a platform admin, I can delete clusters only when safe.
- As a platform admin, I can choose a datacenter for a cluster from an environment-scoped list.

## Networking

- As a manager, I can view L4 ingress IP requests and allocations.
- As a manager, I can view Egress IP allocations per cluster.
- As a manager, I can release an unused Egress IP allocation to free pool.

## Governance

- As an admin, I can toggle enforcement settings.
- As an admin, I can run the portal in read-only mode.
- As an admin, I can manage access requests and roles.
