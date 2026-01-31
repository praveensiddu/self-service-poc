function ClustersTableView({
  envKeys,
  activeEnv,
  clustersByEnv,
  onEnvClick,
  onAddCluster,
  onDeleteCluster,
  loading,
  showCreate,
  onOpenCreate,
  onCloseCreate,
  filters,
  setFilters,
  filteredRows,
  selectedClusters,
  onToggleCluster,
  allSelected,
  onSelectAll,
}) {
  const [draft, setDraft] = React.useState({
    clustername: "",
    purpose: "",
    datacenter: "",
    applications: "",
  });

  const envKey = String(activeEnv || "").toUpperCase();

  async function onSubmitAdd() {
    try {
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
      onCloseCreate();
      setDraft({ clustername: "", purpose: "", datacenter: "", applications: "" });
    } catch (e) {
      alert(e?.message || String(e));
    }
  }

  return (
    <>
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
          data-testid="create-cluster-modal"
        >
          <div className="card" style={{ width: 640, maxWidth: "92vw", padding: 16 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <div style={{ fontWeight: 700 }}>Add Cluster ({envKey})</div>
              <button
                className="btn"
                type="button"
                onClick={onCloseCreate}
                data-testid="close-modal-btn"
              >
                Close
              </button>
            </div>

            <div style={{ display: "grid", gap: 12 }}>
              <div>
                <div className="muted" style={{ marginBottom: 4 }}>Clustername</div>
                <input
                  className="filterInput"
                  value={draft.clustername}
                  onChange={(e) => setDraft((p) => ({ ...p, clustername: e.target.value }))}
                  data-testid="input-clustername"
                />
              </div>
              <div>
                <div className="muted" style={{ marginBottom: 4 }}>Purpose</div>
                <input
                  className="filterInput"
                  value={draft.purpose}
                  onChange={(e) => setDraft((p) => ({ ...p, purpose: e.target.value }))}
                  data-testid="input-purpose"
                />
              </div>
              <div>
                <div className="muted" style={{ marginBottom: 4 }}>Datacenter</div>
                <input
                  className="filterInput"
                  value={draft.datacenter}
                  onChange={(e) => setDraft((p) => ({ ...p, datacenter: e.target.value }))}
                  data-testid="input-datacenter"
                />
              </div>
              <div>
                <div className="muted" style={{ marginBottom: 4 }}>Applications</div>
                <input
                  className="filterInput"
                  placeholder="comma-separated"
                  value={draft.applications}
                  onChange={(e) => setDraft((p) => ({ ...p, applications: e.target.value }))}
                  data-testid="input-applications"
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 14 }}>
                <button
                  className="btn"
                  type="button"
                  onClick={() => {
                    setDraft({ clustername: "", purpose: "", datacenter: "", applications: "" });
                  }}
                  data-testid="clear-form-btn"
                >
                  Clear
                </button>
                <button
                  className="btn btn-primary"
                  type="button"
                  onClick={onSubmitAdd}
                  disabled={loading}
                  data-testid="submit-cluster-btn"
                >
                  Create
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <div className="tabs">
        {envKeys.map((env) => (
          <button
            key={env}
            className={env === activeEnv ? "tab active" : "tab"}
            onClick={() => onEnvClick(env)}
            type="button"
            data-testid={`env-tab-${env}`}
          >
            {env}
          </button>
        ))}
      </div>

      <div className="actions" style={{ display: "flex", justifyContent: "flex-end", alignItems: "center" }}>
        <button
          className="btn btn-primary"
          type="button"
          onClick={onOpenCreate}
          disabled={loading}
          data-testid="add-cluster-btn"
        >
          Add Cluster
        </button>
      </div>

      <div className="card">
        <table data-testid="clusters-table">
          <thead>
            <tr>
              <th>
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={(e) => onSelectAll(e.target.checked)}
                  aria-label="Select all clusters"
                  data-testid="select-all-checkbox"
                />
              </th>
              <th>Clustername</th>
              <th>Purpose</th>
              <th>Datacenter</th>
              <th>Applications</th>
              <th>Actions</th>
            </tr>
            <tr>
              <th></th>
              <th>
                <input
                  className="filterInput"
                  value={filters.clustername}
                  onChange={(e) => setFilters((p) => ({ ...p, clustername: e.target.value }))}
                  data-testid="filter-clustername"
                />
              </th>
              <th>
                <input
                  className="filterInput"
                  value={filters.purpose}
                  onChange={(e) => setFilters((p) => ({ ...p, purpose: e.target.value }))}
                  data-testid="filter-purpose"
                />
              </th>
              <th>
                <input
                  className="filterInput"
                  value={filters.datacenter}
                  onChange={(e) => setFilters((p) => ({ ...p, datacenter: e.target.value }))}
                  data-testid="filter-datacenter"
                />
              </th>
              <th>
                <input
                  className="filterInput"
                  value={filters.applications}
                  onChange={(e) => setFilters((p) => ({ ...p, applications: e.target.value }))}
                  data-testid="filter-applications"
                />
              </th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {(filteredRows || []).map((r) => (
              <tr key={r?.clustername || JSON.stringify(r)} data-testid={`cluster-row-${r?.clustername}`}>
                <td>
                  <input
                    type="checkbox"
                    checked={selectedClusters?.has(r?.clustername)}
                    onChange={(e) => onToggleCluster(r?.clustername, e.target.checked)}
                    aria-label={`Select ${r?.clustername}`}
                    data-testid={`cluster-checkbox-${r?.clustername}`}
                  />
                </td>
                <td>{r?.clustername || ""}</td>
                <td>{r?.purpose || ""}</td>
                <td>{r?.datacenter || ""}</td>
                <td>{Array.isArray(r?.applications) ? r.applications.join(", ") : ""}</td>
                <td>
                  <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                    <button
                      className="iconBtn iconBtn-danger"
                      type="button"
                      onClick={() => onDeleteCluster(r?.clustername || "")}
                      disabled={loading || !(r?.clustername || "").trim()}
                      aria-label={`Delete ${r?.clustername}`}
                      title="Delete cluster"
                      data-testid={`delete-cluster-${r?.clustername}`}
                    >
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                        <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z"/>
                        <path fillRule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"/>
                      </svg>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {(filteredRows || []).length === 0 ? (
              <tr>
                <td colSpan={6} className="muted" data-testid="no-clusters-message">
                  No clusters found.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </>
  );
}
