/**
 * useL4Ingress Hook - Manages L4 Ingress state and operations.
 *
 * This hook provides:
 * - L4 Ingress items state
 * - Load operations for L4 Ingress data
 * - UI state for L4 Ingress add button
 *
 * Note: Uses global functions from services/namespacesService.js
 */

/**
 * Custom hook for managing L4 Ingress.
 * @param {Object} params - Hook parameters
 * @param {string} params.activeEnv - Currently active environment
 * @returns {Object} - L4 Ingress state and operations
 */
function useL4Ingress({ activeEnv }) {
  const [l4IngressItems, setL4IngressItems] = React.useState([]);
  const [l4IngressAddButton, setL4IngressAddButton] = React.useState(null);
  const [detailAppName, setDetailAppName] = React.useState("");

  /**
   * Load L4 ingress items for an application.
   * @param {string} appname - Application name
   * @returns {Promise<Array>}
   */
  const loadL4IngressData = React.useCallback(async (appname) => {
    if (!activeEnv || !appname) return [];

    const items = await loadL4Ingress(activeEnv, appname);
    setDetailAppName(appname);
    setL4IngressItems(items || []);

    return items || [];
  }, [activeEnv]);

  /**
   * Reset L4 Ingress state.
   */
  const resetL4IngressState = React.useCallback(() => {
    setL4IngressItems([]);
    setL4IngressAddButton(null);
    setDetailAppName("");
  }, []);

  return {
    // State
    l4IngressItems,
    l4IngressAddButton,
    setL4IngressAddButton,
    detailAppName,

    // Operations
    loadL4IngressData,
    resetL4IngressState,
  };
}
