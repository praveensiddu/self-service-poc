/**
 * usePermissions Hook - Centralized user permission management.
 *
 * This hook provides computed permission flags for various actions based on
 * the current user's context (roles and app-specific roles).
 *
 * PERMISSION MATRIX (based on Casbin policy):
 * | Action              | platform_admin | manager (global) | manager (app) | viewer | viewall |
 * |---------------------|----------------|------------------|---------------|--------|---------|
 * | Create App          | ✅             | ❌               | ❌            | ❌     | ❌      |
 * | Create Namespace    | ✅             | ✅ (any app)     | ✅ (own app)  | ❌     | ❌      |
 * | Create Cluster      | ✅             | ❌               | ❌            | ❌     | ❌      |
 * | Delete Cluster      | ✅             | ❌               | ❌            | ❌     | ❌      |
 * | Manage App Settings | ✅             | ✅ (any app)     | ✅ (own app)  | ❌     | ❌      |
 *
 * Note: These are client-side checks for UI purposes. Backend always enforces
 * permissions via Casbin RBAC regardless of frontend checks.
 */

/**
 * Custom hook for computing user permissions.
 * @param {Object} params - Hook parameters
 * @param {Object} params.currentUserContext - User context with roles and app_roles
 * @param {string} [params.appName] - Current application name (for app-specific permissions)
 * @returns {Object} - Permission flags
 */
function usePermissions({ currentUserContext, appName = "" }) {
  /**
   * Check if user has platform_admin role.
   */
  const isPlatformAdmin = React.useMemo(() => {
    const roles = currentUserContext?.roles || [];
    return roles.includes("platform_admin");
  }, [currentUserContext?.roles]);

  /**
   * Check if user has global manager role.
   */
  const isGlobalManager = React.useMemo(() => {
    const roles = currentUserContext?.roles || [];
    return roles.includes("manager");
  }, [currentUserContext?.roles]);

  /**
   * Check if user has manager role for a specific app.
   * @param {string} app - Application name
   * @returns {boolean}
   */
  const isAppManager = React.useCallback(
    (app) => {
      if (!app) return false;
      const appRoles = currentUserContext?.app_roles || {};
      const appSpecificRoles = appRoles[app] || [];
      return appSpecificRoles.includes("manager");
    },
    [currentUserContext?.app_roles]
  );

  /**
   * Check if user can manage a specific app (platform_admin, global manager, or app-specific manager).
   * @param {string} app - Application name
   * @returns {boolean}
   */
  const canManageApp = React.useCallback(
    (app) => {
      if (isPlatformAdmin) return true;
      if (isGlobalManager) return true;
      return isAppManager(app);
    },
    [isPlatformAdmin, isGlobalManager, isAppManager]
  );

  // ============================================================================
  // APP PERMISSIONS
  // ============================================================================

  /**
   * Can user create new applications?
   * Only platform_admin can create apps (POST /apps).
   */
  const canCreateApps = React.useMemo(() => {
    return isPlatformAdmin;
  }, [isPlatformAdmin]);

  // ============================================================================
  // NAMESPACE PERMISSIONS
  // ============================================================================

  /**
   * Can user create namespaces for the current app?
   * Requires manager permission on the app (platform_admin, global manager, or app manager).
   */
  const canCreateNamespaces = React.useMemo(() => {
    if (!appName) return false;
    return canManageApp(appName);
  }, [appName, canManageApp]);

  // ============================================================================
  // CLUSTER PERMISSIONS
  // ============================================================================

  /**
   * Can user create clusters?
   * Only platform_admin can create clusters (POST /clusters).
   */
  const canCreateClusters = React.useMemo(() => {
    return isPlatformAdmin;
  }, [isPlatformAdmin]);

  /**
   * Can user delete clusters?
   * Only platform_admin can delete clusters (DELETE /clusters/*).
   */
  const canDeleteClusters = React.useMemo(() => {
    return isPlatformAdmin;
  }, [isPlatformAdmin]);

  // ============================================================================
  // SETTINGS PERMISSIONS
  // ============================================================================

  /**
   * Can user access admin settings?
   * Requires platform_admin or role_mgmt_admin role.
   */
  const canAccessAdminSettings = React.useMemo(() => {
    const roles = currentUserContext?.roles || [];
    return roles.includes("platform_admin") || roles.includes("role_mgmt_admin");
  }, [currentUserContext?.roles]);

  return {
    // Role checks
    isPlatformAdmin,
    isGlobalManager,
    isAppManager,
    canManageApp,

    // App permissions
    canCreateApps,

    // Namespace permissions
    canCreateNamespaces,

    // Cluster permissions
    canCreateClusters,
    canDeleteClusters,

    // Settings permissions
    canAccessAdminSettings,
  };
}

// Make available globally for Babel standalone
if (typeof window !== "undefined") {
  window.usePermissions = usePermissions;
}
