/**
 * Clusters Service - API calls for cluster management.
 *
 * This service handles CRUD operations for clusters.
 * All functions return plain data; state updates are handled by the container.
 */

/**
 * Load clusters for an environment.
 * @param {string} env - Environment name
 * @returns {Promise<Object>} - Object with environment keys and cluster arrays
 */
async function loadClusters(env) {
  const q = env ? `?env=${encodeURIComponent(env)}` : "";
  return await fetchJson(`/api/v1/clusters${q}`);
}

/**
 * Create a new cluster.
 * @param {string} env - Environment name
 * @param {{clustername: string, purpose?: string, datacenter?: string, applications?: string[], l4_ingress_ip_ranges?: Array, egress_ip_ranges?: Array}} payload
 * @returns {Promise<Object>} - Created cluster data
 */
async function createClusterApi(env, payload) {
  if (!env) throw new Error("Environment is required.");

  const clustername = String(payload?.clustername || "").trim();
  if (!clustername) throw new Error("clustername is required.");

  return await postJson(`/api/v1/clusters?env=${encodeURIComponent(env)}`, {
    clustername,
    purpose: String(payload?.purpose || ""),
    datacenter: String(payload?.datacenter || ""),
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
    .map((r) => String(r?.clustername || "").trim())
    .filter(Boolean);
}
