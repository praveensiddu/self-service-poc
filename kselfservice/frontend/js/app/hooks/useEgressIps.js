/**
 * useEgressIps Hook - Manages Egress IPs state and operations.
 *
 * This hook provides:
 * - Egress IP items state
 * - Load operations for Egress IP data
 *
 * Note: Uses global functions from services/namespacesService.js
 */

/**
 * Custom hook for managing Egress IPs.
 * @param {Object} params - Hook parameters
 * @param {string} params.activeEnv - Currently active environment
 * @returns {Object} - Egress IPs state and operations
 */
function useEgressIps({ activeEnv }) {
  const [egressIpItems, setEgressIpItems] = React.useState([]);
  const [detailAppName, setDetailAppName] = React.useState("");

  /**
   * Load egress IPs for an application.
   * @param {string} appname - Application name
   * @returns {Promise<Array>}
   */
  const loadEgressIpsData = React.useCallback(async (appname) => {
    if (!activeEnv || !appname) return [];

    const items = await loadEgressIps(activeEnv, appname);
    setDetailAppName(appname);
    setEgressIpItems(items || []);

    return items || [];
  }, [activeEnv]);

  /**
   * Reset Egress IPs state.
   */
  const resetEgressIpsState = React.useCallback(() => {
    setEgressIpItems([]);
    setDetailAppName("");
  }, []);

  return {
    // State
    egressIpItems,
    detailAppName,

    // Operations
    loadEgressIpsData,
    resetEgressIpsState,
  };
}
