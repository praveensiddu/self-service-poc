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
 * @param {{appname: string, description?: string}} payload
 * @returns {Promise<Object>} - Created app data
 */
async function createAppApi(env, payload) {
  const appname = safeTrim(payload?.appname);
  if (!appname) throw new Error("App Name is required.");
  if (!env) throw new Error("Environment is required.");

  return await postJson(`/api/v1/apps?env=${encodeURIComponent(env)}`, {
    appname,
    description: safeTrim(payload?.description),
  });
}

/**
 * Update an existing application.
 * @param {string} env - Environment name
 * @param {string} appname - Application name
 * @param {{description?: string}} payload
 * @returns {Promise<Object>} - Updated app data
 */
async function updateAppApi(env, appname, payload) {
  const target = safeTrim(appname || payload?.appname);
  if (!target) throw new Error("App Name is required.");
  if (!env) throw new Error("Environment is required.");

  return await putJson(`/api/v1/apps/${encodeURIComponent(target)}?env=${encodeURIComponent(env)}`, {
    appname: target,
    description: safeTrim(payload?.description),
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

  return await deleteJson(
    `/api/v1/apps/${encodeURIComponent(appname)}?env=${encodeURIComponent(env)}`
  );
}

/**
 * Commit/push latest request state for an app/env and open a PR.
 * @param {string} env - Environment name
 * @param {string} appname - Application name
 * @returns {Promise<Object>} - Pull request status response
 */
async function commitPushAppRequest(env, appname) {
  const target = safeTrim(appname);
  if (!target) throw new Error("App Name is required.");
  if (!env) throw new Error("Environment is required.");

  return await postJson(
    `/api/v1/apps/${encodeURIComponent(target)}/pull_request/commit_push?env=${encodeURIComponent(env)}`,
    {}
  );
}

/**
 * Create an access request for an application.
 * @param {{application: string, role: "viewer"|"manager", userid?: string, group?: string}} payload
 * @returns {Promise<Object>} - Created access request
 */
async function createAppAccessRequest(payload) {
  const application = safeTrim(payload?.application);
  const role = safeTrim(payload?.role);
  const userid = safeTrim(payload?.userid);
  const group = safeTrim(payload?.group);
  if (!application) throw new Error("Application is required.");
  if (!role) throw new Error("Role is required.");
  if (Boolean(userid) === Boolean(group)) throw new Error("Exactly one of Userid or Group is required.");

  return await postJson("/api/v1/app_access", {
    application,
    role,
    userid: userid || undefined,
    group: group || undefined,
  });
}

/**
 * Load access requests.
 * @returns {Promise<Array>} - List of access requests
 */
async function loadAccessRequests() {
  return await fetchJson("/api/v1/access_requests");
}

async function lookupUserRoles(userid) {
  const userId = safeTrim(userid);
  if (!userId) throw new Error("Userid is required.");
  return await fetchJson(`/api/v1/role-management/user/roles?userid=${encodeURIComponent(userId)}`);
}

async function grantAppAccessRequest(payload) {
  const userid = safeTrim(payload?.userid);
  const group = safeTrim(payload?.group);
  const app = safeTrim(payload?.application);
  const role = safeTrim(payload?.role);
  if (Boolean(userid) === Boolean(group)) throw new Error("Exactly one of Userid or Group is required.");
  if (!app) throw new Error("Application is required.");
  if (!role) throw new Error("Role is required.");

  return await postJson("/api/v1/role-management/app/assign", { userid: userid || undefined, group: group || undefined, app, role });
}

async function grantGlobalAccessRequest(payload) {
  const group = safeTrim(payload?.usr_or_grp);
  const role = safeTrim(payload?.role);
  if (!group) throw new Error("Userid or Group is required.");
  if (!role) throw new Error("Role is required.");

  return await postJson("/api/v1/role-management/groupglobal/assign", { group, role });
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
