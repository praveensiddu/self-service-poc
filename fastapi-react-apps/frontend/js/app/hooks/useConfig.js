/**
 * useConfig Hook - Manages application configuration state and operations.
 *
 * This hook provides:
 * - Configuration state (workspace, repos)
 * - Config loading and saving operations
 * - Config completeness checking
 * - Enforcement settings management
 *
 * Note: Uses global functions from services/configService.js
 */

/**
 * Custom hook for managing application configuration.
 * @param {Object} params - Hook parameters
 * @param {Function} params.setLoading - Loading state setter
 * @param {Function} params.setError - Error state setter
 * @returns {Object} - Configuration state and operations
 */
function useConfig({ setLoading, setError }) {
  const [workspace, setWorkspace] = React.useState("");
  const [requestsRepo, setRequestsRepo] = React.useState("");
  const [templatesRepo, setTemplatesRepo] = React.useState("");
  const [renderedManifestsRepo, setRenderedManifestsRepo] = React.useState("");
  const [controlRepo, setControlRepo] = React.useState("");
  const [persistedConfigComplete, setPersistedConfigComplete] = React.useState(false);

  const [enforcementSettings, setEnforcementSettings] = React.useState({
    enforce_egress_firewall: "yes",
    enforce_egress_ip: "yes",
  });
  const [draftEnforcementSettings, setDraftEnforcementSettings] = React.useState({
    enforce_egress_firewall: "yes",
    enforce_egress_ip: "yes",
  });
  const [enforcementSettingsError, setEnforcementSettingsError] = React.useState("");
  const [enforcementSettingsLoading, setEnforcementSettingsLoading] = React.useState(false);

  const configComplete = persistedConfigComplete;

  /**
   * Load configuration from server and update state.
   * @returns {Promise<{config: Object, isComplete: boolean}>}
   */
  const loadConfigData = React.useCallback(async () => {
    const cfg = await loadConfig();

    setWorkspace(cfg?.workspace || "");
    setRequestsRepo(cfg?.requestsRepo || "");
    setTemplatesRepo(cfg?.templatesRepo || "");
    setRenderedManifestsRepo(cfg?.renderedManifestsRepo || "");
    setControlRepo(cfg?.controlRepo || "");

    const isComplete = isConfigComplete(cfg);
    setPersistedConfigComplete(isComplete);

    return { config: cfg, isComplete };
  }, []);

  /**
   * Save configuration to server.
   * @returns {Promise<{config: Object, isComplete: boolean}>}
   */
  const saveConfigData = React.useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const saved = await saveConfig({
        workspace,
        requestsRepo,
        templatesRepo,
        renderedManifestsRepo,
        controlRepo,
      });

      setWorkspace(saved?.workspace || "");
      setRequestsRepo(saved?.requestsRepo || "");
      setTemplatesRepo(saved?.templatesRepo || "");
      setRenderedManifestsRepo(saved?.renderedManifestsRepo || "");
      setControlRepo(saved?.controlRepo || "");

      const isComplete = isConfigComplete(saved);
      setPersistedConfigComplete(isComplete);

      return { config: saved, isComplete };
    } catch (e) {
      setError(e?.message || String(e));
      throw e;
    } finally {
      setLoading(false);
    }
  }, [workspace, requestsRepo, templatesRepo, renderedManifestsRepo, controlRepo, setLoading, setError]);

  /**
   * Save default configuration values.
   * @returns {Promise<{config: Object, isComplete: boolean}>}
   */
  const saveDefaultConfigData = React.useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const saved = await saveDefaultConfig();

      setWorkspace(saved?.workspace || "");
      setRequestsRepo(saved?.requestsRepo || "");
      setTemplatesRepo(saved?.templatesRepo || "");
      setRenderedManifestsRepo(saved?.renderedManifestsRepo || "");
      setControlRepo(saved?.controlRepo || "");

      const isComplete = isConfigComplete(saved);
      setPersistedConfigComplete(isComplete);

      return { config: saved, isComplete };
    } catch (e) {
      setError(e?.message || String(e));
      throw e;
    } finally {
      setLoading(false);
    }
  }, [setLoading, setError]);

  /**
   * Load enforcement settings from server.
   */
  const loadEnforcementSettingsData = React.useCallback(async () => {
    setEnforcementSettingsLoading(true);
    setEnforcementSettingsError("");
    try {
      const data = await loadEnforcementSettings();
      const next = {
        enforce_egress_firewall: String(data?.enforce_egress_firewall || "yes"),
        enforce_egress_ip: String(data?.enforce_egress_ip || "yes"),
      };
      setEnforcementSettings(next);
      setDraftEnforcementSettings(next);
      return next;
    } catch (e) {
      setEnforcementSettingsError(e?.message || String(e));
      throw e;
    } finally {
      setEnforcementSettingsLoading(false);
    }
  }, []);

  /**
   * Save enforcement settings to server.
   */
  const saveEnforcementSettingsData = React.useCallback(async () => {
    setEnforcementSettingsLoading(true);
    setEnforcementSettingsError("");
    try {
      const saved = await saveEnforcementSettings(draftEnforcementSettings);
      const next = {
        enforce_egress_firewall: String(saved?.enforce_egress_firewall || "yes"),
        enforce_egress_ip: String(saved?.enforce_egress_ip || "yes"),
      };
      setEnforcementSettings(next);
      setDraftEnforcementSettings(next);
      return next;
    } catch (e) {
      setEnforcementSettingsError(e?.message || String(e));
      throw e;
    } finally {
      setEnforcementSettingsLoading(false);
    }
  }, [draftEnforcementSettings]);

  /**
   * Save enforcement settings to server (with error handling).
   * @returns {Promise<void>}
   */
  const saveEnforcementSettingsWithErrorHandling = React.useCallback(async () => {
    try {
      await saveEnforcementSettingsData();
    } catch (e) {
      setError(e?.message || String(e));
    }
  }, [saveEnforcementSettingsData, setError]);

  /**
   * Save configuration and initialize environment.
   * After successful save, loads environment list and returns initialization data.
   * @returns {Promise<{isComplete: boolean, envKeys: string[], initialEnv: string}>}
   */
  const saveConfigAndInitialize = React.useCallback(async () => {
    const { isComplete } = await saveConfigData();

    if (isComplete) {
      const envList = await loadEnvList();
      const keys = Object.keys(envList);
      const initialEnv = keys[0] || "";
      return { isComplete, envKeys: keys, initialEnv };
    }

    return { isComplete, envKeys: [], initialEnv: "" };
  }, [saveConfigData]);

  /**
   * Use default configuration and initialize environment.
   * After successful save, reloads user data, loads environment list and returns initialization data.
   * @param {Function} reloadUserData - Function to reload user data
   * @returns {Promise<{isComplete: boolean, envKeys: string[], initialEnv: string}>}
   */
  const useDefaultConfigAndInitialize = React.useCallback(async (reloadUserData) => {
    try {
      const { isComplete } = await saveDefaultConfigData();

      if (isComplete) {
        try {
          await reloadUserData();
        } catch {
          // ignore
        }

        const envList = await loadEnvList();
        const keys = Object.keys(envList);
        const initialEnv = keys[0] || "";
        return { isComplete, envKeys: keys, initialEnv };
      }

      return { isComplete, envKeys: [], initialEnv: "" };
    } catch (e) {
      setError(e?.message || String(e));
      throw e;
    }
  }, [saveDefaultConfigData, setError]);

  /**
   * Mark config as incomplete (e.g., when envlist fetch fails).
   */
  const markConfigIncomplete = React.useCallback(() => {
    setPersistedConfigComplete(false);
  }, []);

  return {
    // Config state (expose setters for form inputs)
    workspace,
    setWorkspace,
    requestsRepo,
    setRequestsRepo,
    templatesRepo,
    setTemplatesRepo,
    renderedManifestsRepo,
    setRenderedManifestsRepo,
    controlRepo,
    setControlRepo,
    configComplete,
    persistedConfigComplete,

    // Config operations
    loadConfigData,
    saveConfigData,
    saveDefaultConfigData,
    saveConfigAndInitialize,
    useDefaultConfigAndInitialize,
    markConfigIncomplete,

    // Enforcement settings state
    enforcementSettings,
    draftEnforcementSettings,
    setDraftEnforcementSettings,
    enforcementSettingsError,
    enforcementSettingsLoading,

    // Enforcement settings operations
    loadEnforcementSettingsData,
    saveEnforcementSettingsData,
    saveEnforcementSettingsWithErrorHandling,
  };
}
