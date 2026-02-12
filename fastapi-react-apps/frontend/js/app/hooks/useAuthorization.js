/**
 * useAuthorization Hook - Centralized permission management
 *
 * This hook provides utilities for checking user permissions on resources.
 * It extracts permission logic from components and containers, making it
 * reusable and easier to maintain.
 */

// ============================================
// Permission Extraction Functions
// ============================================

/**
 * Default permissions when none are specified
 */
const DEFAULT_PERMISSIONS = { canView: true, canManage: true };

/**
 * Extract permissions from a resource object
 * @param {Object} resource - Resource object with permissions property
 * @param {Object} defaultPermissions - Default permissions if not specified
 * @returns {Object} - Permissions object with canView and canManage flags
 */
function extractPermissions(resource, defaultPermissions = DEFAULT_PERMISSIONS) {
  return resource?.permissions || defaultPermissions;
}

/**
 * Check if user has permission to view a resource
 * @param {Object} resource - Resource object with permissions
 * @returns {boolean} - True if user can view the resource
 */
function canView(resource) {
  const permissions = extractPermissions(resource);
  return permissions.canView ?? true;
}

/**
 * Check if user has permission to manage (edit/delete) a resource
 * @param {Object} resource - Resource object with permissions
 * @returns {boolean} - True if user can manage the resource
 */
function canManage(resource) {
  const permissions = extractPermissions(resource);
  return permissions.canManage ?? true;
}

/**
 * Calculate create permission from a collection of resources
 * Since create is typically an app-level permission, we check the first
 * resource's canManage permission or default to true if no resources exist.
 *
 * @param {Array} resources - Array of resource objects
 * @param {boolean} readonly - Whether the app is in readonly mode
 * @returns {boolean} - True if user can create resources
 */
function canCreate(resources, readonly = false) {
  if (readonly) return false;

  // If resources exist, use the first one's canManage permission
  if (Array.isArray(resources) && resources.length > 0) {
    return canManage(resources[0]);
  }

  // If no resources exist yet, allow create (backend will enforce)
  return true;
}

// ============================================
// Response Parsing Functions
// ============================================

/**
 * Parse API response with items and permissions format
 * Handles both new format { items: [...], permissions: {...} } and legacy array format
 *
 * @param {Object|Array} response - API response
 * @param {string} dataKey - Key for data in response (default: "items")
 * @returns {Object} - { items: Array, permissions: Object }
 */
function parseItemsResponse(response, dataKey = "items") {
  // If response has the new format with data key and permissions
  if (response && typeof response === 'object' && response[dataKey] !== undefined) {
    return {
      items: Array.isArray(response[dataKey]) ? response[dataKey] : [],
      permissions: extractPermissions(response)
    };
  }

  // Legacy format - just an array or object without permissions
  if (Array.isArray(response)) {
    return {
      items: response,
      permissions: DEFAULT_PERMISSIONS
    };
  }

  // Unknown format - return safe defaults
  return {
    items: [],
    permissions: DEFAULT_PERMISSIONS
  };
}

/**
 * Parse API response with nested data structure and permissions
 * Handles format like { clusters: { DEV: [...], QA: [...] }, permissions: {...} }
 *
 * @param {Object} response - API response
 * @param {string} dataKey - Key for nested data in response
 * @returns {Object} - { data: Object, permissions: Object }
 */
function parseNestedResponse(response, dataKey) {
  // If response has the new format with data key and permissions
  if (response && typeof response === 'object' && response[dataKey] !== undefined) {
    return {
      data: response[dataKey],
      permissions: extractPermissions(response)
    };
  }

  // Legacy format - treat entire response as data
  return {
    data: response || {},
    permissions: DEFAULT_PERMISSIONS
  };
}

// ============================================
// UI Helper Functions
// ============================================

/**
 * Get UI styles for a resource based on permissions
 * @param {Object} resource - Resource object with permissions
 * @returns {Object} - Style object with opacity and cursor
 */
function getResourceStyles(resource) {
  const hasView = canView(resource);
  return {
    opacity: hasView ? 1 : 0.4,
    cursor: hasView ? 'pointer' : 'default',
    isClickable: hasView,
  };
}

/**
 * Get button styles based on permission
 * @param {boolean} hasPermission - Whether user has permission
 * @returns {Object} - Style object for buttons
 */
function getButtonStyles(hasPermission) {
  return {
    opacity: hasPermission ? 1 : 0.4,
    cursor: hasPermission ? 'pointer' : 'not-allowed',
    pointerEvents: hasPermission ? 'auto' : 'none',
    disabled: !hasPermission,
  };
}

/**
 * Get permission-based props for interactive elements
 * @param {boolean} hasPermission - Whether user has permission
 * @param {string} disabledTitle - Tooltip text when disabled
 * @returns {Object} - Props object for buttons/interactive elements
 */
function getPermissionProps(hasPermission, disabledTitle = "No permission") {
  return {
    disabled: !hasPermission,
    "aria-disabled": !hasPermission,
    title: hasPermission ? undefined : disabledTitle,
    style: getButtonStyles(hasPermission),
  };
}

// ============================================
// Error Handling Functions
// ============================================

/**
 * Check if an error is a permission denied error
 * @param {Error|string} error - The error to check
 * @returns {boolean} - True if error is permission-related
 */
function isPermissionError(error) {
  const errorMessage = error?.message || String(error);
  return (
    errorMessage.includes("Access denied") ||
    errorMessage.includes("403") ||
    errorMessage.includes("Forbidden") ||
    errorMessage.includes("permission")
  );
}

/**
 * Handle permission denied errors gracefully
 * Shows user-friendly alert for 403/Forbidden errors, otherwise rethrows
 *
 * @param {Error} error - The error object
 * @param {string} action - The action that was attempted (e.g., "delete", "create")
 * @param {string} resourceType - Type of resource (e.g., "namespaces", "apps")
 * @param {string} resourceName - Name of the resource (e.g., app name)
 * @param {Function} setError - Function to set error state for modal
 * @param {Function} setShowErrorModal - Function to show error modal
 * @returns {boolean} - True if error was a permission error and was handled
 */
function handlePermissionError(error, action, resourceType, resourceName, setError, setShowErrorModal) {
  if (isPermissionError(error)) {
    // Show user-friendly alert
    alert(
      `Access Denied: You don't have permission to ${action} ${resourceType} in "${resourceName}". ` +
      `Please contact your administrator to request manager access.`
    );

    // Return true to indicate error was handled (don't show error modal)
    return true;
  }

  // Not a permission error - show in error modal
  const errorMessage = error?.message || String(error);
  if (setError && setShowErrorModal) {
    setError(errorMessage);
    setShowErrorModal(true);
  }

  return false;
}

// ============================================
// Hook Definition
// ============================================

/**
 * Custom hook for authorization utilities
 * @returns {Object} - Object with permission checking functions
 */
function useAuthorization() {
  return {
    // Permission checking functions
    extractPermissions,
    canView,
    canManage,
    canCreate,

    // Response parsing functions
    parseItemsResponse,
    parseNestedResponse,

    // UI helper functions
    getResourceStyles,
    getButtonStyles,
    getPermissionProps,

    // Error handling
    isPermissionError,
    handlePermissionError,

    // Constants
    DEFAULT_PERMISSIONS,
  };
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = useAuthorization;
}

// Make available globally for Babel standalone
if (typeof window !== 'undefined') {
  window.useAuthorization = useAuthorization;
}
