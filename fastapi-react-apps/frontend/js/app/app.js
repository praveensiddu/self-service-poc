async function fetchJson(url) {
  const res = await fetch(url, { headers: { Accept: "application/json" } });
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

function parseUiRouteFromLocation() {
  try {
    const path = window.location.pathname || "/";
    const params = new URLSearchParams(window.location.search || "");
    const env = params.get("env") || "";

    const m = path.match(/^\/apps(?:\/([^/]+)(?:\/(namespaces|l4_ingress|egress_ips))?)?\/$/);
    if (!m) return { env, view: "apps", appname: "" };

    const appname = m[1] ? decodeURIComponent(m[1]) : "";
    const tail = m[2] || "";
    if (tail === "namespaces") return { env, view: "namespaces", appname };
    if (tail === "l4_ingress") return { env, view: "l4ingress", appname };
    if (tail === "egress_ips") return { env, view: "egressips", appname };
    return { env, view: "apps", appname: "" };
  } catch {
    return { env: "", view: "apps", appname: "" };
  }
}

function buildUiUrl({ view, env, appname }) {
  const q = env ? `?env=${encodeURIComponent(env)}` : "";
  if (view === "namespaces" && appname) return `/apps/${encodeURIComponent(appname)}/namespaces${q}`;
  if (view === "l4ingress" && appname) return `/apps/${encodeURIComponent(appname)}/l4_ingress${q}`;
  if (view === "egressips" && appname) return `/apps/${encodeURIComponent(appname)}/egress_ips${q}`;
  return `/apps${q}`;
}

function isHomePath() {
  const path = (window.location.pathname || "/").toLowerCase();
  return path === "/home" || path === "/home/";
}

function pushUiUrl(next, replace = false) {
  const url = buildUiUrl(next);
  const state = { view: next.view, env: next.env || "", appname: next.appname || "" };
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

  const [workspace, setWorkspace] = React.useState("");
  const [requestsRepo, setRequestsRepo] = React.useState("");
  const [renderedManifestsRepo, setRenderedManifestsRepo] = React.useState("");
  const [persistedConfigComplete, setPersistedConfigComplete] = React.useState(false);
  const [topTab, setTopTab] = React.useState("Home");

  const [apps, setApps] = React.useState({});
  const [clustersByApp, setClustersByApp] = React.useState({});
  const [selectedNamespaces, setSelectedNamespaces] = React.useState(() => new Set());
  const [l4IpsByApp, setL4IpsByApp] = React.useState({});
  const [egressIpsByApp, setEgressIpsByApp] = React.useState({});
  const [selectedApps, setSelectedApps] = React.useState(new Set());
  const [view, setView] = React.useState("apps");
  const [detailAppName, setDetailAppName] = React.useState("");
  const [detailNamespace, setDetailNamespace] = React.useState(null);
  const [detailNamespaceName, setDetailNamespaceName] = React.useState("");
  const [namespaces, setNamespaces] = React.useState({});
  const [l4IngressItems, setL4IngressItems] = React.useState([]);
  const [egressIpItems, setEgressIpItems] = React.useState([]);
  const [selectedEgressIps, setSelectedEgressIps] = React.useState(new Set());

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

    if (!configComplete) {
      setTopTab("Home");
      window.history.pushState({ topTab: "Home" }, "", "/home");
      return;
    }

    if (nextTab === "Request provisioning") {
      pushUiUrl({ view, env: activeEnv, appname: detailAppName }, false);
      return;
    }
  }

  React.useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setLoading(true);
        setError("");

        const [deploymentType, user, envList, cfg] = await Promise.all([
          fetchJson("/api/deployment_type"),
          fetchJson("/api/current-user"),
          fetchJson("/api/envlist"),
          fetchJson("/api/config"),
        ]);

        if (cancelled) return;

        setDeployment(deploymentType);
        setCurrentUser(user.user || "");

        setWorkspace(cfg?.workspace || "");
        setRequestsRepo(cfg?.requestsRepo || "");
        setRenderedManifestsRepo(cfg?.renderedManifestsRepo || "");

        const keys = Object.keys(envList);
        setEnvKeys(keys);
        const first = keys[0] || "";
        const initial = parseUiRouteFromLocation();
        const initialEnv = keys.includes(initial.env) ? initial.env : first;
        setPendingRoute(initial);
        setActiveEnv(initialEnv);
        pushUiUrl({ view: initial.view, env: initialEnv, appname: initial.appname }, true);

        const isComplete = Boolean(
          (cfg?.workspace || "").trim() && (cfg?.requestsRepo || "").trim() && (cfg?.renderedManifestsRepo || "").trim()
        );
        setPersistedConfigComplete(isComplete);

        if (isHomePath()) {
          setTopTab("Home");
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

  const deploymentEnv = deployment?.deployment_env || "";
  const bannerTitle = deployment?.title?.[deploymentEnv] || "OCP App Provisioning Portal";
  const bannerColor = deployment?.headerColor?.[deploymentEnv] || "#384454";

  const appRows = Object.keys(apps).map((k) => apps[k]);


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
    } catch (e) {
      setError(e?.message || String(e));
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

  async function onViewNamespaces() {
    const appname = getDetailOrSelectedApp();
    if (!appname) return;
    await openNamespaces(appname, true);
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
  }, [envKeys, activeEnv]);

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

  async function onViewNamespaces() {
    const appname = getDetailOrSelectedApp();
    if (!appname) return;
    await openNamespaces(appname, true);
  }

  async function onViewL4Ingress() {
    const appname = getDetailOrSelectedApp();
    if (!appname) return;
    await openL4Ingress(appname, true);
  }

  function viewNamespaceDetails(namespaceName, namespaceData) {
    setDetailNamespace(namespaceData);
    setDetailNamespaceName(namespaceName);
    setView("namespaceDetails");
  }

  function onBackFromNamespaceDetails() {
    setDetailNamespace(null);
    setDetailNamespaceName("");
    setView("namespaces");
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

  async function onSaveConfig() {
    try {
      setLoading(true);
      setError("");

      const saved = await postJson("/api/config", {
        workspace,
        requestsRepo,
        renderedManifestsRepo,
      });

      setWorkspace(saved?.workspace || "");
      setRequestsRepo(saved?.requestsRepo || "");
      setRenderedManifestsRepo(saved?.renderedManifestsRepo || "");

      const isComplete = Boolean(
        (saved?.workspace || "").trim() && (saved?.requestsRepo || "").trim() && (saved?.renderedManifestsRepo || "").trim(),
      );
      setPersistedConfigComplete(isComplete);
      if (isComplete) setTopTab("Request provisioning");
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
      onTopTabChange={setTopTabWithUrl}
      workspace={workspace}
      setWorkspace={setWorkspace}
      requestsRepo={requestsRepo}
      setRequestsRepo={setRequestsRepo}
      renderedManifestsRepo={renderedManifestsRepo}
      setRenderedManifestsRepo={setRenderedManifestsRepo}
      onSaveConfig={onSaveConfig}
      onEnvClick={(env) => {
        setActiveEnv(env);
        pushUiUrl({ view: "apps", env, appname: "" }, false);
      }}
      onViewNamespaces={onViewNamespaces}
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
      detailAppName={detailAppName}
      l4IngressItems={l4IngressItems}
      egressIpItems={egressIpItems}
      selectedEgressIps={selectedEgressIps}
      toggleEgressIp={toggleEgressIp}
      onSelectAllEgressIps={onSelectAllEgressIps}
    />
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);
