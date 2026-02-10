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
 * @returns {Object} - Configuration state and operations
 */
function useConfig() {
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
  }, [workspace, requestsRepo, templatesRepo, renderedManifestsRepo, controlRepo]);

  /**
   * Save default configuration values.
   * @returns {Promise<{config: Object, isComplete: boolean}>}
   */
  const saveDefaultConfigData = React.useCallback(async () => {
    const saved = await saveDefaultConfig();

    setWorkspace(saved?.workspace || "");
    setRequestsRepo(saved?.requestsRepo || "");
    setTemplatesRepo(saved?.templatesRepo || "");
    setRenderedManifestsRepo(saved?.renderedManifestsRepo || "");
    setControlRepo(saved?.controlRepo || "");

    const isComplete = isConfigComplete(saved);
    setPersistedConfigComplete(isComplete);

    return { config: saved, isComplete };
  }, []);

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
   * Mark config as incomplete (e.g., when envlist fetch fails).
   */
  const markConfigIncomplete = React.useCallback(() => {
    setPersistedConfigComplete(false);
  }, []);

  return {
    // Config state
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
  };
}
