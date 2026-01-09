async function fetchJson(url) {
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${res.status} ${res.statusText}: ${text}`);
  }
  return await res.json();
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

  const [apps, setApps] = React.useState({});
  const [l4IpsByApp, setL4IpsByApp] = React.useState({});
  const [selectedApps, setSelectedApps] = React.useState(() => new Set());
  const [view, setView] = React.useState("apps");
  const [namespaces, setNamespaces] = React.useState({});
  const [selectedNamespaces, setSelectedNamespaces] = React.useState(() => new Set());
  const [l4IngressItems, setL4IngressItems] = React.useState([]);
  const [selectedL4IngressRows, setSelectedL4IngressRows] = React.useState(() => new Set());

  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");

  React.useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setLoading(true);
        setError("");

        const [deploymentType, user, envList] = await Promise.all([
          fetchJson("/deployment_type"),
          fetchJson("/current-user"),
          fetchJson("/envlist"),
        ]);

        if (cancelled) return;

        setDeployment(deploymentType);
        setCurrentUser(user.user || "");

        const keys = Object.keys(envList);
        setEnvKeys(keys);
        const first = keys[0] || "";
        setActiveEnv(first);
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
    if (!activeEnv) return;

    let cancelled = false;

    (async () => {
      try {
        setLoading(true);
        setError("");

        const appsResp = await fetchJson(`/apps?env=${encodeURIComponent(activeEnv)}`);
        if (cancelled) return;

        setApps(appsResp);
        setSelectedApps(new Set());
        setView("apps");
        setNamespaces({});
        setSelectedNamespaces(new Set());
        setL4IngressItems([]);
        setSelectedL4IngressRows(new Set());

        const appNames = Object.keys(appsResp);
        const l4Pairs = await Promise.all(
          appNames.map(async (appname) => {
            const items = await fetchJson(
              `/apps/${encodeURIComponent(appname)}/l4_ingress?env=${encodeURIComponent(activeEnv)}`,
            );
            const ips = uniqStrings((items || []).flatMap((i) => i.allocated_ips || []));
            return [appname, ips];
          }),
        );

        if (cancelled) return;

        const next = {};
        for (const [appname, ips] of l4Pairs) next[appname] = ips;
        setL4IpsByApp(next);
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
  const bannerTitle = deployment?.title?.[deploymentEnv] || "OCP Management Portal";
  const bannerColor = deployment?.headerColor?.[deploymentEnv] || "#384454";

  const appRows = Object.keys(apps).map((k) => apps[k]);

  function requireExactlyOneSelectedApp() {
    const selected = Array.from(selectedApps);
    if (selected.length !== 1) {
      setError("Select exactly one application.");
      return null;
    }
    return selected[0];
  }

  async function onViewNamespaces() {
    const appname = requireExactlyOneSelectedApp();
    if (!appname) return;

    try {
      setLoading(true);
      setError("");
      const resp = await fetchJson(
        `/apps/${encodeURIComponent(appname)}/namespaces?env=${encodeURIComponent(activeEnv)}`,
      );
      setNamespaces(resp || {});
      setSelectedNamespaces(new Set());
      setL4IngressItems([]);
      setSelectedL4IngressRows(new Set());
      setView("namespaces");
    } catch (e) {
      setError(e?.message || String(e));
    } finally {
      setLoading(false);
    }
  }

  function onBackToApps() {
    setView("apps");
    setNamespaces({});
    setSelectedNamespaces(new Set());
    setL4IngressItems([]);
    setSelectedL4IngressRows(new Set());
    setError("");
  }

  function onSelectAllFromFiltered(checked, appnames) {
    if (checked) setSelectedApps(new Set(appnames));
    else setSelectedApps(new Set());
  }

  function onToggleNamespace(name, checked) {
    setSelectedNamespaces((prev) => {
      const next = new Set(prev);
      if (checked) next.add(name);
      else next.delete(name);
      return next;
    });
  }

  function onToggleL4IngressRow(key, checked) {
    setSelectedL4IngressRows((prev) => {
      const next = new Set(prev);
      if (checked) next.add(key);
      else next.delete(key);
      return next;
    });
  }

  async function onViewL4Ingress() {
    const appname = requireExactlyOneSelectedApp();
    if (!appname) return;

    try {
      setLoading(true);
      setError("");
      const items = await fetchJson(
        `/apps/${encodeURIComponent(appname)}/l4_ingress?env=${encodeURIComponent(activeEnv)}`,
      );
      setL4IngressItems(items || []);
      setSelectedL4IngressRows(new Set());
      setNamespaces({});
      setSelectedNamespaces(new Set());
      setView("l4ingress");
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

  return (
    <div>
      <div className="topbar" style={{ background: bannerColor }}>
        <div>
          <div className="title">{bannerTitle}</div>
          <div className="envLabel">
            Deployment: <span className="pill">{deploymentEnv || "unknown"}</span>
          </div>
        </div>
        <div className="user">{currentUser ? `Logged in as ${currentUser}` : ""}</div>
      </div>

      <div className="container">
        <div className="row">
          <div className="muted">Environments</div>
          <div className="muted">{loading ? "Loading…" : ""}</div>
        </div>

        <div className="tabs">
          {envKeys.map((env) => (
            <button
              key={env}
              className={env === activeEnv ? "tab active" : "tab"}
              onClick={() => setActiveEnv(env)}
              type="button"
            >
              {env}
            </button>
          ))}
        </div>

        <div className="actions">
          {view === "apps" ? (
            <button className="btn" type="button" onClick={onViewNamespaces}>
              View Namespaces
            </button>
          ) : (
            <button className="btn" type="button" onClick={onBackToApps}>
              Back to App
            </button>
          )}
          <button className="btn" type="button" onClick={onViewL4Ingress}>
            View L4 ingress IPs
          </button>
        </div>

        {error ? <div className="status">Error: {error}</div> : null}

        {view === "apps" ? (
          <AppsTable
            rows={appRows}
            l4IpsByApp={l4IpsByApp}
            selectedApps={selectedApps}
            onToggleRow={toggleRow}
            onSelectAll={onSelectAllFromFiltered}
          />
        ) : view === "namespaces" ? (
          <NamespacesTable
            namespaces={namespaces}
            selectedNamespaces={selectedNamespaces}
            onToggleNamespace={onToggleNamespace}
          />
        ) : (
          <L4IngressTable
            items={l4IngressItems}
            selectedRows={selectedL4IngressRows}
            onToggleRow={onToggleL4IngressRow}
          />
        )}
      </div>
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);
