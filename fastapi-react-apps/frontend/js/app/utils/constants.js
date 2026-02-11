/**
 * Application Constants
 *
 * Centralized constants for views, routes, and configuration values.
 * Using constants instead of magic strings improves maintainability and prevents typos.
 */

// View identifiers used in routing
const VIEW = Object.freeze({
  APPS: "apps",
  NAMESPACES: "namespaces",
  NAMESPACE_DETAILS: "namespaceDetails",
  L4_INGRESS: "l4ingress",
  EGRESS_IPS: "egressips",
});

// Top-level tab identifiers
const TAB = Object.freeze({
  HOME: "Home",
  SETTINGS: "Settings",
  REQUEST_PROVISIONING: "Request provisioning",
  PRS_AND_APPROVAL: "PRs and Approval",
  CLUSTERS: "Clusters",
});

// ArgoCD sync strategy options
const ARGOCD_SYNC_STRATEGY = Object.freeze({
  AUTO: "auto",
  MANUAL: "manual",
});

// Egress firewall type options
const EGRESS_TYPE = Object.freeze({
  CIDR_SELECTOR: "cidrSelector",
  DNS_NAME: "dnsName",
});

// Role binding kinds
const ROLE_KIND = Object.freeze({
  ROLE: "Role",
  CLUSTER_ROLE: "ClusterRole",
});

// Subject kinds for role bindings
const SUBJECT_KIND = Object.freeze({
  USER: "User",
  GROUP: "Group",
  SERVICE_ACCOUNT: "ServiceAccount",
});

// Validation constraints
const VALIDATION = Object.freeze({
  MAX_APP_NAME_LENGTH: 22,
  MAX_IP_RANGE_REQUESTED: 256,
});

// Enforcement settings default values
const ENFORCEMENT_DEFAULT = Object.freeze({
  EGRESS_FIREWALL: "yes",
  EGRESS_IP: "yes",
});

// API endpoints base paths (for documentation/reference)
const API = Object.freeze({
  BASE: "/api/v1",
  APPS: "/api/v1/apps",
  CLUSTERS: "/api/v1/clusters",
  CONFIG: "/api/v1/config",
  SETTINGS: "/api/v1/settings",
});
