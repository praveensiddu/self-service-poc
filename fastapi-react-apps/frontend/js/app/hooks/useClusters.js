/**
 * useClusters Hook - Manages clusters state and operations.
 *
 * This hook provides:
 * - Clusters list state
 * - CRUD operations for clusters
 * - Available clusters for the current environment
 *
 * Note: Uses global functions from services/clustersService.js
 */

/**
 * Custom hook for managing clusters.
 * @param {Object} params - Hook parameters
 * @param {string} params.activeEnv - Currently active environment
 * @param {string[]} params.envKeys - Available environment keys
 * @returns {Object} - Clusters state and operations
 */
function useClusters({ activeEnv, envKeys }) {
  const [clustersByEnv, setClustersByEnv] = React.useState({});

  /**
   * Computed available clusters for the current environment.
   */
  const availableClusters = React.useMemo(() => {
    return extractAvailableClusters(clustersByEnv, activeEnv);
  }, [clustersByEnv, activeEnv]);

  /**
   * Load clusters for an environment.
   * @param {string} [env] - Optional environment override
   * @returns {Promise<Object>} - Clusters data
   */
  const loadClustersData = React.useCallback(async (env) => {
    const effectiveEnv = env || activeEnv || (envKeys[0] || "");
    const data = await loadClusters(effectiveEnv);
    setClustersByEnv(data || {});
    return data || {};
  }, [activeEnv, envKeys]);

  /**
   * Refresh clusters (alias for loadClustersData).
   * @param {string} [env] - Optional environment override
   */
  const refreshClusters = React.useCallback(async (env) => {
    return await loadClustersData(env);
  }, [loadClustersData]);

  /**
   * Add a new cluster.
   * @param {{clustername: string, purpose?: string, datacenter?: string, applications?: string[], l4_ingress_ip_ranges?: Array, egress_ip_ranges?: Array}} payload
   * @param {Function} [onRefreshApps] - Optional callback to refresh apps after adding cluster
   */
  const addCluster = React.useCallback(async (payload, onRefreshApps) => {
    const env = activeEnv || (envKeys[0] || "");
    if (!env) throw new Error("No environment selected.");

    await createClusterApi(env, payload);
    await refreshClusters(env);

    if (typeof onRefreshApps === "function") {
      await onRefreshApps();
    }
  }, [activeEnv, envKeys, refreshClusters]);

  /**
   * Delete a cluster.
   * @param {string} clustername - Cluster name
   * @param {Function} [onRefreshApps] - Optional callback to refresh apps after deletion
   * @returns {Promise<{deleted: boolean, showWarning: boolean, warningData?: Object}>}
   */
  const deleteCluster = React.useCallback(async (clustername, onRefreshApps) => {
    const env = activeEnv || (envKeys[0] || "");
    if (!env) throw new Error("No environment selected.");

    // First check if cluster can be deleted
    const checkResult = await canDeleteCluster(env, clustername);

    if (!checkResult.can_delete) {
      return {
        deleted: false,
        showWarning: true,
        warningData: {
          clustername,
          env,
          ...checkResult,
        },
      };
    }

    // Confirm deletion
    const confirmMsg = `Are you sure you want to delete cluster "${clustername}" in ${env}?\n\nThis action cannot be undone.`;
    if (!confirm(confirmMsg)) {
      return { deleted: false, showWarning: false };
    }

    await deleteClusterApi(env, clustername);
    await refreshClusters(env);

    if (typeof onRefreshApps === "function") {
      await onRefreshApps();
    }

    return { deleted: true, showWarning: false };
  }, [activeEnv, envKeys, refreshClusters]);

  return {
    // State
    clustersByEnv,
    setClustersByEnv,
    availableClusters,

    // Operations
    loadClustersData,
    refreshClusters,
    addCluster,
    deleteCluster,
  };
}
