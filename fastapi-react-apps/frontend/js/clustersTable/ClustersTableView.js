function ClustersTableView({
  envKeys,
  activeEnv,
  clustersByEnv,
  onEnvClick,
  onAddCluster,
  onDeleteCluster,
  loading,
}) {
  const [showAddPanel, setShowAddPanel] = React.useState(false);
  const [draft, setDraft] = React.useState({
    clustername: "",
    purpose: "",
    datacenter: "",
    applications: "",
  });

  const envKey = String(activeEnv || "").toUpperCase();
  const rows = (clustersByEnv || {})[envKey] || [];

  function onOpenAdd() {
    setDraft({ clustername: "", purpose: "", datacenter: "", applications: "" });
    setShowAddPanel(true);
  }

  function onCancelAdd() {
    setShowAddPanel(false);
  }

  async function onSubmitAdd() {
    const applications = String(draft.applications || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    await onAddCluster({
      clustername: String(draft.clustername || ""),
      purpose: String(draft.purpose || ""),
      datacenter: String(draft.datacenter || ""),
      applications,
    });
    setShowAddPanel(false);
  }

  return (
    <>
      <div className="tabs">
        {envKeys.map((env) => (
          <button
            key={env}
            className={env === activeEnv ? "tab active" : "tab"}
            onClick={() => onEnvClick(env)}
            type="button"
          >
            {env}
          </button>
        ))}
      </div>

      <div className="actions">
        <button className="btn" type="button" onClick={onOpenAdd} disabled={loading}>
          Add Cluster
        </button>
      </div>

      {showAddPanel ? (
        <div className="card" style={{ padding: 16 }}>
          <div style={{ fontWeight: 700, marginBottom: 8 }}>Add Cluster ({envKey})</div>
          <div style={{ display: "grid", gap: 12, maxWidth: 720 }}>
            <div>
              <div className="muted" style={{ fontWeight: 700, marginBottom: 4 }}>Clustername</div>
              <input
                className="filterInput"
                value={draft.clustername}
                onChange={(e) => setDraft((p) => ({ ...p, clustername: e.target.value }))}
              />
            </div>
            <div>
              <div className="muted" style={{ fontWeight: 700, marginBottom: 4 }}>purpose</div>
              <input
                className="filterInput"
                value={draft.purpose}
                onChange={(e) => setDraft((p) => ({ ...p, purpose: e.target.value }))}
              />
            </div>
            <div>
              <div className="muted" style={{ fontWeight: 700, marginBottom: 4 }}>datacenter</div>
              <input
                className="filterInput"
                value={draft.datacenter}
                onChange={(e) => setDraft((p) => ({ ...p, datacenter: e.target.value }))}
              />
            </div>
            <div>
              <div className="muted" style={{ fontWeight: 700, marginBottom: 4 }}>applications</div>
              <input
                className="filterInput"
                placeholder="comma-separated"
                value={draft.applications}
                onChange={(e) => setDraft((p) => ({ ...p, applications: e.target.value }))}
              />
            </div>

            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <button className="btn btn-primary" type="button" onClick={onSubmitAdd} disabled={loading}>
                Save
              </button>
              <button className="btn" type="button" onClick={onCancelAdd} disabled={loading}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <div style={{ display: "grid", gap: 12, marginTop: 12 }}>
        <div key={envKey || "clusters"} className="card" style={{ padding: 16 }}>
          <div style={{ fontWeight: 700, marginBottom: 8 }}>{envKey}</div>
          <table>
            <thead>
              <tr>
                <th>Clustername</th>
                <th>purpose</th>
                <th>datacenter</th>
                <th>applications</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {(rows || []).map((r) => (
                <tr key={r?.clustername || JSON.stringify(r)}>
                  <td>{r?.clustername || ""}</td>
                  <td>{r?.purpose || ""}</td>
                  <td>{r?.datacenter || ""}</td>
                  <td>{Array.isArray(r?.applications) ? r.applications.join(", ") : ""}</td>
                  <td>
                    <button
                      className="btn"
                      type="button"
                      onClick={() => onDeleteCluster(r?.clustername || "")}
                      disabled={loading || !(r?.clustername || "").trim()}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
              {(rows || []).length === 0 ? (
                <tr>
                  <td colSpan={5} className="muted">
                    No clusters found.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
