"""
Backend test suite for Kubernetes Self-Service Tool.

Contains both E2E and unit tests for the backend API.

Subpackages:
- e2e: End-to-end API tests (requires running server)
- unit: Unit tests (no server required)

RBAC Tests:
- e2e/test_rbac_permissions.py: E2E tests for permission verification
- unit/test_rbac.py: Unit tests for Casbin enforcer logic

Roles Tested:
- platform_admin: Full access to all resources
- role_mgmt_admin: Can manage roles and access requests
- viewall: Read-only access to all resources
- manager: Full access to specific applications (per-app role)
- viewer: Read-only access to specific applications (per-app role)
"""

