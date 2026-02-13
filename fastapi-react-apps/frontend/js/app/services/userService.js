/**
 * User Service - API calls for user and deployment management.
 *
 * This service handles user authentication, demo mode, and deployment configuration.
 * All functions return plain data; state updates are handled by hooks.
 */

/**
 * Load deployment type configuration.
 * @returns {Promise<{deployment_env?: string, demo_mode?: boolean, title?: Object, headerColor?: Object}>}
 */
async function loadDeploymentType() {
  return await fetchJson("/api/v1/deployment_type");
}

/**
 * Load current user information.
 * @returns {Promise<{user?: string, username?: string, roles?: string[], app_roles?: Object, groups?: string[]}>}
 */
async function loadCurrentUser() {
  return await fetchJson("/api/v1/current-user");
}

/**
 * Update current user (for demo mode).
 * @param {string} username - Username to switch to
 * @returns {Promise<{user: string}>}
 */
async function updateCurrentUser(username) {
  return await putJson("/api/v1/current-user", { user: username });
}

/**
 * Load available demo users.
 * @returns {Promise<{rows: Array}>}
 */
async function loadDemoUsers() {
  return await fetchJson("/api/v1/demo-users");
}
