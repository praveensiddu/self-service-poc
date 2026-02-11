/**
 * useUiRouting Hook - Encapsulates URL routing and browser history handling.
 *
 * This hook provides:
 * - Current route state parsed from browser location
 * - Functions to navigate (push/replace URL)
 * - Popstate event handling for browser back/forward
 * - Route guards based on configComplete status
 *
 * Note: This uses global functions from utils/url.js (parseUiRouteFromLocation, buildUiUrl, etc.)
 * since we're using Babel standalone without a module bundler.
 */

/**
 * Custom hook for UI routing and history management.
 * @param {Object} params - Hook parameters
 * @param {boolean} params.configComplete - Whether config is complete
 * @param {string[]} params.envKeys - Available environment keys
 * @param {string} params.activeEnv - Currently active environment
 * @param {Function} params.setActiveEnv - Setter for active environment
 * @param {Function} params.setTopTab - Setter for top tab
 * @param {Function} params.onResetNamespacesState - Callback to reset namespace state
 * @returns {Object} - Routing utilities
 */
function useUiRouting({
  configComplete,
  envKeys,
  activeEnv,
  setActiveEnv,
  setTopTab,
  onResetNamespacesState,
}) {
  const [pendingRoute, setPendingRoute] = React.useState(() => parseUiRouteFromLocation());
  const [view, setView] = React.useState("apps");

  /**
   * Navigate to a new UI route.
   * @param {{view: string, env?: string, appname?: string, ns?: string}} route
   * @param {boolean} [replace=false] - Replace instead of push
   */
  const navigateTo = React.useCallback((route, replace = false) => {
    pushUiUrl(route, replace);
  }, []);

  /**
   * Navigate to apps view.
   * @param {string} [env] - Optional environment override
   */
  const navigateToApps = React.useCallback((env) => {
    const targetEnv = env || activeEnv;
    pushUiUrl({ view: "apps", env: targetEnv, appname: "", ns: "" }, false);
  }, [activeEnv]);

  /**
   * Set top tab with URL update and config guards.
   * @param {string} nextTab - Tab name to navigate to
   */
  const setTopTabWithUrl = React.useCallback((nextTab) => {
    setTopTab(nextTab);

    if (nextTab === "Home") {
      window.history.pushState({ topTab: "Home" }, "", "/home");
      return;
    }

    if (nextTab === "Settings") {
      window.history.pushState({ topTab: "Settings" }, "", "/settings");
      return;
    }

    if (nextTab === "PRs and Approval") {
      if (!configComplete) {
        setTopTab("Home");
        window.history.pushState({ topTab: "Home" }, "", "/home");
        return;
      }
      window.history.pushState({ topTab: "PRs and Approval" }, "", "/prs");
      return;
    }

    if (nextTab === "Clusters") {
      if (!configComplete) {
        setTopTab("Home");
        window.history.pushState({ topTab: "Home" }, "", "/home");
        return;
      }
      const r = parseUiRouteFromLocation();
      const nextEnv = r.env || activeEnv || (envKeys[0] || "");
      if (nextEnv) setActiveEnv(nextEnv);
      window.history.pushState({ topTab: "Clusters" }, "", clustersUrlWithEnv(nextEnv));
      return;
    }

    if (!configComplete) {
      setTopTab("Home");
      window.history.pushState({ topTab: "Home" }, "", "/home");
      return;
    }

    if (nextTab === "Request provisioning") {
      const r = parseUiRouteFromLocation();
      const nextEnv = r.env || activeEnv || (envKeys[0] || "");
      if (nextEnv) setActiveEnv(nextEnv);
      // Always reset to apps view when clicking "Request provisioning"
      if (onResetNamespacesState) onResetNamespacesState();
      setPendingRoute({ env: nextEnv, view: "apps", appname: "", ns: "" });
      pushUiUrl({ view: "apps", env: nextEnv, appname: "", ns: "" }, false);
    }
  }, [configComplete, activeEnv, envKeys, setTopTab, setActiveEnv, onResetNamespacesState]);

  /**
   * Handle popstate event (browser back/forward).
   */
  const handlePopState = React.useCallback(() => {
    if (isHomePath()) {
      setTopTab("Home");
      return;
    }

    if (isSettingsPath()) {
      setTopTab("Settings");
      return;
    }

    if (isPrsPath()) {
      setTopTab(configComplete ? "PRs and Approval" : "Home");
      if (!configComplete) window.history.replaceState({ topTab: "Home" }, "", "/home");
      return;
    }

    if (isClustersPath()) {
      try {
        const params = new URLSearchParams(window.location.search || "");
        const envFromUrl = (params.get("env") || "").trim();
        if (envFromUrl) setActiveEnv(envFromUrl);
      } catch {
        // ignore
      }
      setTopTab(configComplete ? "Clusters" : "Home");
      if (!configComplete) window.history.replaceState({ topTab: "Home" }, "", "/home");
      return;
    }

    const r = parseUiRouteFromLocation();
    setPendingRoute(r);
    if (r.env) setActiveEnv(r.env);
    else if (envKeys.length > 0 && !activeEnv) setActiveEnv(envKeys[0]);
    if (r.view === "apps" && onResetNamespacesState) {
      onResetNamespacesState();
    }
  }, [configComplete, envKeys, activeEnv, setActiveEnv, setTopTab, onResetNamespacesState]);

  // Set up popstate listener
  React.useEffect(() => {
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [handlePopState]);

  /**
   * Initialize routing based on current URL and config status.
   * @param {boolean} isComplete - Whether config is complete
   * @param {string[]} keys - Environment keys
   * @param {string} initialEnv - Initial environment
   */
  const initializeRouting = React.useCallback((isComplete, keys, initialEnv) => {
    const initial = parseUiRouteFromLocation();
    setPendingRoute(initial);

    if (isComplete && initialEnv && !isHomePath() && !isSettingsPath() && !isPrsPath() && !isClustersPath()) {
      pushUiUrl({ view: initial.view, env: initialEnv, appname: initial.appname, ns: initial.ns }, true);
    }

    if (isClustersPath()) {
      window.history.replaceState(
        { topTab: isComplete ? "Clusters" : "Home" },
        "",
        clustersUrlWithEnv(initialEnv)
      );
    }

    // Determine initial top tab
    if (isHomePath()) {
      setTopTab("Home");
    } else if (isSettingsPath()) {
      setTopTab("Settings");
    } else if (isPrsPath()) {
      setTopTab(isComplete ? "PRs and Approval" : "Home");
      if (!isComplete) {
        window.history.replaceState({ topTab: "Home" }, "", "/home");
      }
    } else if (isClustersPath()) {
      setTopTab(isComplete ? "Clusters" : "Home");
      if (!isComplete) {
        window.history.replaceState({ topTab: "Home" }, "", "/home");
      }
    } else {
      setTopTab(isComplete ? "Request provisioning" : "Home");
      if (!isComplete) {
        window.history.replaceState({ topTab: "Home" }, "", "/home");
      }
    }
  }, [setTopTab]);

  return {
    pendingRoute,
    setPendingRoute,
    view,
    setView,
    navigateTo,
    navigateToApps,
    setTopTabWithUrl,
    handlePopState,
    initializeRouting,
    // Re-export utility functions for convenience
    parseRoute: parseUiRouteFromLocation,
    buildUrl: buildUiUrl,
    pushUrl: pushUiUrl,
    isHomePath,
    isSettingsPath,
    isPrsPath,
    isClustersPath,
    clustersUrlWithEnv,
  };
}
