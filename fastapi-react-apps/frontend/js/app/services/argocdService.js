/**
 * ArgoCD Service - API calls for ArgoCD configuration management.
 *
 * This service handles ArgoCD operations for applications.
 * All functions return plain data; state updates are handled by the container.
 */

/**
 * Load ArgoCD configuration for an application.
 * @param {string} env - Environment name
 * @param {string} appname - Application name
 * @returns {Promise<{exists: boolean, argocd_admin_groups?: string, argocd_operator_groups?: string, argocd_readonly_groups?: string, argocd_sync_strategy?: string, gitrepourl?: string}>}
 */
async function loadAppArgoCD(env, appname) {
  if (!env) throw new Error("Environment is required.");
  if (!appname) throw new Error("Application name is required.");

  return await fetchJson(
    `/api/v1/apps/${encodeURIComponent(appname)}/argocd?env=${encodeURIComponent(env)}`
  );
}

/**
 * Save ArgoCD configuration for an application.
 * @param {string} env - Environment name
 * @param {string} appname - Application name
 * @param {{argocd_admin_groups?: string, argocd_operator_groups?: string, argocd_readonly_groups?: string, argocd_sync_strategy?: string, gitrepourl?: string}} payload
 * @returns {Promise<Object>}
 */
async function saveAppArgoCD(env, appname, payload) {
  if (!env) throw new Error("Environment is required.");
  if (!appname) throw new Error("Application name is required.");

  return await putJson(
    `/api/v1/apps/${encodeURIComponent(appname)}/argocd?env=${encodeURIComponent(env)}`,
    payload
  );
}

/**
 * Delete ArgoCD configuration for an application.
 * @param {string} env - Environment name
 * @param {string} appname - Application name
 * @returns {Promise<Object>}
 */
async function deleteAppArgoCD(env, appname) {
  if (!env) throw new Error("Environment is required.");
  if (!appname) throw new Error("Application name is required.");

  return await deleteJson(
    `/api/v1/apps/${encodeURIComponent(appname)}/argocd?env=${encodeURIComponent(env)}`
  );
}
