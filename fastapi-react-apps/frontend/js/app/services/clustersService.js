/**
 * Clusters Service - API calls for cluster management.
 *
 * This service handles CRUD operations for clusters.
 * All functions return plain data; state updates are handled by the container.
 */

/**
 * Load clusters for an environment.
 * @param {string} env - Environment name
 * @returns {Promise<Object>} - Object with clusters and permissions
 */
async function loadClusters(env) {
  const q = env ? `?env=${encodeURIComponent(env)}` : "";
  const response = await fetchJson(`/api/v1/clusters${q}`);

  // Return full response (with clusters and permissions)
  // For backward compatibility, if it's old format (no permissions), wrap it
  if (response && !response.clusters && !response.permissions) {
    // Old format - just cluster data
    return { clusters: response, permissions: { canView: true, canManage: true } };
  }

  return response || { clusters: {}, permissions: { canView: true, canManage: true } };
}

/**
 * Create a new cluster.
 * @param {string} env - Environment name
 * @param {{clustername: string, purpose?: string, datacenter?: string, applications?: string[], l4_ingress_ip_ranges?: Array, egress_ip_ranges?: Array}} payload
 * @returns {Promise<Object>} - Created cluster data
 */
async function createClusterApi(env, payload) {
  if (!env) throw new Error("Environment is required.");

  const clustername = safeTrim(payload?.clustername);
  if (!clustername) throw new Error("clustername is required.");

  return await postJson(`/api/v1/clusters?env=${encodeURIComponent(env)}`, {
    clustername,
    purpose: safeTrim(payload?.purpose),
    datacenter: safeTrim(payload?.datacenter),
    applications: Array.isArray(payload?.applications) ? payload.applications : [],
    l4_ingress_ip_ranges: Array.isArray(payload?.l4_ingress_ip_ranges) ? payload.l4_ingress_ip_ranges : [],
    egress_ip_ranges: Array.isArray(payload?.egress_ip_ranges) ? payload.egress_ip_ranges : [],
  });
}

/**
 * Check if a cluster can be deleted.
 * @param {string} env - Environment name
 * @param {string} clustername - Cluster name
 * @returns {Promise<{can_delete: boolean, reason?: string, dependencies?: Object}>}
 */
async function canDeleteCluster(env, clustername) {
  if (!env) throw new Error("Environment is required.");
  if (!clustername) throw new Error("Cluster name is required.");

  return await fetchJson(
    `/api/v1/clusters/${encodeURIComponent(clustername)}/can-delete?env=${encodeURIComponent(env)}`
  );
}

/**
 * Delete a cluster.
 * @param {string} env - Environment name
 * @param {string} clustername - Cluster name
 * @returns {Promise<Object>} - Deletion result
 */
async function deleteClusterApi(env, clustername) {
  if (!env) throw new Error("Environment is required.");
  if (!clustername) throw new Error("Cluster name is required.");

  return await deleteJson(
    `/api/v1/clusters/${encodeURIComponent(clustername)}?env=${encodeURIComponent(env)}`
  );
}

/**
 * Extract available cluster names for an environment from clusters data.
 * @param {Object} clustersByEnv - Object with environment keys and cluster arrays
 * @param {string} env - Environment name
 * @returns {string[]} - Array of cluster names
 */
function extractAvailableClusters(clustersByEnv, env) {
  const envKey = String(env || "").toUpperCase();
  const clusters = (clustersByEnv || {})[envKey] || [];
  return clusters
    .map((r) => safeTrim(r?.clustername))
    .filter(Boolean);
}
