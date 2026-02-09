async function readErrorMessage(res) {
  try {
    const text = await res.text();
    if (!text) return `HTTP ${res.status}`;

    try {
      const parsed = JSON.parse(text);
      if (parsed && typeof parsed.detail === "string") return parsed.detail;
    } catch {
      // ignore
    }

    return text;
  } catch {
    return `HTTP ${res.status}`;
  }
}

async function fetchJson(url) {
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) {
    throw new Error(await readErrorMessage(res));
  }
  return await res.json();
}

async function deleteJson(url) {
  const res = await fetch(url, {
    method: "DELETE",
    headers: { Accept: "application/json" },
  });
  if (!res.ok) {
    throw new Error(await readErrorMessage(res));
  }
  return await res.json();
}

async function postJson(url, body) {
  const res = await fetch(url, {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify(body || {}),
  });
  if (!res.ok) {
    throw new Error(await readErrorMessage(res));
  }
  return await res.json();
}

async function putJson(url, body) {
  const res = await fetch(url, {
    method: "PUT",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify(body || {}),
  });
  if (!res.ok) {
    throw new Error(await readErrorMessage(res));
  }
  return await res.json();
}

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

function isHomePath() {
  const path = (window.location.pathname || "/").toLowerCase();
  return path === "/home" || path === "/home/";
}

function isSettingsPath() {
  const path = (window.location.pathname || "/").toLowerCase();
  return path === "/settings" || path === "/settings/";
}

function isPrsPath() {
  const path = (window.location.pathname || "/").toLowerCase();
  return path === "/prs" || path === "/prs/";
}

function isClustersPath() {
  const path = (window.location.pathname || "/").toLowerCase();
  return path === "/clusters" || path === "/clusters/";
}

function clustersUrlWithEnv(env) {
  const q = env ? `?env=${encodeURIComponent(env)}` : "";
  return `/clusters${q}`;
}

function pushUiUrl(next, replace = false) {
  const url = buildUiUrl(next);
  const state = { view: next.view, env: next.env || "", appname: next.appname || "", ns: next.ns || "" };
  if (replace) window.history.replaceState(state, "", url);
  else window.history.pushState(state, "", url);
}

function uniqStrings(items) {
  const seen = new Set();
  const out = [];
  for (const v of items) {
    if (!seen.has(v)) {
      seen.add(v);
      out.push(v);
    }
  }
  return out;
}

function App() {
  const [deployment, setDeployment] = React.useState(null);
  const [currentUser, setCurrentUser] = React.useState("");
  const [envKeys, setEnvKeys] = React.useState([]);
  const [activeEnv, setActiveEnv] = React.useState("");
  const [readonly, setReadonly] = React.useState(false);

  const [workspace, setWorkspace] = React.useState("");
  const [requestsRepo, setRequestsRepo] = React.useState("");
  const [templatesRepo, setTemplatesRepo] = React.useState("");
  const [renderedManifestsRepo, setRenderedManifestsRepo] = React.useState("");
  const [controlRepo, setControlRepo] = React.useState("");
  const [persistedConfigComplete, setPersistedConfigComplete] = React.useState(false);
  const [topTab, setTopTab] = React.useState("Home");

  const [apps, setApps] = React.useState({});
  const [clustersByApp, setClustersByApp] = React.useState({});
  const [selectedNamespaces, setSelectedNamespaces] = React.useState(() => new Set());
  const [selectedApps, setSelectedApps] = React.useState(new Set());
  const [showCreateApp, setShowCreateApp] = React.useState(false);
  const [showCreateNamespace, setShowCreateNamespace] = React.useState(false);
  const [showCreateCluster, setShowCreateCluster] = React.useState(false);
  const [view, setView] = React.useState("apps");
  const [detailAppName, setDetailAppName] = React.useState("");
  const [detailNamespace, setDetailNamespace] = React.useState(null);
  const [detailNamespaceName, setDetailNamespaceName] = React.useState("");
  const [namespaces, setNamespaces] = React.useState({});
  const [l4IngressItems, setL4IngressItems] = React.useState([]);
  const [egressIpItems, setEgressIpItems] = React.useState([]);
  const [namespaceDetailsHeaderButtons, setNamespaceDetailsHeaderButtons] = React.useState(null);

  const [clustersByEnv, setClustersByEnv] = React.useState({});

  const [requestsChanges, setRequestsChanges] = React.useState({ apps: new Set(), namespaces: new Set() });

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

  const availableClusters = ((clustersByEnv || {})[String(activeEnv || "").toUpperCase()] || [])
    .map((r) => String(r?.clustername || "").trim())
    .filter(Boolean);

  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");
  const [pendingRoute, setPendingRoute] = React.useState(() => parseUiRouteFromLocation());

  const configComplete = persistedConfigComplete;

  function setTopTabWithUrl(nextTab) {
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
      setPendingRoute({ env: nextEnv, view: r.view || "apps", appname: r.appname || "", ns: r.ns || "" });
      pushUiUrl({ view: r.view || "apps", env: nextEnv, appname: r.appname || "", ns: r.ns || "" }, false);
      return;
    }
  }

  React.useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setLoading(true);
        setError("");

        const [deploymentType, user, cfg, portalMode] = await Promise.all([
          fetchJson("/api/v1/deployment_type"),
          fetchJson("/api/v1/current-user"),
          fetchJson("/api/v1/config"),
          fetchJson("/api/v1/portal-mode"),
        ]);

        if (cancelled) return;

        setDeployment(deploymentType);
        setCurrentUser(user.user || "");
        setReadonly(portalMode?.readonly || false);

        setWorkspace(cfg?.workspace || "");
        setRequestsRepo(cfg?.requestsRepo || "");
        setTemplatesRepo(cfg?.templatesRepo || "");
        setRenderedManifestsRepo(cfg?.renderedManifestsRepo || "");
        setControlRepo(cfg?.controlRepo || "");

        const isComplete = Boolean(
          (cfg?.workspace || "").trim() &&
            (cfg?.requestsRepo || "").trim() &&
            (cfg?.renderedManifestsRepo || "").trim() &&
            (cfg?.controlRepo || "").trim()
        );
        setPersistedConfigComplete(isComplete);

        const initial = parseUiRouteFromLocation();
        setPendingRoute(initial);

        let keys = [];
        let initialEnv = "";
        if (isComplete) {
          let envList;
          try {
            envList = await fetchJson("/api/v1/envlist");
          } catch {
            if (cancelled) return;
            setPersistedConfigComplete(false);
            setEnvKeys([]);
            setActiveEnv("");
            setTopTab("Home");
            window.history.replaceState({ topTab: "Home" }, "", "/home");
            return;
          }

          if (cancelled) return;
          keys = Object.keys(envList);
          initialEnv = keys.includes(initial.env) ? initial.env : (keys[0] || "");
        }

        setEnvKeys(keys);
        setActiveEnv(initialEnv);
        if (isComplete && initialEnv && !isHomePath() && !isSettingsPath() && !isPrsPath() && !isClustersPath()) {
          pushUiUrl({ view: initial.view, env: initialEnv, appname: initial.appname, ns: initial.ns }, true);
        }

        if (isClustersPath()) {
          window.history.replaceState(
            { topTab: isComplete ? "Clusters" : "Home" },
            "",
            clustersUrlWithEnv(initialEnv),
          );
        }

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
      } catch (e) {
        if (!cancelled) setError(e?.message || String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  React.useEffect(() => {
    if (!configComplete && topTab !== "Home") {
      setTopTab("Home");
    }
  }, [configComplete, topTab]);

  React.useEffect(() => {
    if (!configComplete) return;
    if (topTab !== "Settings") return;

    let cancelled = false;

    (async () => {
      try {
        setEnforcementSettingsLoading(true);
        setEnforcementSettingsError("");
        const data = await fetchJson("/api/v1/settings/enforcement");
        if (cancelled) return;
        const next = {
          enforce_egress_firewall: String(data?.enforce_egress_firewall || "yes"),
          enforce_egress_ip: String(data?.enforce_egress_ip || "yes"),
        };
        setEnforcementSettings(next);
        setDraftEnforcementSettings(next);
      } catch (e) {
        if (!cancelled) setEnforcementSettingsError(e?.message || String(e));
      } finally {
        if (!cancelled) setEnforcementSettingsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [configComplete, topTab]);

  async function onSaveEnforcementSettings() {
    try {
      setEnforcementSettingsLoading(true);
      setEnforcementSettingsError("");
      const saved = await putJson("/api/v1/settings/enforcement", {
        enforce_egress_firewall: String(draftEnforcementSettings?.enforce_egress_firewall || "yes"),
        enforce_egress_ip: String(draftEnforcementSettings?.enforce_egress_ip || "yes"),
      });
      const next = {
        enforce_egress_firewall: String(saved?.enforce_egress_firewall || "yes"),
        enforce_egress_ip: String(saved?.enforce_egress_ip || "yes"),
      };
      setEnforcementSettings(next);
      setDraftEnforcementSettings(next);
    } catch (e) {
      setEnforcementSettingsError(e?.message || String(e));
      throw e;
    } finally {
      setEnforcementSettingsLoading(false);
    }
  }

  React.useEffect(() => {
    if (!activeEnv) return;
    if (isPrsPath()) return;

    let cancelled = false;

    (async () => {
      try {
        setLoading(true);
        setError("");

        const appsResp = await fetchJson(`/api/v1/apps?env=${encodeURIComponent(activeEnv)}`);
        if (cancelled) return;

        setApps(appsResp);
        const nextClusters = {};
        for (const [appname, app] of Object.entries(appsResp || {})) {
          nextClusters[appname] = Array.isArray(app?.clusters) ? app.clusters.map(String) : [];
        }
        setClustersByApp(nextClusters);
        setSelectedApps(new Set());
        setView("apps");
        setDetailAppName("");
        setNamespaces({});
        setL4IngressItems([]);
        setEgressIpItems([]);

        const pr = pendingRoute;
        if (pr && (pr.env || "").toUpperCase() === (activeEnv || "").toUpperCase()) {
          if (pr.view === "namespaces" && pr.appname) {
            setPendingRoute({ env: activeEnv, view: "apps", appname: "" });
            await openNamespaces(pr.appname, false);
          } else if (pr.view === "l4ingress" && pr.appname) {
            setPendingRoute({ env: activeEnv, view: "apps", appname: "" });
            await openL4Ingress(pr.appname, false);
          } else if (pr.view === "egressips" && pr.appname) {
            setPendingRoute({ env: activeEnv, view: "apps", appname: "" });
            await openEgressIps(pr.appname, false);
          } else if (pr.view === "namespaceDetails" && pr.appname) {
            setPendingRoute({ env: activeEnv, view: "apps", appname: "" });
            const nsName = pr.ns || "";
            if (nsName) {
              await viewNamespaceDetails(nsName, null, pr.appname);
            }
          } else {
            setPendingRoute({ env: activeEnv, view: "apps", appname: "" });
          }
        }
      } catch (e) {
        if (!cancelled) setError(e?.message || String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [activeEnv]);

  React.useEffect(() => {
    if (!activeEnv) return;

    let cancelled = false;

    (async () => {
      try {
        const data = await fetchJson(`/api/v1/requests/changes?env=${encodeURIComponent(activeEnv)}`);
        if (cancelled) return;
        const appsList = Array.isArray(data?.apps) ? data.apps.map(String) : [];
        const namespacesList = Array.isArray(data?.namespaces) ? data.namespaces.map(String) : [];
        setRequestsChanges({ apps: new Set(appsList), namespaces: new Set(namespacesList) });
      } catch {
        if (!cancelled) setRequestsChanges({ apps: new Set(), namespaces: new Set() });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [activeEnv]);

  const deploymentEnv = deployment?.deployment_env || "";
  const bannerTitle = deployment?.title?.[deploymentEnv] || "OCP App Provisioning Portal";
  const bannerColor = deployment?.headerColor?.[deploymentEnv] || "#384454";

  const appRows = Object.keys(apps).map((k) => apps[k]);

  const selectedAppArgocdEnabled = Boolean(detailAppName && apps?.[detailAppName]?.argocd);


  async function refreshRequestsChanges() {
    if (!activeEnv) return;
    try {
      const data = await fetchJson(`/api/v1/requests/changes?env=${encodeURIComponent(activeEnv)}`);
      const appsList = Array.isArray(data?.apps) ? data.apps.map(String) : [];
      const namespacesList = Array.isArray(data?.namespaces) ? data.namespaces.map(String) : [];
      setRequestsChanges({ apps: new Set(appsList), namespaces: new Set(namespacesList) });
    } catch {
      setRequestsChanges({ apps: new Set(), namespaces: new Set() });
    }
  }


  async function openNamespaces(appname, push = true) {
    if (!appname) return;
    try {
      setLoading(true);
      setError("");
      const resp = await fetchJson(
        `/api/v1/apps/${encodeURIComponent(appname)}/namespaces?env=${encodeURIComponent(activeEnv)}`,
      );
      setDetailAppName(appname);
      setNamespaces(resp || {});
      setL4IngressItems([]);
      setSelectedNamespaces(new Set());
      setView("namespaces");
      if (push) pushUiUrl({ view: "namespaces", env: activeEnv, appname }, false);
      return resp || {};
    } catch (e) {
      setError(e?.message || String(e));
      return null;
    } finally {
      setLoading(false);
    }
  }

  async function copyNamespace(fromNamespace, payload) {
    const appname = detailAppName;
    if (!appname) throw new Error("No application selected.");

    const from_env = String(payload?.from_env || "").trim();
    const to_env = String(payload?.to_env || "").trim();
    const to_namespace = String(payload?.to_namespace || "").trim();

    if (!fromNamespace) throw new Error("No source namespace selected.");
    if (!from_env) throw new Error("from_env is required.");
    if (!to_env) throw new Error("to_env is required.");
    if (!to_namespace) throw new Error("to_namespace is required.");
    if (from_env !== String(activeEnv || "").trim()) {
      throw new Error("from_env must match the active environment.");
    }

    setLoading(true);
    setError("");
    try {
      await postJson(
        `/api/v1/apps/${encodeURIComponent(appname)}/namespaces/${encodeURIComponent(fromNamespace)}/copy?env=${encodeURIComponent(activeEnv)}`,
        { from_env, to_env, to_namespace },
      );

      const resp = await fetchJson(
        `/api/v1/apps/${encodeURIComponent(appname)}/namespaces?env=${encodeURIComponent(activeEnv)}`,
      );
      setNamespaces(resp || {});

      const appsResp = await fetchJson(`/api/v1/apps?env=${encodeURIComponent(activeEnv)}`);
      setApps(appsResp);

      const nextClusters = {};
      for (const [k, app] of Object.entries(appsResp || {})) {
        nextClusters[k] = Array.isArray(app?.clusters) ? app.clusters.map(String) : [];
      }
      setClustersByApp(nextClusters);

      await refreshRequestsChanges();
    } finally {
      setLoading(false);
    }
  }

  async function openL4Ingress(appname, push = true) {
    if (!appname) return;
    try {
      setLoading(true);
      setError("");
      const items = await fetchJson(
        `/api/v1/apps/${encodeURIComponent(appname)}/l4_ingress?env=${encodeURIComponent(activeEnv)}`,
      );
      setDetailAppName(appname);
      setL4IngressItems(items || []);
      setNamespaces({});
      setView("l4ingress");
      if (push) pushUiUrl({ view: "l4ingress", env: activeEnv, appname }, false);
    } catch (e) {
      setError(e?.message || String(e));
    } finally {
      setLoading(false);
    }
  }

  async function openEgressIps(appname, push = true) {
    if (!appname) return;
    try {
      setLoading(true);
      setError("");
      const items = await fetchJson(
        `/api/v1/apps/${encodeURIComponent(appname)}/egress_ips?env=${encodeURIComponent(activeEnv)}`,
      );
      setDetailAppName(appname);
      setEgressIpItems(items || []);
      setNamespaces({});
      setView("egressips");
      if (push) pushUiUrl({ view: "egressips", env: activeEnv, appname }, false);
    } catch (e) {
      setError(e?.message || String(e));
    } finally {
      setLoading(false);
    }
  }

  function onBackToApps() {
    setView("apps");
    setDetailAppName("");
    setNamespaces({});
    setL4IngressItems([]);
    setSelectedNamespaces(new Set());
    setEgressIpItems([]);
    setError("");
    pushUiUrl({ view: "apps", env: activeEnv, appname: "" }, false);
  }


  async function onViewEgressIps() {
    const appname = getDetailOrSelectedApp();
    if (!appname) return;
    await openEgressIps(appname, true);
  }

  async function onViewNamespaces() {
    const appname = getDetailOrSelectedApp();
    if (!appname) return;
    await openNamespaces(appname, true);
  }

  React.useEffect(() => {
    function onPopState() {
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
      if (r.view === "apps") {
        setView("apps");
        setDetailAppName("");
        setNamespaces({});
        setL4IngressItems([]);
        setEgressIpItems([]);
      }
    }

    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [envKeys, activeEnv, configComplete]);

  async function refreshClusters(env) {
    const effectiveEnv = env || activeEnv || (envKeys[0] || "");
    const q = effectiveEnv ? `?env=${encodeURIComponent(effectiveEnv)}` : "";
    const data = await fetchJson(`/api/v1/clusters${q}`);
    setClustersByEnv(data || {});
  }

  React.useEffect(() => {
    if (!configComplete) return;
    if (topTab !== "Clusters") return;

    const effectiveEnv = activeEnv || (envKeys[0] || "");
    if (effectiveEnv && effectiveEnv !== activeEnv) setActiveEnv(effectiveEnv);

    (async () => {
      try {
        setLoading(true);
        setError("");
        await refreshClusters(effectiveEnv);
      } catch (e) {
        setError(e?.message || String(e));
      } finally {
        setLoading(false);
      }
    })();
  }, [topTab, configComplete, activeEnv, envKeys]);

  async function onAddCluster(payload) {
    const env = activeEnv || (envKeys[0] || "");
    if (!env) {
      setError("No environment selected.");
      return;
    }

    const clustername = String(payload?.clustername || "").trim();
    if (!clustername) {
      setError("clustername is required.");
      return;
    }

    const purpose = String(payload?.purpose || "");
    const datacenter = String(payload?.datacenter || "");
    const applications = Array.isArray(payload?.applications) ? payload.applications : [];
    const l4IngressIpRanges = Array.isArray(payload?.l4_ingress_ip_ranges) ? payload.l4_ingress_ip_ranges : [];
    const egressIpRanges = Array.isArray(payload?.egress_ip_ranges) ? payload.egress_ip_ranges : [];

    try {
      setLoading(true);
      setError("");
      await postJson(`/api/v1/clusters?env=${encodeURIComponent(env)}`, {
        clustername,
        purpose,
        datacenter,
        applications,
        l4_ingress_ip_ranges: l4IngressIpRanges,
        egress_ip_ranges: egressIpRanges,
      });
      await refreshClusters(env);
      await refreshApps();
    } catch (e) {
      setError(e?.message || String(e));
      throw e;
    } finally {
      setLoading(false);
    }
  }

  async function onDeleteCluster(clustername) {
    const env = activeEnv || (envKeys[0] || "");
    if (!env) {
      setError("No environment selected.");
      return;
    }

    const confirmMsg = `Are you sure you want to delete cluster "${clustername}" in ${env}?\n\nThis action cannot be undone.`;
    if (!confirm(confirmMsg)) return;

    try {
      setLoading(true);
      setError("");
      await deleteJson(`/api/v1/clusters/${encodeURIComponent(clustername)}?env=${encodeURIComponent(env)}`);
      await refreshClusters(env);
      await refreshApps();
    } catch (e) {
      setError(e?.message || String(e));
    } finally {
      setLoading(false);
    }
  }

  function toggleSelectAll(checked) {
    if (checked) {
      setSelectedApps(new Set(appRows.map((a) => a.appname)));
    } else {
      setSelectedApps(new Set());
    }
  }

  function toggleRow(appname, checked) {
    setSelectedApps((prev) => {
      const next = new Set(prev);
      if (checked) next.add(appname);
      else next.delete(appname);
      return next;
    });
  }

  function onSelectAllFromFiltered(checked, appnames) {
    if (checked) setSelectedApps(new Set(appnames));
    else setSelectedApps(new Set());
  }

  function toggleNamespace(namespace, checked) {
    setSelectedNamespaces((prev) => {
      const next = new Set(prev);
      if (checked) next.add(namespace);
      else next.delete(namespace);
      return next;
    });
  }

  function onSelectAllNamespaces(checked, namespaceNames) {
    if (checked) setSelectedNamespaces(new Set(namespaceNames));
    else setSelectedNamespaces(new Set());
  }

  function requireExactlyOneSelectedApp() {
    const selected = Array.from(selectedApps);
    if (selected.length !== 1) {
      setError("Select exactly one application.");
      return null;
    }
    return selected[0];
  }

  function getDetailOrSelectedApp() {
    if (detailAppName) return detailAppName;
    return requireExactlyOneSelectedApp();
  }

  async function onViewL4Ingress() {
    const appname = getDetailOrSelectedApp();
    if (!appname) return;
    await openL4Ingress(appname, true);
  }

  async function viewNamespaceDetails(namespaceName, namespaceData, appnameOverride) {
    const appname = appnameOverride || detailAppName;
    if (!appname) {
      setError("No application selected.");
      return;
    }
    if (!namespaceName) {
      setError("No namespace selected.");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const envParam = `env=${encodeURIComponent(activeEnv)}`;
      const base = `/api/v1/apps/${encodeURIComponent(appname)}/namespaces/${encodeURIComponent(namespaceName)}`;

      const [
        basic,
        egress,
        rolebindings,
        egressFirewall,
        resourcequota,
        limitrange,
      ] = await Promise.all([
        fetchJson(`${base}/namespace_info/basic?${envParam}`),
        fetchJson(`${base}/namespace_info/egress?${envParam}`),
        fetchJson(`${base}/rolebinding_requests?${envParam}`),
        fetchJson(`${base}/egressfirewall?${envParam}`),
        fetchJson(`${base}/resources/resourcequota?${envParam}`),
        fetchJson(`${base}/resources/limitrange?${envParam}`),
      ]);

      const nextNamespace = {
        name: namespaceName,
        clusters: Array.isArray(basic?.clusters) ? basic.clusters : [],
        egress_nameid: egress?.egress_nameid ?? null,
        enable_pod_based_egress_ip: Boolean(egress?.enable_pod_based_egress_ip),
        allow_all_egress: Boolean(egress?.allow_all_egress),
        need_argo: Boolean(basic?.need_argo),
        argocd_sync_strategy: String(basic?.argocd_sync_strategy || ""),
        gitrepourl: String(basic?.gitrepourl || ""),
        generate_argo_app: Boolean(basic?.generate_argo_app),
        status: String(basic?.status || ""),
        resources: {
          requests: resourcequota?.requests || {},
          quota_limits: resourcequota?.quota_limits || {},
          limits: limitrange?.limits || {},
        },
        rolebindings: Array.isArray(rolebindings?.bindings) ? rolebindings.bindings : [],
        egress_firewall_rules: Array.isArray(egressFirewall?.rules) ? egressFirewall.rules : [],
      };

      setDetailAppName(appname);
      setDetailNamespace(nextNamespace);
      setDetailNamespaceName(namespaceName);
      setView("namespaceDetails");
      pushUiUrl({ view: "namespaceDetails", env: activeEnv, appname, ns: namespaceName }, false);
    } catch (e) {
      setError(e?.message || String(e));
    } finally {
      setLoading(false);
    }
  }

  async function onBackFromNamespaceDetails() {
    setDetailNamespace(null);
    setDetailNamespaceName("");

    const appname = detailAppName;
    if (!appname) {
      setView("namespaces");
      pushUiUrl({ view: "namespaces", env: activeEnv, appname: detailAppName }, false);
      return;
    }

    await openNamespaces(appname, true);
  }

  async function onUpdateNamespaceInfo(namespaceName, updates) {
    const appname = detailAppName;
    if (!appname) throw new Error("No application selected.");
    if (!namespaceName) throw new Error("No namespace selected.");

    const nextUpdates = { ...(updates || {}) };
    const ni = nextUpdates?.namespace_info ? { ...(nextUpdates.namespace_info || {}) } : null;
    const nextNeedArgo = ni && Object.prototype.hasOwnProperty.call(ni, "need_argo")
      ? Boolean(ni.need_argo)
      : null;
    if (ni && Object.prototype.hasOwnProperty.call(ni, "need_argo")) {
      delete ni.need_argo;
      nextUpdates.namespace_info = ni;
    }

    const nsargocdUpdates = nextUpdates && nextUpdates.nsargocd ? { ...(nextUpdates.nsargocd || {}) } : null;
    if (nextUpdates && Object.prototype.hasOwnProperty.call(nextUpdates, "nsargocd")) {
      delete nextUpdates.nsargocd;
    }

    const egressFirewallUpdates = nextUpdates && nextUpdates.egressfirewall ? { ...(nextUpdates.egressfirewall || {}) } : null;
    if (nextUpdates && Object.prototype.hasOwnProperty.call(nextUpdates, "egressfirewall")) {
      delete nextUpdates.egressfirewall;
    }

    const envParam = `env=${encodeURIComponent(activeEnv)}`;
    let updated = null;

    const hasNamespaceInfo = Boolean(nextUpdates && nextUpdates.namespace_info);
    const hasResources = Boolean(nextUpdates && nextUpdates.resources);
    const hasRoleBindings = Boolean(nextUpdates && nextUpdates.rolebindings);

    if (hasNamespaceInfo) {
      const nsInfo = nextUpdates.namespace_info || {};
      const hasClusters = Object.prototype.hasOwnProperty.call(nsInfo, "clusters");
      const hasEgressNameId = Object.prototype.hasOwnProperty.call(nsInfo, "egress_nameid");
      const hasPodBased = Object.prototype.hasOwnProperty.call(nsInfo, "enable_pod_based_egress_ip");

      if (hasClusters) {
        const basicResp = await putJson(
          `/api/v1/apps/${encodeURIComponent(appname)}/namespaces/${encodeURIComponent(namespaceName)}/namespace_info/basic?${envParam}`,
          { namespace_info: { clusters: nsInfo.clusters } },
        );
        updated = { ...(updated || {}), ...(basicResp || {}) };
      }

      if (hasEgressNameId || hasPodBased) {
        const egressResp = await putJson(
          `/api/v1/apps/${encodeURIComponent(appname)}/namespaces/${encodeURIComponent(namespaceName)}/namespace_info/egress?${envParam}`,
          {
            namespace_info: {
              ...(hasEgressNameId ? { egress_nameid: nsInfo.egress_nameid } : {}),
              ...(hasPodBased ? { enable_pod_based_egress_ip: nsInfo.enable_pod_based_egress_ip } : {}),
            },
          },
        );
        updated = { ...(updated || {}), ...(egressResp || {}) };
      }

      delete nextUpdates.namespace_info;
    }

    if (hasResources) {
      const resources = nextUpdates.resources || {};

      const hasResourceQuota = Boolean(resources && (resources.requests || resources.quota_limits));
      if (hasResourceQuota) {
        const rqResp = await putJson(
          `/api/v1/apps/${encodeURIComponent(appname)}/namespaces/${encodeURIComponent(namespaceName)}/resources/resourcequota?${envParam}`,
          {
            requests: resources.requests || null,
            quota_limits: resources.quota_limits || null,
          },
        );

        const prevResources = {
          ...((detailNamespace && detailNamespace.resources) || {}),
          ...((updated && updated.resources) || {}),
        };

        updated = {
          ...(updated || {}),
          resources: {
            ...prevResources,
            requests: rqResp && Object.prototype.hasOwnProperty.call(rqResp, "requests") ? rqResp.requests : null,
            quota_limits: rqResp && Object.prototype.hasOwnProperty.call(rqResp, "quota_limits") ? rqResp.quota_limits : null,
          },
        };
      }

      const hasLimitRange = Boolean(resources && resources.limits);
      if (hasLimitRange) {
        const lrResp = await putJson(
          `/api/v1/apps/${encodeURIComponent(appname)}/namespaces/${encodeURIComponent(namespaceName)}/resources/limitrange?${envParam}`,
          { limits: resources.limits || null },
        );

        const prevResources = {
          ...((detailNamespace && detailNamespace.resources) || {}),
          ...((updated && updated.resources) || {}),
        };

        updated = {
          ...(updated || {}),
          resources: {
            ...prevResources,
            limits: lrResp && Object.prototype.hasOwnProperty.call(lrResp, "limits") ? lrResp.limits : null,
          },
        };
      }

      delete nextUpdates.resources;
    }

    if (hasRoleBindings) {
      const bindings = nextUpdates?.rolebindings?.bindings;
      if (bindings !== undefined) {
        updated = await putJson(
          `/api/v1/apps/${encodeURIComponent(appname)}/namespaces/${encodeURIComponent(namespaceName)}/rolebinding_requests?${envParam}`,
          { bindings: Array.isArray(bindings) ? bindings : [] },
        );
      }
      delete nextUpdates.rolebindings;
    }
    const shouldWriteNsArgo = nextNeedArgo !== null || nsargocdUpdates;
    const shouldWriteEgressFirewall = Boolean(egressFirewallUpdates);
    let didSideEffectWrite = false;
    let sideEffectPatch = null;

    if (!updated && !shouldWriteNsArgo && !shouldWriteEgressFirewall) {
      throw new Error("No matching namespace update route for the provided payload.");
    }

    if (shouldWriteNsArgo) {
      const payload = { ...(nsargocdUpdates || {}) };
      if (nextNeedArgo !== null) payload.need_argo = nextNeedArgo;

      if (payload.need_argo === false) {
        await fetch(
          `/api/v1/apps/${encodeURIComponent(appname)}/namespaces/${encodeURIComponent(namespaceName)}/nsargocd?env=${encodeURIComponent(activeEnv)}`,
          { method: "DELETE", headers: { Accept: "application/json" } },
        );
        sideEffectPatch = {
          ...(sideEffectPatch || {}),
          need_argo: false,
          argocd_sync_strategy: "",
          gitrepourl: "",
        };
      } else {
        const nsArgoResp = await putJson(
          `/api/v1/apps/${encodeURIComponent(appname)}/namespaces/${encodeURIComponent(namespaceName)}/nsargocd?env=${encodeURIComponent(activeEnv)}`,
          payload,
        );
        sideEffectPatch = { ...(sideEffectPatch || {}), ...(nsArgoResp || {}) };
      }
      didSideEffectWrite = true;
    }

    if (shouldWriteEgressFirewall) {
      const rules = Array.isArray(egressFirewallUpdates.rules) ? egressFirewallUpdates.rules : [];
      if (rules.length === 0) {
        await fetch(
          `/api/v1/apps/${encodeURIComponent(appname)}/namespaces/${encodeURIComponent(namespaceName)}/egressfirewall?env=${encodeURIComponent(activeEnv)}`,
          { method: "DELETE", headers: { Accept: "application/json" } },
        );
        sideEffectPatch = { ...(sideEffectPatch || {}), egress_firewall_rules: [] };
      } else {
        const efResp = await putJson(
          `/api/v1/apps/${encodeURIComponent(appname)}/namespaces/${encodeURIComponent(namespaceName)}/egressfirewall?env=${encodeURIComponent(activeEnv)}`,
          { rules },
        );
        const nextRules = Array.isArray(efResp?.rules) ? efResp.rules : rules;
        sideEffectPatch = { ...(sideEffectPatch || {}), egress_firewall_rules: nextRules };
      }
      didSideEffectWrite = true;
    }

    const merged = {
      ...(detailNamespace || {}),
      ...(updated || {}),
      ...(sideEffectPatch || {}),
    };
    setDetailNamespace(merged);
    setNamespaces((prev) => ({ ...(prev || {}), [namespaceName]: merged }));
    return merged;
  }

  async function deleteNamespace(namespaceName) {
    const appname = detailAppName;
    if (!appname) {
      setError("No application selected.");
      return;
    }

    const confirmMsg = `Are you sure you want to delete namespace "${namespaceName}" from ${appname}?\n\nThis action cannot be undone.`;
    if (!confirm(confirmMsg)) {
      return;
    }

    try {
      setLoading(true);
      setError("");

      const response = await fetch(
        `/api/v1/apps/${encodeURIComponent(appname)}/namespaces?env=${encodeURIComponent(activeEnv)}&namespaces=${encodeURIComponent(namespaceName)}`,
        { method: "DELETE", headers: { Accept: "application/json" } }
      );

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`Failed to delete namespace: ${response.status} ${text}`);
      }

      await response.json();

      // Refresh the namespaces list
      const resp = await fetchJson(
        `/api/v1/apps/${encodeURIComponent(appname)}/namespaces?env=${encodeURIComponent(activeEnv)}`,
      );
      setNamespaces(resp || {});

      // Refresh apps list to update totalns count
      const appsResp = await fetchJson(`/api/v1/apps?env=${encodeURIComponent(activeEnv)}`);
      setApps(appsResp);

      const nextClusters = {};
      for (const [appname, app] of Object.entries(appsResp || {})) {
        nextClusters[appname] = Array.isArray(app?.clusters) ? app.clusters.map(String) : [];
      }
      setClustersByApp(nextClusters);

      setError("");
    } catch (e) {
      setError(e?.message || String(e));
    } finally {
      setLoading(false);
    }
  }

  async function deleteApp(appname) {
    const confirmMsg = `Are you sure you want to delete app "${appname}"?\n\nThis will remove all associated namespaces, L4 ingress IPs, and pull requests.\n\nThis action cannot be undone.`;
    if (!confirm(confirmMsg)) {
      return;
    }

    try {
      setLoading(true);
      setError("");

      const response = await fetch(
        `/api/v1/apps/${encodeURIComponent(appname)}?env=${encodeURIComponent(activeEnv)}`,
        { method: "DELETE", headers: { Accept: "application/json" } }
      );
      if (!response.ok) {
        const text = await response.text();
        throw new Error(`Failed to delete ${appname}: ${response.status} ${text}`);
      }
      await response.json();

      // Refresh the apps list
      const appsResp = await fetchJson(`/api/v1/apps?env=${encodeURIComponent(activeEnv)}`);
      setApps(appsResp);

      const nextClusters = {};
      for (const [appname, app] of Object.entries(appsResp || {})) {
        nextClusters[appname] = Array.isArray(app?.clusters) ? app.clusters.map(String) : [];
      }
      setClustersByApp(nextClusters);

      setError("");
    } catch (e) {
      setError(e?.message || String(e));
    } finally {
      setLoading(false);
    }
  }

  async function createApp(payload) {
    const appname = String(payload?.appname || "").trim();
    const description = String(payload?.description || "");
    const managedby = String(payload?.managedby || "");

    if (!appname) throw new Error("App Name is required.");

    await postJson(`/api/v1/apps?env=${encodeURIComponent(activeEnv)}`,
      {
        appname,
        description,
        managedby,
      });

    const appsResp = await fetchJson(`/api/v1/apps?env=${encodeURIComponent(activeEnv)}`);
    setApps(appsResp);

    const nextClusters = {};
    for (const [appname, app] of Object.entries(appsResp || {})) {
      nextClusters[appname] = Array.isArray(app?.clusters) ? app.clusters.map(String) : [];
    }
    setClustersByApp(nextClusters);

    await refreshRequestsChanges();
  }

  async function refreshApps() {
    if (!activeEnv) return;
    const appsResp = await fetchJson(`/api/v1/apps?env=${encodeURIComponent(activeEnv)}`);
    setApps(appsResp);

    const nextClusters = {};
    for (const [k, app] of Object.entries(appsResp || {})) {
      nextClusters[k] = Array.isArray(app?.clusters) ? app.clusters.map(String) : [];
    }
    setClustersByApp(nextClusters);

    await refreshRequestsChanges();
  }

  async function updateApp(appname, payload) {
    const target = String(appname || payload?.appname || "").trim();
    const description = String(payload?.description || "");
    const managedby = String(payload?.managedby || "");

    if (!target) throw new Error("App Name is required.");

    await putJson(`/api/v1/apps/${encodeURIComponent(target)}?env=${encodeURIComponent(activeEnv)}`,
      {
        appname: target,
        description,
        managedby,
      });

    const appsResp = await fetchJson(`/api/v1/apps?env=${encodeURIComponent(activeEnv)}`);
    setApps(appsResp);

    const nextClusters = {};
    for (const [k, app] of Object.entries(appsResp || {})) {
      nextClusters[k] = Array.isArray(app?.clusters) ? app.clusters.map(String) : [];
    }
    setClustersByApp(nextClusters);

    await refreshRequestsChanges();
  }

  async function createNamespace(payload) {
    const appname = detailAppName;
    if (!appname) throw new Error("No application selected.");

    const namespace = String(payload?.namespace || "").trim();
    const clusters = Array.isArray(payload?.clusters)
      ? payload.clusters.map((s) => String(s).trim()).filter(Boolean)
      : String(payload?.clusters || "")
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);
    const need_argo = Boolean(payload?.need_argo);
    const egress_nameid = String(payload?.egress_nameid || "").trim();

    if (!namespace) throw new Error("Namespace name is required.");

    await postJson(
      `/api/v1/apps/${encodeURIComponent(appname)}/namespaces?env=${encodeURIComponent(activeEnv)}`,
      {
        namespace,
        clusters,
        egress_nameid: egress_nameid || undefined,
      }
    );

    if (need_argo) {
      await putJson(
        `/api/v1/apps/${encodeURIComponent(appname)}/namespaces/${encodeURIComponent(namespace)}/nsargocd?env=${encodeURIComponent(activeEnv)}`,
        { need_argo },
      );
    }

    // Refresh the namespaces list
    const resp = await fetchJson(
      `/api/v1/apps/${encodeURIComponent(appname)}/namespaces?env=${encodeURIComponent(activeEnv)}`
    );
    setNamespaces(resp || {});

    // Refresh the apps list to update totalns count
    const appsResp = await fetchJson(`/api/v1/apps?env=${encodeURIComponent(activeEnv)}`);
    setApps(appsResp);

    const nextClusters = {};
    for (const [k, app] of Object.entries(appsResp || {})) {
      nextClusters[k] = Array.isArray(app?.clusters) ? app.clusters.map(String) : [];
    }
    setClustersByApp(nextClusters);

    await refreshRequestsChanges();
  }

  async function onSaveConfig() {
    try {
      setLoading(true);
      setError("");

      const saved = await postJson("/api/v1/config", {
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

      const isComplete = Boolean(
        (saved?.workspace || "").trim() &&
          (saved?.requestsRepo || "").trim() &&
          (saved?.renderedManifestsRepo || "").trim() &&
          (saved?.controlRepo || "").trim(),
      );
      setPersistedConfigComplete(isComplete);
      if (isComplete) {
        const envList = await fetchJson("/api/v1/envlist");
        const keys = Object.keys(envList);
        setEnvKeys(keys);
        const initialEnv = keys[0] || "";
        setActiveEnv(initialEnv);
        setPendingRoute({ env: initialEnv, view: "apps", appname: "", ns: "" });
        if (initialEnv) pushUiUrl({ view: "apps", env: initialEnv, appname: "", ns: "" }, false);
        setTopTab("Request provisioning");
      }
    } catch (e) {
      setError(e?.message || String(e));
    } finally {
      setLoading(false);
    }
  }

  async function onUseDefaults() {
    try {
      setLoading(true);
      setError("");

      const saved = await postJson("/api/v1/config", {
        workspace: "~/workspace",
        requestsRepo: "https://github.com/praveensiddu/kselfservice-requests",
        templatesRepo: "https://github.com/praveensiddu/kselfservice-templates",
        renderedManifestsRepo: "https://github.com/praveensiddu/kselfservice-rendered",
        controlRepo: "https://github.com/praveensiddu/kselfservice-control",
      });

      setWorkspace(saved?.workspace || "");
      setRequestsRepo(saved?.requestsRepo || "");
      setTemplatesRepo(saved?.templatesRepo || "");
      setRenderedManifestsRepo(saved?.renderedManifestsRepo || "");
      setControlRepo(saved?.controlRepo || "");

      const isComplete = Boolean(
        (saved?.workspace || "").trim() &&
          (saved?.requestsRepo || "").trim() &&
          (saved?.renderedManifestsRepo || "").trim() &&
          (saved?.controlRepo || "").trim(),
      );
      setPersistedConfigComplete(isComplete);
      if (isComplete) {
        const envList = await fetchJson("/api/v1/envlist");
        const keys = Object.keys(envList);
        setEnvKeys(keys);
        const initialEnv = keys[0] || "";
        setActiveEnv(initialEnv);
        setPendingRoute({ env: initialEnv, view: "apps", appname: "", ns: "" });
        if (initialEnv) pushUiUrl({ view: "apps", env: initialEnv, appname: "", ns: "" }, false);
        setTopTab("Request provisioning");
      }
    } catch (e) {
      setError(e?.message || String(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AppView
      bannerColor={bannerColor}
      bannerTitle={bannerTitle}
      deploymentEnv={deploymentEnv}
      currentUser={currentUser}
      envKeys={envKeys}
      activeEnv={activeEnv}
      loading={loading}
      view={view}
      error={error}
      topTab={topTab}
      configComplete={configComplete}
      readonly={readonly}
      onTopTabChange={setTopTabWithUrl}
      clustersByEnv={clustersByEnv}
      availableClusters={availableClusters}
      onAddCluster={onAddCluster}
      onDeleteCluster={onDeleteCluster}
      showCreateCluster={showCreateCluster}
      onOpenCreateCluster={() => setShowCreateCluster(true)}
      onCloseCreateCluster={() => setShowCreateCluster(false)}
      workspace={workspace}
      setWorkspace={setWorkspace}
      requestsRepo={requestsRepo}
      setRequestsRepo={setRequestsRepo}
      templatesRepo={templatesRepo}
      setTemplatesRepo={setTemplatesRepo}
      renderedManifestsRepo={renderedManifestsRepo}
      setRenderedManifestsRepo={setRenderedManifestsRepo}
      controlRepo={controlRepo}
      setControlRepo={setControlRepo}
      onSaveConfig={onSaveConfig}
      onUseDefaults={onUseDefaults}
      enforcementSettings={enforcementSettings}
      draftEnforcementSettings={draftEnforcementSettings}
      setDraftEnforcementSettings={setDraftEnforcementSettings}
      enforcementSettingsError={enforcementSettingsError}
      enforcementSettingsLoading={enforcementSettingsLoading}
      onSaveEnforcementSettings={onSaveEnforcementSettings}
      onEnvClick={(env) => {
        setActiveEnv(env);
        pushUiUrl({ view: "apps", env, appname: "" }, false);
      }}
      onViewL4Ingress={onViewL4Ingress}
      onViewEgressIps={onViewEgressIps}
      onViewNamespaces={onViewNamespaces}
      onBackToApps={onBackToApps}
      onBackFromNamespaceDetails={onBackFromNamespaceDetails}
      appRows={appRows}
      clustersByApp={clustersByApp}
      selectedApps={selectedApps}
      toggleRow={toggleRow}
      onSelectAllFromFiltered={onSelectAllFromFiltered}
      deleteApp={deleteApp}
      openNamespaces={openNamespaces}
      detailNamespace={detailNamespace}
      detailNamespaceName={detailNamespaceName}
      namespaces={namespaces}
      selectedNamespaces={selectedNamespaces}
      toggleNamespace={toggleNamespace}
      onSelectAllNamespaces={onSelectAllNamespaces}
      deleteNamespace={deleteNamespace}
      onCopyNamespace={copyNamespace}
      viewNamespaceDetails={viewNamespaceDetails}
      onUpdateNamespaceInfo={onUpdateNamespaceInfo}
      onCreateApp={createApp}
      onUpdateApp={updateApp}
      onRefreshApps={refreshApps}
      showCreateApp={showCreateApp}
      onOpenCreateApp={async () => {
        try {
          await refreshClusters(activeEnv);
        } catch {
          // noop
        }
        setShowCreateApp(true);
      }}
      onCloseCreateApp={() => setShowCreateApp(false)}
      onCreateNamespace={createNamespace}
      showCreateNamespace={showCreateNamespace}
      onOpenCreateNamespace={() => setShowCreateNamespace(true)}
      onCloseCreateNamespace={() => setShowCreateNamespace(false)}
      detailAppName={detailAppName}
      argocdEnabled={selectedAppArgocdEnabled}
      requestsChanges={requestsChanges}
      l4IngressItems={l4IngressItems}
      egressIpItems={egressIpItems}
      namespaceDetailsHeaderButtons={namespaceDetailsHeaderButtons}
      onSetNamespaceDetailsHeaderButtons={setNamespaceDetailsHeaderButtons}
    />
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);
