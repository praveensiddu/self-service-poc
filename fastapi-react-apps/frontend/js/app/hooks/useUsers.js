/**
 * useUsers Hook - Manages user state and demo mode operations.
 *
 * This hook provides:
 * - Current user state (user, roles, context)
 * - Deployment configuration (demo mode, title, colors)
 * - Demo user management (fetching, switching users)
 * - User initialization and loading
 *
 * Note: Uses global functions from services/userService.js
 */

/**
 * Custom hook for managing user state and operations.
 * @param {Object} params - Hook parameters
 * @param {Function} params.setError - Global error state setter
 * @returns {Object} - User state and operations
 */
function useUsers({ setError }) {
  // User state
  const [currentUser, setCurrentUser] = React.useState("");
  const [currentUserRoles, setCurrentUserRoles] = React.useState([]);
  const [currentUserContext, setCurrentUserContext] = React.useState({
    roles: [],
    app_roles: {},
    groups: []
  });

  // Deployment configuration
  const [deployment, setDeployment] = React.useState(null);
  const [demoMode, setDemoMode] = React.useState(false);

  // Demo user management
  const [showChangeLoginUser, setShowChangeLoginUser] = React.useState(false);
  const [demoUsers, setDemoUsers] = React.useState([]);
  const [demoUsersLoading, setDemoUsersLoading] = React.useState(false);
  const [demoUsersError, setDemoUsersError] = React.useState("");

  /**
   * Load initial user and deployment data from server.
   * @returns {Promise<Object>} - User and deployment data
   */
  const loadUserData = React.useCallback(async () => {
    try {
      const [deploymentType, user] = await Promise.all([
        loadDeploymentType(),
        loadCurrentUser(),
      ]);

      setDeployment(deploymentType);
      setDemoMode(Boolean(deploymentType?.demo_mode));
      setCurrentUser(String(user?.user || user?.username || user || "unknown"));
      setCurrentUserRoles(Array.isArray(user?.roles) ? user.roles : []);
      setCurrentUserContext({
        roles: Array.isArray(user?.roles) ? user.roles : [],
        app_roles: typeof user?.app_roles === 'object' ? user.app_roles : {},
        groups: Array.isArray(user?.groups) ? user.groups : [],
      });

      return { deployment: deploymentType, user };
    } catch (e) {
      const errorMessage = e?.message || String(e);
      setError(errorMessage);
      throw e;
    }
  }, [setError]);

  /**
   * Open the demo user selection modal and load available demo users.
   */
  const openChangeLoginUser = React.useCallback(async () => {
    setDemoUsersError("");
    setDemoUsers([]);
    setShowChangeLoginUser(true);
    setDemoUsersLoading(true);

    try {
      const res = await loadDemoUsers();
      const rows = Array.isArray(res?.rows) ? res.rows : [];
      setDemoUsers(rows);
    } catch (e) {
      setDemoUsersError(e?.message || String(e));
    } finally {
      setDemoUsersLoading(false);
    }
  }, []);

  /**
   * Close the demo user selection modal.
   */
  const closeChangeLoginUser = React.useCallback(() => {
    setShowChangeLoginUser(false);
  }, []);

  /**
   * Select and switch to a demo user.
   * @param {string} user - Username to switch to
   */
  const selectDemoUser = React.useCallback(async (user) => {
    const u = String(user || "").trim();
    if (!u) return;

    try {
      await updateCurrentUser(u);
      setCurrentUser(u);
      window.location.reload();
    } catch (e) {
      setDemoUsersError(e?.message || String(e));
    }
  }, []);

  /**
   * Reload user data (useful after configuration changes that might affect user context).
   */
  const reloadUserData = React.useCallback(async () => {
    try {
      const [deploymentType, user] = await Promise.all([
        loadDeploymentType(),
        loadCurrentUser(),
      ]);

      setDeployment(deploymentType);
      setDemoMode(Boolean(deploymentType?.demo_mode));
      setCurrentUser(String(user?.user || user?.username || user || "unknown"));
      setCurrentUserRoles(Array.isArray(user?.roles) ? user.roles : []);
      setCurrentUserContext({
        roles: Array.isArray(user?.roles) ? user.roles : [],
        app_roles: typeof user?.app_roles === 'object' ? user.app_roles : {},
        groups: Array.isArray(user?.groups) ? user.groups : [],
      });
    } catch (e) {
      // Silently fail for reload operations
      console.warn("Failed to reload user data:", e);
    }
  }, []);

  // Derived values for banner display
  const deploymentEnv = deployment?.deployment_env || "";
  const bannerTitle = deployment?.title?.[deploymentEnv] || "OCP App Provisioning Portal";
  const bannerColor = deployment?.headerColor?.[deploymentEnv] || deployment?.headerColor?.live || "#2563EB";

  return {
    // User state
    currentUser,
    currentUserRoles,
    currentUserContext,
    setCurrentUser,
    setCurrentUserRoles,
    setCurrentUserContext,

    // Deployment state
    deployment,
    demoMode,
    deploymentEnv,
    bannerTitle,
    bannerColor,

    // Demo user management state
    showChangeLoginUser,
    demoUsers,
    demoUsersLoading,
    demoUsersError,

    // Operations
    loadUserData,
    reloadUserData,
    openChangeLoginUser,
    closeChangeLoginUser,
    selectDemoUser,
  };
}
