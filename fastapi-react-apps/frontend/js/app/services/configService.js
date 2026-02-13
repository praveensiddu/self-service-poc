/**
 * Config Service - API calls for application configuration.
 *
 * This service handles loading and saving workspace configuration settings.
 * All functions return plain data; state updates are handled by the container.
 */

/**
 * Load application configuration from the server.
 * @returns {Promise<{workspace: string, requestsRepo: string, templatesRepo: string, renderedManifestsRepo: string, controlRepo: string}>}
 */
async function loadConfig() {
  return await fetchJson("/api/v1/config");
}

/**
 * Save application configuration to the server.
 * @param {{workspace: string, requestsRepo: string, templatesRepo: string, renderedManifestsRepo: string, controlRepo: string}} config
 * @returns {Promise<{workspace: string, requestsRepo: string, templatesRepo: string, renderedManifestsRepo: string, controlRepo: string}>}
 */
async function saveConfig(config) {
  return await postJson("/api/v1/config", {
    workspace: config.workspace,
    requestsRepo: config.requestsRepo,
    templatesRepo: config.templatesRepo,
    renderedManifestsRepo: config.renderedManifestsRepo,
    controlRepo: config.controlRepo,
  });
}

/**
 * Save default configuration values to the server.
 * @returns {Promise<{workspace: string, requestsRepo: string, templatesRepo: string, renderedManifestsRepo: string, controlRepo: string}>}
 */
async function saveDefaultConfig() {
  return await postJson("/api/v1/config", {
    workspace: "~/workspace",
    requestsRepo: "https://github.com/praveensiddu/kselfservice-requests",
    templatesRepo: "https://github.com/praveensiddu/kselfservice-templates",
    renderedManifestsRepo: "https://github.com/praveensiddu/kselfservice-rendered",
    controlRepo: "https://github.com/praveensiddu/kselfservice-control",
  });
}

/**
 * Check if configuration is complete (all required fields are filled).
 * @param {{workspace?: string, requestsRepo?: string, renderedManifestsRepo?: string, controlRepo?: string}} config
 * @returns {boolean}
 */
function isConfigComplete(config) {
  return Boolean(
    (config?.workspace || "").trim() &&
    (config?.requestsRepo || "").trim() &&
    (config?.renderedManifestsRepo || "").trim() &&
    (config?.controlRepo || "").trim()
  );
}

/**
 * Load environment list from the server.
 * @returns {Promise<Object>} - Object with environment names as keys
 */
async function loadEnvList() {
  return await fetchJson("/api/v1/envlist");
}

/**
 * Load portal mode (readonly status).
 * @returns {Promise<{readonly: boolean, env_configured?: boolean}>}
 */
async function loadPortalMode() {
  return await fetchJson("/api/v1/portal-mode");
}

/**
 * Load enforcement settings.
 * @returns {Promise<{enforce_egress_firewall: string, enforce_egress_ip: string}>}
 */
async function loadEnforcementSettings() {
  return await fetchJson("/api/v1/settings/enforcement");
}

/**
 * Save enforcement settings.
 * @param {{enforce_egress_firewall: string, enforce_egress_ip: string}} settings
 * @returns {Promise<{enforce_egress_firewall: string, enforce_egress_ip: string}>}
 */
async function saveEnforcementSettings(settings) {
  return await putJson("/api/v1/settings/enforcement", {
    enforce_egress_firewall: String(settings?.enforce_egress_firewall || "yes"),
    enforce_egress_ip: String(settings?.enforce_egress_ip || "yes"),
  });
}
