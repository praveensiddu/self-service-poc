/**
 * Apps Service - API calls for application management.
 *
 * This service handles CRUD operations for applications.
 * All functions return plain data; state updates are handled by the container.
 */

/**
 * Load all applications for an environment.
 * @param {string} env - Environment name
 * @returns {Promise<Object>} - Object with app names as keys
 */
async function loadApps(env) {
  if (!env) throw new Error("Environment is required.");
  return await fetchJson(`/api/v1/apps?env=${encodeURIComponent(env)}`);
}

/**
 * Create a new application.
 * @param {string} env - Environment name
 * @param {{appname: string, description?: string, managedby?: string}} payload
 * @returns {Promise<Object>} - Created app data
 */
async function createAppApi(env, payload) {
  const appname = String(payload?.appname || "").trim();
  if (!appname) throw new Error("App Name is required.");
  if (!env) throw new Error("Environment is required.");

  return await postJson(`/api/v1/apps?env=${encodeURIComponent(env)}`, {
    appname,
    description: String(payload?.description || ""),
    managedby: String(payload?.managedby || ""),
  });
}

/**
 * Update an existing application.
 * @param {string} env - Environment name
 * @param {string} appname - Application name
 * @param {{description?: string, managedby?: string}} payload
 * @returns {Promise<Object>} - Updated app data
 */
async function updateAppApi(env, appname, payload) {
  const target = String(appname || payload?.appname || "").trim();
  if (!target) throw new Error("App Name is required.");
  if (!env) throw new Error("Environment is required.");

  return await putJson(`/api/v1/apps/${encodeURIComponent(target)}?env=${encodeURIComponent(env)}`, {
    appname: target,
    description: String(payload?.description || ""),
    managedby: String(payload?.managedby || ""),
  });
}

/**
 * Delete an application.
 * @param {string} env - Environment name
 * @param {string} appname - Application name
 * @returns {Promise<Object>} - Deletion result
 */
async function deleteAppApi(env, appname) {
  if (!appname) throw new Error("App Name is required.");
  if (!env) throw new Error("Environment is required.");

  const response = await fetch(
    `/api/v1/apps/${encodeURIComponent(appname)}?env=${encodeURIComponent(env)}`,
    { method: "DELETE", headers: { Accept: "application/json" } }
  );
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to delete ${appname}: ${response.status} ${text}`);
  }
  return await response.json();
}

/**
 * Load requests/changes for an environment.
 * @param {string} env - Environment name
 * @returns {Promise<{apps: string[], namespaces: string[]}>}
 */
async function loadRequestsChanges(env) {
  if (!env) return { apps: [], namespaces: [] };
  try {
    const data = await fetchJson(`/api/v1/requests/changes?env=${encodeURIComponent(env)}`);
    return {
      apps: Array.isArray(data?.apps) ? data.apps.map(String) : [],
      namespaces: Array.isArray(data?.namespaces) ? data.namespaces.map(String) : [],
    };
  } catch {
    return { apps: [], namespaces: [] };
  }
}

/**
 * Extract clusters by app from apps response.
 * @param {Object} appsResponse - Apps response object
 * @returns {Object} - Object with app names as keys and cluster arrays as values
 */
function extractClustersByApp(appsResponse) {
  const result = {};
  for (const [appname, app] of Object.entries(appsResponse || {})) {
    result[appname] = Array.isArray(app?.clusters) ? app.clusters.map(String) : [];
  }
  return result;
}
