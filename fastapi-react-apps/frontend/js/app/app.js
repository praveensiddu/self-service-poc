async function fetchJson(url) {
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${res.status} ${res.statusText}: ${text}`);
  }
  return await res.json();
}

async function deleteJson(url) {
  const res = await fetch(url, {
    method: "DELETE",
    headers: { Accept: "application/json" },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${res.status} ${res.statusText}: ${text}`);
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
    const text = await res.text();
    throw new Error(`${res.status} ${res.statusText}: ${text}`);
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
    const text = await res.text();
    throw new Error(`${res.status} ${res.statusText}: ${text}`);
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
  const [l4IpsByApp, setL4IpsByApp] = React.useState({});
  const [egressIpsByApp, setEgressIpsByApp] = React.useState({});
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
  const [selectedEgressIps, setSelectedEgressIps] = React.useState(new Set());
  const [namespaceDetailsHeaderButtons, setNamespaceDetailsHeaderButtons] = React.useState(null);

  const [clustersByEnv, setClustersByEnv] = React.useState({});

  const [requestsChanges, setRequestsChanges] = React.useState({ apps: new Set(), namespaces: new Set() });

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
          fetchJson("/api/deployment_type"),
          fetchJson("/api/current-user"),
          fetchJson("/api/config"),
          fetchJson("/api/portal-mode"),
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
            envList = await fetchJson("/api/envlist");
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
        if (isComplete && initialEnv && !isHomePath() && !isPrsPath() && !isClustersPath()) {
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
    if (!activeEnv) return;
    if (isPrsPath()) return;

    let cancelled = false;

    (async () => {
      try {
        setLoading(true);
        setError("");

        const appsResp = await fetchJson(`/api/apps?env=${encodeURIComponent(activeEnv)}`);
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
        setSelectedEgressIps(new Set());

        const appNames = Object.keys(appsResp);

        const l4Pairs = await Promise.all(
          appNames.map(async (appname) => {
            const items = await fetchJson(
              `/api/apps/${encodeURIComponent(appname)}/l4_ingress?env=${encodeURIComponent(activeEnv)}`,
            );
            const ips = uniqStrings((items || []).flatMap((i) => i.allocated_ips || []));
            return [appname, ips];
          }),
        );

        if (cancelled) return;

        const next = {};
        for (const [appname, ips] of l4Pairs) next[appname] = ips;
        setL4IpsByApp(next);

        const egressPairs = await Promise.all(
          appNames.map(async (appname) => {
            const items = await fetchJson(
              `/api/apps/${encodeURIComponent(appname)}/egress_ips?env=${encodeURIComponent(activeEnv)}`,
            );
            const ips = uniqStrings((items || []).flatMap((i) => i.allocated_ips || []));
            return [appname, ips];
          }),
        );

        if (cancelled) return;

        const nextEgress = {};
        for (const [appname, ips] of egressPairs) nextEgress[appname] = ips;
        setEgressIpsByApp(nextEgress);

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
            const nsResp = await openNamespaces(pr.appname, false);
            const nsName = pr.ns || "";
            if (nsResp && nsName && nsResp[nsName]) {
              viewNamespaceDetails(nsName, nsResp[nsName], pr.appname);
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
        const data = await fetchJson(`/api/requests/changes?env=${encodeURIComponent(activeEnv)}`);
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
      const data = await fetchJson(`/api/requests/changes?env=${encodeURIComponent(activeEnv)}`);
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
        `/api/apps/${encodeURIComponent(appname)}/namespaces?env=${encodeURIComponent(activeEnv)}`,
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

  async function openL4Ingress(appname, push = true) {
    if (!appname) return;
    try {
      setLoading(true);
      setError("");
      const items = await fetchJson(
        `/api/apps/${encodeURIComponent(appname)}/l4_ingress?env=${encodeURIComponent(activeEnv)}`,
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
        `/api/apps/${encodeURIComponent(appname)}/egress_ips?env=${encodeURIComponent(activeEnv)}`,
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
    setSelectedEgressIps(new Set());
    setError("");
    pushUiUrl({ view: "apps", env: activeEnv, appname: "" }, false);
  }


  async function onViewEgressIps() {
    const appname = getDetailOrSelectedApp();
    if (!appname) return;
    await openEgressIps(appname, true);
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
        setSelectedEgressIps(new Set());
      }
    }

    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [envKeys, activeEnv, configComplete]);

  async function refreshClusters(env) {
    const effectiveEnv = env || activeEnv || (envKeys[0] || "");
    const q = effectiveEnv ? `?env=${encodeURIComponent(effectiveEnv)}` : "";
    const data = await fetchJson(`/api/clusters${q}`);
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

    try {
      setLoading(true);
      setError("");
      await postJson(`/api/clusters?env=${encodeURIComponent(env)}`, {
        clustername,
        purpose,
        datacenter,
        applications,
      });
      await refreshClusters(env);
      await refreshApps();
    } catch (e) {
      setError(e?.message || String(e));
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
      await deleteJson(`/api/clusters/${encodeURIComponent(clustername)}?env=${encodeURIComponent(env)}`);
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

  function onSelectAllEgressIps(checked, indices) {
    if (checked) setSelectedEgressIps(new Set(indices));
    else setSelectedEgressIps(new Set());
  }

  function toggleEgressIp(index, checked) {
    setSelectedEgressIps((prev) => {
      const next = new Set(prev);
      if (checked) next.add(index);
      else next.delete(index);
      return next;
    });
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

  function viewNamespaceDetails(namespaceName, namespaceData, appnameOverride) {
    setDetailNamespace(namespaceData);
    setDetailNamespaceName(namespaceName);
    setView("namespaceDetails");
    const appname = appnameOverride || detailAppName;
    pushUiUrl({ view: "namespaceDetails", env: activeEnv, appname, ns: namespaceName }, false);
  }

  function onBackFromNamespaceDetails() {
    setDetailNamespace(null);
    setDetailNamespaceName("");
    setView("namespaces");
    pushUiUrl({ view: "namespaces", env: activeEnv, appname: detailAppName }, false);
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

    const updated = await putJson(
      `/api/apps/${encodeURIComponent(appname)}/namespaces/${encodeURIComponent(namespaceName)}/namespace_info?env=${encodeURIComponent(activeEnv)}`,
      nextUpdates || {},
    );

    const shouldWriteNsArgo = nextNeedArgo !== null || nsargocdUpdates;
    const shouldWriteEgressFirewall = Boolean(egressFirewallUpdates);
    let didSideEffectWrite = false;

    if (shouldWriteNsArgo) {
      const payload = { ...(nsargocdUpdates || {}) };
      if (nextNeedArgo !== null) payload.need_argo = nextNeedArgo;

      if (payload.need_argo === false) {
        await fetch(
          `/api/apps/${encodeURIComponent(appname)}/namespaces/${encodeURIComponent(namespaceName)}/nsargocd?env=${encodeURIComponent(activeEnv)}`,
          { method: "DELETE", headers: { Accept: "application/json" } },
        );
      } else {
        await putJson(
          `/api/apps/${encodeURIComponent(appname)}/namespaces/${encodeURIComponent(namespaceName)}/nsargocd?env=${encodeURIComponent(activeEnv)}`,
          payload,
        );
      }
      didSideEffectWrite = true;
    }

    if (shouldWriteEgressFirewall) {
      const rules = Array.isArray(egressFirewallUpdates.rules) ? egressFirewallUpdates.rules : [];
      if (rules.length === 0) {
        await fetch(
          `/api/apps/${encodeURIComponent(appname)}/namespaces/${encodeURIComponent(namespaceName)}/egressfirewall?env=${encodeURIComponent(activeEnv)}`,
          { method: "DELETE", headers: { Accept: "application/json" } },
        );
      } else {
        await putJson(
          `/api/apps/${encodeURIComponent(appname)}/namespaces/${encodeURIComponent(namespaceName)}/egressfirewall?env=${encodeURIComponent(activeEnv)}`,
          { rules },
        );
      }
      didSideEffectWrite = true;
    }

    if (didSideEffectWrite) {
      const refreshed = await fetchJson(
        `/api/apps/${encodeURIComponent(appname)}/namespaces?env=${encodeURIComponent(activeEnv)}`,
      );
      setNamespaces(refreshed || {});
      const refreshedNs = (refreshed || {})[namespaceName] || updated;
      setDetailNamespace(refreshedNs);
      return refreshedNs;
    }

    setDetailNamespace(updated);
    setNamespaces((prev) => ({ ...(prev || {}), [namespaceName]: updated }));
    return updated;
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
        `/api/apps/${encodeURIComponent(appname)}/namespaces?env=${encodeURIComponent(activeEnv)}&namespaces=${encodeURIComponent(namespaceName)}`,
        { method: "DELETE", headers: { Accept: "application/json" } }
      );

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`Failed to delete namespace: ${response.status} ${text}`);
      }

      await response.json();

      // Refresh the namespaces list
      const resp = await fetchJson(
        `/api/apps/${encodeURIComponent(appname)}/namespaces?env=${encodeURIComponent(activeEnv)}`,
      );
      setNamespaces(resp || {});

      // Refresh apps list to update totalns count
      const appsResp = await fetchJson(`/api/apps?env=${encodeURIComponent(activeEnv)}`);
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
        `/api/apps/${encodeURIComponent(appname)}?env=${encodeURIComponent(activeEnv)}`,
        { method: "DELETE", headers: { Accept: "application/json" } }
      );
      if (!response.ok) {
        const text = await response.text();
        throw new Error(`Failed to delete ${appname}: ${response.status} ${text}`);
      }
      await response.json();

      // Refresh the apps list
      const appsResp = await fetchJson(`/api/apps?env=${encodeURIComponent(activeEnv)}`);
      setApps(appsResp);

      const nextClusters = {};
      for (const [appname, app] of Object.entries(appsResp || {})) {
        nextClusters[appname] = Array.isArray(app?.clusters) ? app.clusters.map(String) : [];
      }
      setClustersByApp(nextClusters);

      // Refresh L4 IPs
      const appNames = Object.keys(appsResp);
      const l4Pairs = await Promise.all(
        appNames.map(async (appname) => {
          const items = await fetchJson(
            `/api/apps/${encodeURIComponent(appname)}/l4_ingress?env=${encodeURIComponent(activeEnv)}`,
          );
          const ips = uniqStrings((items || []).flatMap((i) => i.allocated_ips || []));
          return [appname, ips];
        }),
      );

      const next = {};
      for (const [appname, ips] of l4Pairs) next[appname] = ips;
      setL4IpsByApp(next);

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

    await postJson(`/api/apps?env=${encodeURIComponent(activeEnv)}`,
      {
        appname,
        description,
        managedby,
      });

    const appsResp = await fetchJson(`/api/apps?env=${encodeURIComponent(activeEnv)}`);
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
    const appsResp = await fetchJson(`/api/apps?env=${encodeURIComponent(activeEnv)}`);
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

    await putJson(`/api/apps/${encodeURIComponent(target)}?env=${encodeURIComponent(activeEnv)}`,
      {
        appname: target,
        description,
        managedby,
      });

    const appsResp = await fetchJson(`/api/apps?env=${encodeURIComponent(activeEnv)}`);
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
      `/api/apps/${encodeURIComponent(appname)}/namespaces?env=${encodeURIComponent(activeEnv)}`,
      {
        namespace,
        clusters,
        egress_nameid: egress_nameid || undefined,
      }
    );

    if (need_argo) {
      await putJson(
        `/api/apps/${encodeURIComponent(appname)}/namespaces/${encodeURIComponent(namespace)}/nsargocd?env=${encodeURIComponent(activeEnv)}`,
        { need_argo },
      );
    }

    // Refresh the namespaces list
    const resp = await fetchJson(
      `/api/apps/${encodeURIComponent(appname)}/namespaces?env=${encodeURIComponent(activeEnv)}`
    );
    setNamespaces(resp || {});

    // Refresh the apps list to update totalns count
    const appsResp = await fetchJson(`/api/apps?env=${encodeURIComponent(activeEnv)}`);
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

      const saved = await postJson("/api/config", {
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
        const envList = await fetchJson("/api/envlist");
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

      const saved = await postJson("/api/config", {
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
        const envList = await fetchJson("/api/envlist");
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
      onEnvClick={(env) => {
        setActiveEnv(env);
        pushUiUrl({ view: "apps", env, appname: "" }, false);
      }}
      onViewL4Ingress={onViewL4Ingress}
      onViewEgressIps={onViewEgressIps}
      onBackToApps={onBackToApps}
      onBackFromNamespaceDetails={onBackFromNamespaceDetails}
      appRows={appRows}
      clustersByApp={clustersByApp}
      l4IpsByApp={l4IpsByApp}
      egressIpsByApp={egressIpsByApp}
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
      selectedEgressIps={selectedEgressIps}
      toggleEgressIp={toggleEgressIp}
      onSelectAllEgressIps={onSelectAllEgressIps}
      namespaceDetailsHeaderButtons={namespaceDetailsHeaderButtons}
      onSetNamespaceDetailsHeaderButtons={setNamespaceDetailsHeaderButtons}
    />
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);
