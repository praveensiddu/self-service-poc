/**
 * RBAC Helper Functions
 *
 * ⚠️ IMPORTANT: These functions duplicate backend Casbin policy logic.
 *
 * RECOMMENDED APPROACH:
 * - Backend should calculate permissions using Casbin and return them in API responses
 * - Frontend should use permissions from backend (e.g., app.permissions.canView)
 * - See: backend/routers/apps.py list_apps() endpoint for example
 *
 * USE THESE HELPERS ONLY WHEN:
 * - Backend hasn't provided permission flags yet
 * - You need client-side filtering without API call
 * - During development/debugging
 * - For temporary/transitional code
 *
 * NOTE: These functions may not perfectly match complex Casbin policies.
 * Always prefer backend-calculated permissions for authoritative decisions.
 *
 * Provides utilities for checking user permissions at the app level.
 * This enables role-based UI controls and access management.
 */

/**
 * Check if user has manager permissions for a specific app.
 * @param {string} appName - Application name to check
 * @param {Object} userContext - User context with roles and app_roles
 * @param {Array<string>} userContext.roles - Global roles
 * @param {Object} userContext.app_roles - App-specific roles (app_name -> [roles])
 * @returns {boolean} - True if user can manage the app
 */
function canManageApp(appName, userContext) {
  if (!appName || !userContext) return false;

  const roles = userContext.roles || [];
  const appRoles = userContext.app_roles || {};

  // Platform admins can manage all apps
  if (roles.includes('platform_admin')) return true;

  // Check for app-specific manager role
  const appSpecificRoles = appRoles[appName] || [];
  return appSpecificRoles.includes('manager');
}

/**
 * Check if user has view permissions for a specific app.
 * @param {string} appName - Application name to check
 * @param {Object} userContext - User context with roles and app_roles
 * @param {Array<string>} userContext.roles - Global roles
 * @param {Object} userContext.app_roles - App-specific roles (app_name -> [roles])
 * @returns {boolean} - True if user can view the app
 */
function canViewApp(appName, userContext) {
  if (!appName || !userContext) return false;

  const roles = userContext.roles || [];
  const appRoles = userContext.app_roles || {};

  // Platform admins can view all apps
  if (roles.includes('platform_admin')) return true;

  // Users with viewall role can view all apps
  if (roles.includes('viewall')) return true;

  // Check for app-specific viewer or manager role
  const appSpecificRoles = appRoles[appName] || [];
  return appSpecificRoles.includes('viewer') || appSpecificRoles.includes('manager');
}

/**
 * Get permission summary for a specific app.
 * @param {string} appName - Application name to check
 * @param {Object} userContext - User context with roles and app_roles
 * @returns {Object} - Permission object with canView and canManage flags
 */
function getAppPermissions(appName, userContext) {
  return {
    canView: canViewApp(appName, userContext),
    canManage: canManageApp(appName, userContext),
  };
}

/**
 * Check if user can create apps (has manager global role or is platform admin).
 * @param {Object} userContext - User context with roles
 * @returns {boolean} - True if user can create apps
 */
function canCreateApps(userContext) {
  if (!userContext) return false;

  const roles = userContext.roles || [];
  return roles.includes('platform_admin') || roles.includes('manager');
}
