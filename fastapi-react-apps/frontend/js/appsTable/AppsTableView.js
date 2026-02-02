function AppsTableView({
  filteredRows,
  allSelected,
  filters,
  setFilters,
  env,
  onRefreshApps,
  clustersByApp,
  l4IpsByApp,
  egressIpsByApp,
  availableClusters,
  selectedApps,
  onToggleRow,
  onSelectAll,
  onDeleteApp,
  onViewDetails,
  onCreateApp,
  onUpdateApp,
  showCreate,
  onOpenCreate,
  onCloseCreate,
}) {
  const [newAppName, setNewAppName] = React.useState("");
  const [newDescription, setNewDescription] = React.useState("");
  const [newManagedBy, setNewManagedBy] = React.useState("");

  const canSubmitCreate = Boolean(
    (newAppName || "").trim() && (newDescription || "").trim() && (newManagedBy || "").trim(),
  );

  function normalizeCluster(v) {
    return String(v || "").trim();
  }

  const [showEdit, setShowEdit] = React.useState(false);
  const [editAppName, setEditAppName] = React.useState("");
  const [editDescription, setEditDescription] = React.useState("");
  const [editManagedBy, setEditManagedBy] = React.useState("");

  const [showArgoCd, setShowArgoCd] = React.useState(false);
  const [argoCdAppName, setArgoCdAppName] = React.useState("");
  const [argoCdExists, setArgoCdExists] = React.useState(false);
  const [argoCdAdminGroups, setArgoCdAdminGroups] = React.useState("");
  const [argoCdOperatorGroups, setArgoCdOperatorGroups] = React.useState("");
  const [argoCdReadonlyGroups, setArgoCdReadonlyGroups] = React.useState("");
  const [argoCdSyncStrategy, setArgoCdSyncStrategy] = React.useState("auto");
  const [argoCdGitUrl, setArgoCdGitUrl] = React.useState("");

  const canSubmitArgoCd = Boolean(String(argoCdGitUrl || "").trim());

  async function openArgoCd(row) {
    const r = row || {};
    const name = String(r?.appname || "");
    setArgoCdAppName(name);
    setArgoCdExists(Boolean(r?.argocd));

    setArgoCdAdminGroups("");
    setArgoCdOperatorGroups("");
    setArgoCdReadonlyGroups("");
    setArgoCdSyncStrategy("auto");
    setArgoCdGitUrl("");

    setShowArgoCd(true);

    try {
      if (!env) throw new Error("Missing env");
      const resp = await fetch(
        `/api/apps/${encodeURIComponent(name)}/argocd?env=${encodeURIComponent(env)}`,
        { headers: { Accept: "application/json" } }
      );
      if (resp.ok) {
        const parsed = await resp.json();
        setArgoCdExists(Boolean(parsed?.exists));
        setArgoCdAdminGroups(String(parsed?.argocd_admin_groups || ""));
        setArgoCdOperatorGroups(String(parsed?.argocd_operator_groups || ""));
        setArgoCdReadonlyGroups(String(parsed?.argocd_readonly_groups || ""));
        setArgoCdSyncStrategy(String(parsed?.argocd_sync_strategy || "auto") || "auto");
        setArgoCdGitUrl(String(parsed?.gitrepourl || ""));
      }
    } catch {
      // Best-effort prefill; keep modal open with defaults.
    }
  }

  function closeArgoCd() {
    setShowArgoCd(false);
  }

  async function onSubmitArgoCd() {
    try {
      const name = String(argoCdAppName || "").trim();
      if (!name) throw new Error("App Name is required.");
      if (!env) throw new Error("Environment is required.");
      const payload = {
        argocd_admin_groups: String(argoCdAdminGroups || "").trim(),
        argocd_operator_groups: String(argoCdOperatorGroups || "").trim(),
        argocd_readonly_groups: String(argoCdReadonlyGroups || "").trim(),
        argocd_sync_strategy: String(argoCdSyncStrategy || "").trim(),
        gitrepourl: String(argoCdGitUrl || "").trim(),
      };

      const resp = await fetch(
        `/api/apps/${encodeURIComponent(name)}/argocd?env=${encodeURIComponent(env)}`,
        {
          method: "PUT",
          headers: { Accept: "application/json", "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      if (!resp.ok) {
        const text = await resp.text();
        throw new Error(`${resp.status} ${resp.statusText}: ${text}`);
      }
      setArgoCdExists(true);
      setShowArgoCd(false);
      if (typeof onRefreshApps === "function") {
        await onRefreshApps();
      }
    } catch (e) {
      alert(e?.message || String(e));
    }
  }

  async function onDeleteArgoCd() {
    try {
      const name = String(argoCdAppName || "").trim();
      if (!name) throw new Error("App Name is required.");
      if (!env) throw new Error("Environment is required.");

      const resp = await fetch(
        `/api/apps/${encodeURIComponent(name)}/argocd?env=${encodeURIComponent(env)}`,
        { method: "DELETE", headers: { Accept: "application/json" } }
      );
      if (!resp.ok) {
        const text = await resp.text();
        throw new Error(`${resp.status} ${resp.statusText}: ${text}`);
      }

      setArgoCdExists(false);
      setArgoCdAdminGroups("");
      setArgoCdOperatorGroups("");
      setArgoCdReadonlyGroups("");
      setArgoCdSyncStrategy("auto");
      setArgoCdGitUrl("");
      setShowArgoCd(false);
      if (typeof onRefreshApps === "function") {
        await onRefreshApps();
      }
    } catch (e) {
      alert(e?.message || String(e));
    }
  }

  const canSubmitEdit = Boolean(
    (editAppName || "").trim() && (editDescription || "").trim() && (editManagedBy || "").trim(),
  );

  function openEditApp(row) {
    const r = row || {};
    const name = String(r?.appname || "");
    setEditAppName(name);
    setEditDescription(String(r?.description || ""));
    setEditManagedBy(String(r?.managedby || ""));
    setShowEdit(true);
  }

  async function onSubmitEdit() {
    try {
      if (typeof onUpdateApp !== "function") return;
      const target = String(editAppName || "").trim();
      if (!target) throw new Error("App Name is required.");
      await onUpdateApp(target, {
        appname: target,
        description: editDescription,
        managedby: editManagedBy,
      });
      setShowEdit(false);
    } catch (e) {
      alert(e?.message || String(e));
    }
  }

  return (
    <div className="card">

      {showCreate ? (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.45)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) onCloseCreate();
          }}
          data-testid="create-app-modal"
        >
          <div className="card" style={{ width: 640, maxWidth: "92vw", padding: 16, overflow: "visible" }}>
            <div className="muted" style={{ textAlign: "center", marginBottom: 8 }}>
              Environment: {env || ""}
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <div style={{ fontWeight: 700 }}>Create App</div>
              <button className="btn" type="button" onClick={onCloseCreate} data-testid="close-app-modal-btn">
                Close
              </button>
            </div>

            <div style={{ display: "grid", gap: 12 }}>
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
                  <div className="muted">App Name</div>
                  <div className="muted" style={{ fontSize: 12 }}>Alphanumeric, lowercase, no special characters, max 22 characters</div>
                </div>
                <input
                  className="filterInput"
                  value={newAppName}
                  onChange={(e) => {
                    const v = String(e.target.value || "")
                      .toLowerCase()
                      .replace(/[^a-z0-9]/g, "")
                      .slice(0, 22);
                    setNewAppName(v);
                  }}
                  data-testid="input-appname"
                />
              </div>

              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
                  <div className="muted">Description</div>
                  <div className="muted" style={{ fontSize: 12 }}>Short summary</div>
                </div>
                <input className="filterInput" value={newDescription} onChange={(e) => setNewDescription(e.target.value)} data-testid="input-description" />
              </div>

              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
                  <div className="muted">Managed By</div>
                  <div className="muted" style={{ fontSize: 12 }}>Team or owner</div>
                </div>
                <input className="filterInput" value={newManagedBy} onChange={(e) => setNewManagedBy(e.target.value)} data-testid="input-managedby" />
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 14 }}>
              <button
                className="btn btn-primary"
                type="button"
                onClick={async () => {
                  try {
                    if (typeof onCreateApp !== "function") return;
                    await onCreateApp({
                      appname: newAppName,
                      description: newDescription,
                      managedby: newManagedBy,
                    });
                    onCloseCreate();
                    setNewAppName("");
                    setNewDescription("");
                    setNewManagedBy("");
                  } catch (e) {
                    alert(e?.message || String(e));
                  }
                }}
                disabled={!canSubmitCreate}
                data-testid="submit-app-btn"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {showArgoCd ? (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.45)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) closeArgoCd();
          }}
          data-testid="argocd-modal"
        >
          <div className="card" style={{ width: 640, maxWidth: "92vw", padding: 16, overflow: "visible" }}>
            <div className="muted" style={{ textAlign: "center", marginBottom: 8 }}>
              Environment: {env || ""} App: {argoCdAppName || ""}
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <div style={{ fontWeight: 700 }}>ArgoCD Details</div>
              <button className="btn" type="button" onClick={closeArgoCd} data-testid="close-argocd-modal-btn">
                Close
              </button>
            </div>

            <div style={{ display: "grid", gap: 12 }}>
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
                  <div className="muted">argocd_admin_groups</div>
                  <div className="muted" style={{ fontSize: 12 }}>Groups which can perform admin actions on ArgoCD</div>
                </div>
                <input
                  className="filterInput"
                  value={argoCdAdminGroups}
                  onChange={(e) => setArgoCdAdminGroups(e.target.value)}
                  placeholder="grp1"
                  data-testid="argocd-input-admin-groups"
                />
              </div>

              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
                  <div className="muted">argocd_operator_groups</div>
                  <div className="muted" style={{ fontSize: 12 }}>Groups which can perform operator actions on ArgoCD</div>
                </div>
                <input
                  className="filterInput"
                  value={argoCdOperatorGroups}
                  onChange={(e) => setArgoCdOperatorGroups(e.target.value)}
                  placeholder="grp1"
                  data-testid="argocd-input-operator-groups"
                />
              </div>

              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
                  <div className="muted">argocd_readonly_groups</div>
                  <div className="muted" style={{ fontSize: 12 }}>Groups with readonly access to ArgoCD</div>
                </div>
                <input
                  className="filterInput"
                  value={argoCdReadonlyGroups}
                  onChange={(e) => setArgoCdReadonlyGroups(e.target.value)}
                  placeholder="grp1"
                  data-testid="argocd-input-readonly-groups"
                />
              </div>

              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
                  <div className="muted">argocd_sync_strategy</div>
                  <div className="muted" style={{ fontSize: 12 }}>
                    <a
                      href="https://argo-cd.readthedocs.io/en/latest/user-guide/auto_sync/"
                      target="_blank"
                      rel="noreferrer"
                    >
                      https://argo-cd.readthedocs.io/en/latest/user-guide/auto_sync/
                    </a>
                  </div>
                </div>
                <select
                  className="filterInput"
                  value={argoCdSyncStrategy}
                  onChange={(e) => setArgoCdSyncStrategy(e.target.value)}
                  data-testid="argocd-input-sync-strategy"
                >
                  <option value="auto">auto</option>
                  <option value="manual">manual</option>
                </select>
              </div>

              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
                  <div className="muted">gitrepourl</div>
                  <div className="muted" style={{ fontSize: 12 }}>
                    Git repository which contains application k8s manifests for each cluster and namespace. Example:{" "}
                    <a
                      href="https://github.com/praveensiddu/kselfservice-app1-argocd"
                      target="_blank"
                      rel="noreferrer"
                    >
                      https://github.com/praveensiddu/kselfservice-app1-argocd
                    </a>
                  </div>
                </div>
                <input
                  className="filterInput"
                  value={argoCdGitUrl}
                  onChange={(e) => setArgoCdGitUrl(e.target.value)}
                  placeholder="https://github.com/praveensiddu/kselfservice-app1-argocd"
                  data-testid="argocd-input-gitrepourl"
                />
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 14 }}>
              {argoCdExists ? (
                <button
                  className="btn"
                  type="button"
                  onClick={onDeleteArgoCd}
                  data-testid="delete-argocd-btn"
                >
                  Delete
                </button>
              ) : null}
              <button
                className="btn btn-primary"
                type="button"
                onClick={onSubmitArgoCd}
                disabled={!canSubmitArgoCd}
                data-testid="submit-argocd-btn"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {showEdit ? (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.45)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowEdit(false);
          }}
          data-testid="edit-app-modal"
        >
          <div className="card" style={{ width: 640, maxWidth: "92vw", padding: 16, overflow: "visible" }}>
            <div className="muted" style={{ textAlign: "center", marginBottom: 8 }}>
              Environment: {env || ""}
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <div style={{ fontWeight: 700 }}>Edit App</div>
              <button className="btn" type="button" onClick={() => setShowEdit(false)} data-testid="close-edit-app-modal-btn">
                Close
              </button>
            </div>

            <div style={{ display: "grid", gap: 12 }}>
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
                  <div className="muted">App Name</div>
                  <div className="muted" style={{ fontSize: 12 }}>Read-only</div>
                </div>
                <input className="filterInput" value={editAppName} disabled readOnly data-testid="edit-input-appname" />
              </div>

              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
                  <div className="muted">Description</div>
                  <div className="muted" style={{ fontSize: 12 }}>Short summary</div>
                </div>
                <input className="filterInput" value={editDescription} onChange={(e) => setEditDescription(e.target.value)} data-testid="edit-input-description" />
              </div>

              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
                  <div className="muted">Managed By</div>
                  <div className="muted" style={{ fontSize: 12 }}>Team or owner</div>
                </div>
                <input className="filterInput" value={editManagedBy} onChange={(e) => setEditManagedBy(e.target.value)} data-testid="edit-input-managedby" />
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 14 }}>
              <button
                className="btn btn-primary"
                type="button"
                onClick={onSubmitEdit}
                disabled={!canSubmitEdit}
                data-testid="submit-edit-app-btn"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <table data-testid="apps-table">
        <thead>
          <tr>
            <th>
              <input
                type="checkbox"
                checked={allSelected}
                onChange={(e) => onSelectAll(e.target.checked, filteredRows.map((a) => a.appname))}
                aria-label="Select all rows"
                data-testid="select-all-apps-checkbox"
              />
            </th>
            <th>App Name</th>
            <th>Description</th>
            <th>Managed By</th>
            <th>Clusters</th>
            <th>Namespaces</th>
            <th>ArgoCD</th>
            <th>L4 IPs</th>
            <th>Egress IPs</th>
            <th>Actions</th>
          </tr>
          <tr>
            <th></th>
            <th>
              <input
                className="filterInput"
                value={filters.appname}
                onChange={(e) => setFilters((p) => ({ ...p, appname: e.target.value }))}
                data-testid="filter-appname"
              />
            </th>
            <th>
              <input
                className="filterInput"
                value={filters.description}
                onChange={(e) => setFilters((p) => ({ ...p, description: e.target.value }))}
                data-testid="filter-description"
              />
            </th>
            <th>
              <input
                className="filterInput"
                value={filters.managedby}
                onChange={(e) => setFilters((p) => ({ ...p, managedby: e.target.value }))}
                data-testid="filter-managedby"
              />
            </th>
            <th>
              <input
                className="filterInput"
                value={filters.clusters}
                onChange={(e) => setFilters((p) => ({ ...p, clusters: e.target.value }))}
                data-testid="filter-clusters"
              />
            </th>
            <th>
              <input
                className="filterInput"
                value={filters.namespaces}
                onChange={(e) => setFilters((p) => ({ ...p, namespaces: e.target.value }))}
                data-testid="filter-namespaces"
              />
            </th>
            <th>
              <input
                className="filterInput"
                value={filters.argocd}
                onChange={(e) => setFilters((p) => ({ ...p, argocd: e.target.value }))}
                data-testid="filter-argocd"
              />
            </th>
            <th>
              <input
                className="filterInput"
                value={filters.l4ips}
                onChange={(e) => setFilters((p) => ({ ...p, l4ips: e.target.value }))}
                data-testid="filter-l4ips"
              />
            </th>
            <th>
              <input
                className="filterInput"
                value={filters.egressips}
                onChange={(e) => setFilters((p) => ({ ...p, egressips: e.target.value }))}
                data-testid="filter-egressips"
              />
            </th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {filteredRows.length === 0 ? (
            <tr>
              <td colSpan={10} className="muted" data-testid="no-apps-message">No apps found.</td>
            </tr>
          ) : (
            filteredRows.map((a) => (
              <tr key={a.appname} data-testid={`app-row-${a.appname}`}>
                <td>
                  <input
                    type="checkbox"
                    checked={selectedApps.has(a.appname)}
                    onChange={(e) => onToggleRow(a.appname, e.target.checked)}
                    aria-label={`Select ${a.appname}`}
                    data-testid={`app-checkbox-${a.appname}`}
                  />
                </td>
                <td>{a.appname}</td>
                <td className="muted">{a.description || ""}</td>
                <td>{a.managedby || ""}</td>
                <td>{(clustersByApp?.[a.appname] || []).join(", ")}</td>
                <td>{a.totalns ?? ""}</td>
                <td>{String(Boolean(a?.argocd))}</td>
                <td>{(l4IpsByApp?.[a.appname] || []).join(", ")}</td>
                <td>{(egressIpsByApp?.[a.appname] || []).join(", ")}</td>
                <td>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <button
                      className="iconBtn iconBtn-primary"
                      onClick={() => onViewDetails(a.appname)}
                      aria-label={`View details for ${a.appname}`}
                      title="View app details"
                      data-testid={`view-app-${a.appname}`}
                    >
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                        <path d="M16 8s-3-5.5-8-5.5S0 8 0 8s3 5.5 8 5.5S16 8 16 8zM1.173 8a13.133 13.133 0 0 1 1.66-2.043C4.12 4.668 5.88 3.5 8 3.5c2.12 0 3.879 1.168 5.168 2.457A13.133 13.133 0 0 1 14.828 8c-.058.087-.122.183-.195.288-.335.48-.83 1.12-1.465 1.755C11.879 11.332 10.119 12.5 8 12.5c-2.12 0-3.879-1.168-5.168-2.457A13.134 13.134 0 0 1 1.172 8z"/>
                        <path d="M8 5.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5zM4.5 8a3.5 3.5 0 1 1 7 0 3.5 3.5 0 0 1-7 0z"/>
                      </svg>
                    </button>
                    <button
                      className="iconBtn iconBtn-primary"
                      type="button"
                      onClick={() => openEditApp(a)}
                      aria-label={`Edit ${a.appname}`}
                      title="Edit application"
                      data-testid={`edit-app-${a.appname}`}
                    >
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                        <path d="M15.502 1.94a.5.5 0 0 1 0 .706l-1 1a.5.5 0 0 1-.707 0L12.5 2.354a.5.5 0 0 1 0-.707l1-1a.5.5 0 0 1 .707 0l1.295 1.293z"/>
                        <path d="M14.096 4.475 11.525 1.904a.5.5 0 0 0-.707 0L1 11.722V15.5a.5.5 0 0 0 .5.5h3.778l9.818-9.818a.5.5 0 0 0 0-.707zM2 12.207 10.818 3.389l1.793 1.793L3.793 14H2v-1.793z"/>
                      </svg>
                    </button>
                    <button
                      className="iconBtn iconBtn-primary"
                      type="button"
                      onClick={() => openArgoCd(a)}
                      aria-label={`ArgoCD details for ${a.appname}`}
                      title="Add ArgoCD details"
                      data-testid={`argocd-app-${a.appname}`}
                    >
                      <svg width="16" height="16" viewBox="0 0 64 64" aria-hidden="true">
                        <circle cx="32" cy="32" r="29" fill="#e8f6ff" stroke="#7cc7ff" strokeWidth="3" />
                        <circle cx="23" cy="20" r="4" fill="#ffffff" opacity="0.8" />
                        <g>
                          <path
                            d="M32 18c-9 0-16 6.3-16 14.1 0 5.4 3.2 9.1 7.2 11.4 2.8 1.6 6.3 2.5 8.8 2.5s6-.9 8.8-2.5c4-2.3 7.2-6 7.2-11.4C48 24.3 41 18 32 18z"
                            fill="#ff6a3d"
                          />
                          <path
                            d="M18 44c2.5 3.8 6.1 6.8 10.5 8.4 1 .4 2-.4 1.9-1.5-.2-1.8-1.1-3.2-2.1-4.7-.8-1.2-1.7-2.4-2.3-3.9"
                            fill="none"
                            stroke="#ff6a3d"
                            strokeWidth="3"
                            strokeLinecap="round"
                          />
                          <path
                            d="M26 46c.8 4.5 3.6 8.2 7.6 10.5 1 .6 2.3-.1 2.4-1.3.2-2.3-.2-4.2-.7-6.1-.4-1.5-.8-3.1-.8-5"
                            fill="none"
                            stroke="#ff6a3d"
                            strokeWidth="3"
                            strokeLinecap="round"
                          />
                          <path
                            d="M38 46c-.8 4.5-3.6 8.2-7.6 10.5-1 .6-2.3-.1-2.4-1.3-.2-2.3.2-4.2.7-6.1.4-1.5.8-3.1.8-5"
                            fill="none"
                            stroke="#ff6a3d"
                            strokeWidth="3"
                            strokeLinecap="round"
                          />
                          <path
                            d="M46 44c-2.5 3.8-6.1 6.8-10.5 8.4-1 .4-2-.4-1.9-1.5.2-1.8 1.1-3.2 2.1-4.7.8-1.2 1.7-2.4 2.3-3.9"
                            fill="none"
                            stroke="#ff6a3d"
                            strokeWidth="3"
                            strokeLinecap="round"
                          />

                          <circle cx="26" cy="31" r="5" fill="#ffffff" />
                          <circle cx="38" cy="31" r="5" fill="#ffffff" />
                          <circle cx="26.5" cy="31.5" r="2" fill="#1a1a1a" />
                          <circle cx="38.5" cy="31.5" r="2" fill="#1a1a1a" />
                          <path
                            d="M28 38c2 2.4 6 2.4 8 0"
                            fill="none"
                            stroke="#ffffff"
                            strokeWidth="3"
                            strokeLinecap="round"
                          />
                        </g>
                      </svg>
                    </button>
                    <button
                      className="iconBtn iconBtn-danger"
                      onClick={() => onDeleteApp(a.appname)}
                      aria-label={`Delete ${a.appname}`}
                      title="Delete application"
                      data-testid={`delete-app-${a.appname}`}
                    >
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                        <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z"/>
                        <path fillRule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"/>
                      </svg>
                    </button>
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
