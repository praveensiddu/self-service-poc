/**
 * URL and Routing Utilities
 *
 * This file exports pure functions for parsing and building URLs related to UI routing.
 * All functions are exposed globally for use with Babel standalone.
 */

/**
 * Parse the current browser location to extract UI route information.
 * @returns {{ env: string, view: string, appname: string, ns?: string }} - Route object
 */
function parseUiRouteFromLocation() {
  try {
    const path = window.location.pathname || "/";
    const params = new URLSearchParams(window.location.search || "");
    const env = params.get("env") || "";
    const ns = params.get("ns") || "";

    const m = path.match(/^\/apps(?:\/([^/]+)(?:\/(namespaces|l4_ingress|egress_ips|ns_details))?)?\/?$/);
    if (!m) return { env, view: "apps", appname: "" };

    const appname = m[1] ? decodeURIComponent(m[1]) : "";
    const tail = m[2] || "";
    if (tail === "namespaces") return { env, view: "namespaces", appname };
    if (tail === "l4_ingress") return { env, view: "l4ingress", appname };
    if (tail === "egress_ips") return { env, view: "egressips", appname };
    if (tail === "ns_details") return { env, view: "namespaceDetails", appname, ns };
    return { env, view: "apps", appname: "" };
  } catch {
    return { env: "", view: "apps", appname: "" };
  }
}

/**
 * Build a URL string for a given UI route.
 * @param {{ view: string, env?: string, appname?: string, ns?: string }} route - Route object
 * @returns {string} - URL string
 */
function buildUiUrl({ view, env, appname, ns }) {
  const q = env ? `?env=${encodeURIComponent(env)}` : "";
  if (view === "namespaces" && appname) return `/apps/${encodeURIComponent(appname)}/namespaces${q}`;
  if (view === "l4ingress" && appname) return `/apps/${encodeURIComponent(appname)}/l4_ingress${q}`;
  if (view === "egressips" && appname) return `/apps/${encodeURIComponent(appname)}/egress_ips${q}`;
  if (view === "namespaceDetails" && appname) {
    const nsq = ns ? `${q ? "&" : "?"}ns=${encodeURIComponent(ns)}` : "";
    return `/apps/${encodeURIComponent(appname)}/ns_details${q}${nsq}`;
  }
  return `/apps${q}`;
}

/**
 * Push a new UI route to browser history (or replace current entry).
 * @param {{ view: string, env?: string, appname?: string, ns?: string }} next - Route object
 * @param {boolean} [replace=false] - If true, replace current history entry instead of pushing
 */
function pushUiUrl(next, replace = false) {
  const url = buildUiUrl(next);
  const state = { view: next.view, env: next.env || "", appname: next.appname || "", ns: next.ns || "" };
  if (replace) window.history.replaceState(state, "", url);
  else window.history.pushState(state, "", url);
}

/**
 * Check if the current path is the Home page.
 * @returns {boolean}
 */
function isHomePath() {
  const path = (window.location.pathname || "/").toLowerCase();
  return path === "/home" || path === "/home/";
}

/**
 * Check if the current path is the Settings page.
 * @returns {boolean}
 */
function isSettingsPath() {
  const path = (window.location.pathname || "/").toLowerCase();
  return path === "/settings" || path === "/settings/";
}

/**
 * Check if the current path is the PRs page.
 * @returns {boolean}
 */
function isPrsPath() {
  const path = (window.location.pathname || "/").toLowerCase();
  return path === "/prs" || path === "/prs/";
}

/**
 * Check if the current path is the Clusters page.
 * @returns {boolean}
 */
function isClustersPath() {
  const path = (window.location.pathname || "/").toLowerCase();
  return path === "/clusters" || path === "/clusters/";
}

/**
 * Build a clusters URL with optional environment query parameter.
 * @param {string} [env] - Environment name
 * @returns {string} - Clusters URL
 */
function clustersUrlWithEnv(env) {
  const q = env ? `?env=${encodeURIComponent(env)}` : "";
  return `/clusters${q}`;
}
