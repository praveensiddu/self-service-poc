/**
 * useApps Hook - Manages applications state and operations.
 *
 * This hook provides:
 * - Apps list state
 * - CRUD operations for apps
 * - Selection state for apps
 * - Requests/changes tracking
 *
 * Note: Uses global functions from services/appsService.js
 */

/**
 * Custom hook for managing applications.
 * @param {Object} params - Hook parameters
 * @param {string} params.activeEnv - Currently active environment
 * @returns {Object} - Apps state and operations
 */
function useApps({ activeEnv }) {
  const [apps, setApps] = React.useState({});
  const [clustersByApp, setClustersByApp] = React.useState({});
  const [selectedApps, setSelectedApps] = React.useState(new Set());
  const [requestsChanges, setRequestsChanges] = React.useState({ apps: new Set(), namespaces: new Set() });

  /**
   * Computed app rows array from apps object.
   */
  const appRows = React.useMemo(() => {
    return Object.keys(apps).map((k) => apps[k]);
  }, [apps]);

  /**
   * Load apps for the current environment.
   * @returns {Promise<Object>} - Apps data
   */
  const loadAppsData = React.useCallback(async () => {
    if (!activeEnv) return {};

    const appsResp = await loadApps(activeEnv);
    setApps(appsResp);

    const nextClusters = extractClustersByApp(appsResp);
    setClustersByApp(nextClusters);
    setSelectedApps(new Set());

    return appsResp;
  }, [activeEnv]);

  /**
   * Refresh apps data (alias for loadAppsData with additional side effects).
   */
  const refreshApps = React.useCallback(async () => {
    if (!activeEnv) return;

    const appsResp = await loadApps(activeEnv);
    setApps(appsResp);

    const nextClusters = extractClustersByApp(appsResp);
    setClustersByApp(nextClusters);

    await refreshRequestsChangesData();
  }, [activeEnv]);

  /**
   * Create a new application.
   * @param {{appname: string, description?: string, managedby?: string}} payload
   */
  const createApp = React.useCallback(async (payload) => {
    await createAppApi(activeEnv, payload);

    const appsResp = await loadApps(activeEnv);
    setApps(appsResp);

    const nextClusters = extractClustersByApp(appsResp);
    setClustersByApp(nextClusters);

    await refreshRequestsChangesData();
  }, [activeEnv]);

  /**
   * Update an existing application.
   * @param {string} appname - Application name
   * @param {{description?: string, managedby?: string}} payload
   */
  const updateApp = React.useCallback(async (appname, payload) => {
    await updateAppApi(activeEnv, appname, payload);

    const appsResp = await loadApps(activeEnv);
    setApps(appsResp);

    const nextClusters = extractClustersByApp(appsResp);
    setClustersByApp(nextClusters);

    await refreshRequestsChangesData();
  }, [activeEnv]);

  /**
   * Delete an application.
   * @param {string} appname - Application name
   * @returns {Promise<boolean>} - Whether deletion was confirmed and completed
   */
  const deleteApp = React.useCallback(async (appname) => {
    const confirmMsg = `Are you sure you want to delete app "${appname}"?\n\nThis will remove all associated namespaces, L4 ingress IPs, and pull requests.\n\nThis action cannot be undone.`;
    if (!confirm(confirmMsg)) {
      return false;
    }

    await deleteAppApi(activeEnv, appname);

    const appsResp = await loadApps(activeEnv);
    setApps(appsResp);

    const nextClusters = extractClustersByApp(appsResp);
    setClustersByApp(nextClusters);

    return true;
  }, [activeEnv]);

  /**
   * Load requests/changes for the current environment.
   */
  const refreshRequestsChangesData = React.useCallback(async () => {
    const data = await loadRequestsChanges(activeEnv);
    setRequestsChanges({
      apps: new Set(data.apps),
      namespaces: new Set(data.namespaces),
    });
  }, [activeEnv]);

  /**
   * Toggle selection of all apps.
   * @param {boolean} checked - Whether to select all
   */
  const toggleSelectAll = React.useCallback((checked) => {
    if (checked) {
      setSelectedApps(new Set(appRows.map((a) => a.appname)));
    } else {
      setSelectedApps(new Set());
    }
  }, [appRows]);

  /**
   * Toggle selection of a single app.
   * @param {string} appname - Application name
   * @param {boolean} checked - Whether to select
   */
  const toggleRow = React.useCallback((appname, checked) => {
    setSelectedApps((prev) => {
      const next = new Set(prev);
      if (checked) next.add(appname);
      else next.delete(appname);
      return next;
    });
  }, []);

  /**
   * Select all from filtered list.
   * @param {boolean} checked - Whether to select all
   * @param {string[]} appnames - List of app names to select
   */
  const onSelectAllFromFiltered = React.useCallback((checked, appnames) => {
    if (checked) setSelectedApps(new Set(appnames));
    else setSelectedApps(new Set());
  }, []);

  /**
   * Require exactly one selected app and return its name.
   * @param {Function} setError - Error setter function
   * @param {Function} setShowErrorModal - Error modal setter function
   * @returns {string|null} - Selected app name or null
   */
  const requireExactlyOneSelectedApp = React.useCallback((setError, setShowErrorModal) => {
    const selected = Array.from(selectedApps);
    if (selected.length !== 1) {
      setError("Select exactly one application.");
      setShowErrorModal(true);
      return null;
    }
    return selected[0];
  }, [selectedApps]);

  /**
   * Reset apps state (e.g., when changing environment).
   */
  const resetAppsState = React.useCallback(() => {
    setApps({});
    setClustersByApp({});
    setSelectedApps(new Set());
  }, []);

  return {
    // State
    apps,
    setApps,
    clustersByApp,
    setClustersByApp,
    selectedApps,
    setSelectedApps,
    requestsChanges,
    setRequestsChanges,
    appRows,

    // Operations
    loadAppsData,
    refreshApps,
    createApp,
    updateApp,
    deleteApp,
    refreshRequestsChangesData,

    // Selection
    toggleSelectAll,
    toggleRow,
    onSelectAllFromFiltered,
    requireExactlyOneSelectedApp,
    resetAppsState,
  };
}
