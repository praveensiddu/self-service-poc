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
 * @param {Function} params.setLoading - Loading state setter
 * @param {Function} params.setError - Error state setter
 * @param {Function} params.setShowErrorModal - Error modal visibility setter
 * @param {Function} params.setShowDeleteWarningModal - Delete warning modal visibility setter
 * @param {Function} params.setDeleteWarningData - Delete warning data setter
 * @returns {Object} - Clusters state and operations
 */
function useClusters({
  activeEnv,
  envKeys,
  setLoading,
  setError,
  setShowErrorModal,
  setShowDeleteWarningModal,
  setDeleteWarningData
}) {
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
    if (!env) {
      setError("No environment selected.");
      setShowErrorModal(true);
      return;
    }

    const clustername = String(payload?.clustername || "").trim();
    if (!clustername) {
      setError("clustername is required.");
      setShowErrorModal(true);
      return;
    }

    try {
      setLoading(true);
      setError("");
      await createClusterApi(env, payload);
      await refreshClusters(env);

      if (typeof onRefreshApps === "function") {
        await onRefreshApps();
      }
    } catch (e) {
      setError(e?.message || String(e));
      throw e;
    } finally {
      setLoading(false);
    }
  }, [activeEnv, envKeys, refreshClusters, setLoading, setError, setShowErrorModal]);

  /**
   * Delete a cluster.
   * @param {string} clustername - Cluster name
   * @param {Function} [onRefreshApps] - Optional callback to refresh apps after deletion
   * @returns {Promise<{deleted: boolean, showWarning: boolean, warningData?: Object}>}
   */
  const deleteCluster = React.useCallback(async (clustername, onRefreshApps) => {
    const env = activeEnv || (envKeys[0] || "");
    if (!env) {
      setError("No environment selected.");
      setShowErrorModal(true);
      return { deleted: false, showWarning: false };
    }

    try {
      setLoading(true);
      setError("");

      // First check if cluster can be deleted
      const checkResult = await canDeleteCluster(env, clustername);

      if (!checkResult.can_delete) {
        // Show modal with dependencies
        setDeleteWarningData({
          clustername,
          env,
          ...checkResult,
        });
        setShowDeleteWarningModal(true);
        setLoading(false);
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
        setLoading(false);
        return { deleted: false, showWarning: false };
      }

      await deleteClusterApi(env, clustername);
      await refreshClusters(env);

      if (typeof onRefreshApps === "function") {
        await onRefreshApps();
      }

      return { deleted: true, showWarning: false };
    } catch (e) {
      setError(e?.message || String(e));
      throw e;
    } finally {
      setLoading(false);
    }
  }, [activeEnv, envKeys, refreshClusters, setLoading, setError, setShowErrorModal, setShowDeleteWarningModal, setDeleteWarningData]);

  return {
    // State
    clustersByEnv,
    availableClusters,

    // Operations
    loadClustersData,
    refreshClusters,
    addCluster,
    deleteCluster,
  };
}
