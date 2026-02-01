function AppsTableView({
  filteredRows,
  allSelected,
  filters,
  setFilters,
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
  showCreate,
  onOpenCreate,
  onCloseCreate,
}) {
  const [newAppName, setNewAppName] = React.useState("");
  const [newDescription, setNewDescription] = React.useState("");
  const [newManagedBy, setNewManagedBy] = React.useState("");
  const [newClusters, setNewClusters] = React.useState([]);

  const [clusterQuery, setClusterQuery] = React.useState("");
  const [clusterPickerOpen, setClusterPickerOpen] = React.useState(false);

  function normalizeCluster(v) {
    return String(v || "").trim();
  }

  const normalizedAvailableClusters = (availableClusters || [])
    .map(normalizeCluster)
    .filter(Boolean);

  const selectedClustersSet = new Set((newClusters || []).map(normalizeCluster).filter(Boolean));

  const filteredClusterOptions = normalizedAvailableClusters
    .filter((c) => !selectedClustersSet.has(c))
    .filter((c) => c.toLowerCase().includes((clusterQuery || "").toLowerCase()))
    .slice(0, 50);

  function addCluster(clusterName) {
    const c = normalizeCluster(clusterName);
    if (!c) return;
    if (selectedClustersSet.has(c)) return;
    setNewClusters((prev) => [...(Array.isArray(prev) ? prev : []), c]);
    setClusterQuery("");
    setClusterPickerOpen(true);
  }

  function removeCluster(clusterName) {
    const c = normalizeCluster(clusterName);
    setNewClusters((prev) => (Array.isArray(prev) ? prev : []).filter((x) => normalizeCluster(x) !== c));
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
          <div className="card" style={{ width: 640, maxWidth: "92vw", padding: 16 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <div style={{ fontWeight: 700 }}>Create App</div>
              <button className="btn" type="button" onClick={onCloseCreate} data-testid="close-app-modal-btn">
                Close
              </button>
            </div>

            <div style={{ display: "grid", gap: 12 }}>
              <div>
                <div className="muted" style={{ marginBottom: 4 }}>App Name</div>
                <input className="filterInput" value={newAppName} onChange={(e) => setNewAppName(e.target.value)} data-testid="input-appname" />
              </div>

              <div>
                <div className="muted" style={{ marginBottom: 4 }}>Description</div>
                <input className="filterInput" value={newDescription} onChange={(e) => setNewDescription(e.target.value)} data-testid="input-description" />
              </div>

              <div>
                <div className="muted" style={{ marginBottom: 4 }}>Clusters</div>
                <div
                  style={{ position: "relative" }}
                  onBlur={(e) => {
                    if (!e.currentTarget.contains(e.relatedTarget)) setClusterPickerOpen(false);
                  }}
                >
                  <div
                    className="filterInput"
                    style={{
                      minHeight: 36,
                      height: "auto",
                      display: "flex",
                      flexWrap: "wrap",
                      gap: 6,
                      alignItems: "center",
                      padding: "6px 8px",
                    }}
                    onMouseDown={() => setClusterPickerOpen(true)}
                  >
                    {(newClusters || []).map((c) => (
                      <span
                        key={c}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                          padding: "2px 8px",
                          borderRadius: 999,
                          background: "rgba(0,0,0,0.06)",
                          fontSize: 12,
                        }}
                      >
                        <span>{c}</span>
                        <button
                          type="button"
                          className="btn"
                          style={{ padding: "0 6px", lineHeight: "16px" }}
                          onClick={() => removeCluster(c)}
                          aria-label={`Remove ${c}`}
                        >
                          ×
                        </button>
                      </span>
                    ))}
                    <input
                      className="filterInput"
                      style={{
                        border: "none",
                        outline: "none",
                        boxShadow: "none",
                        flex: 1,
                        minWidth: 160,
                        padding: 0,
                        margin: 0,
                        height: 22,
                      }}
                      value={clusterQuery}
                      onChange={(e) => {
                        setClusterQuery(e.target.value);
                        setClusterPickerOpen(true);
                      }}
                      onFocus={() => setClusterPickerOpen(true)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          const first = filteredClusterOptions[0];
                          if (first) addCluster(first);
                          return;
                        }
                        if (e.key === "Backspace" && !clusterQuery && (newClusters || []).length > 0) {
                          const last = (newClusters || [])[(newClusters || []).length - 1];
                          removeCluster(last);
                        }
                        if (e.key === "Escape") {
                          setClusterPickerOpen(false);
                        }
                      }}
                      placeholder={(newClusters || []).length ? "" : "Type to search clusters..."}
                      data-testid="input-clusters"
                    />
                  </div>

                  {clusterPickerOpen ? (
                    <div
                      style={{
                        position: "absolute",
                        zIndex: 5,
                        left: 0,
                        right: 0,
                        marginTop: 4,
                        background: "#fff",
                        border: "1px solid rgba(0,0,0,0.12)",
                        borderRadius: 8,
                        maxHeight: 220,
                        overflow: "auto",
                      }}
                      tabIndex={-1}
                    >
                      {filteredClusterOptions.length === 0 ? (
                        <div className="muted" style={{ padding: 10 }}>No matches</div>
                      ) : (
                        filteredClusterOptions.map((c) => (
                          <button
                            key={c}
                            type="button"
                            className="btn"
                            style={{
                              width: "100%",
                              textAlign: "left",
                              border: "none",
                              borderRadius: 0,
                              padding: "10px 10px",
                            }}
                            onMouseDown={(e) => {
                              e.preventDefault();
                              addCluster(c);
                            }}
                          >
                            {c}
                          </button>
                        ))
                      )}
                    </div>
                  ) : null}
                </div>
              </div>

              <div>
                <div className="muted" style={{ marginBottom: 4 }}>Managed By</div>
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
                      clusters: newClusters,
                    });
                    onCloseCreate();
                    setNewAppName("");
                    setNewDescription("");
                    setNewManagedBy("");
                    setNewClusters([]);
                  } catch (e) {
                    alert(e?.message || String(e));
                  }
                }}
                data-testid="submit-app-btn"
              >
                Create
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
              <td colSpan={9} className="muted" data-testid="no-apps-message">No apps found.</td>
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
