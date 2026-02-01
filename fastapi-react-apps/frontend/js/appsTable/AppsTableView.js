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
  onUpdateApp,
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

  const [showEdit, setShowEdit] = React.useState(false);
  const [editAppName, setEditAppName] = React.useState("");
  const [editDescription, setEditDescription] = React.useState("");
  const [editManagedBy, setEditManagedBy] = React.useState("");
  const [editClusters, setEditClusters] = React.useState([]);

  const [editClusterQuery, setEditClusterQuery] = React.useState("");
  const [editClusterPickerOpen, setEditClusterPickerOpen] = React.useState(false);

  const selectedEditClustersSet = new Set((editClusters || []).map(normalizeCluster).filter(Boolean));
  const filteredEditClusterOptions = normalizedAvailableClusters
    .filter((c) => !selectedEditClustersSet.has(c))
    .filter((c) => c.toLowerCase().includes((editClusterQuery || "").toLowerCase()))
    .slice(0, 50);

  function addEditCluster(clusterName) {
    const c = normalizeCluster(clusterName);
    if (!c) return;
    if (selectedEditClustersSet.has(c)) return;
    setEditClusters((prev) => [...(Array.isArray(prev) ? prev : []), c]);
    setEditClusterQuery("");
    setEditClusterPickerOpen(true);
  }

  function removeEditCluster(clusterName) {
    const c = normalizeCluster(clusterName);
    setEditClusters((prev) => (Array.isArray(prev) ? prev : []).filter((x) => normalizeCluster(x) !== c));
  }

  function openEditApp(row) {
    const r = row || {};
    const name = String(r?.appname || "");
    const clusters = Array.isArray(clustersByApp?.[name]) ? clustersByApp[name].map(String) : Array.isArray(r?.clusters) ? r.clusters.map(String) : [];
    setEditAppName(name);
    setEditDescription(String(r?.description || ""));
    setEditManagedBy(String(r?.managedby || ""));
    setEditClusters(clusters.map(normalizeCluster).filter(Boolean));
    setEditClusterQuery("");
    setEditClusterPickerOpen(false);
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
        clusters: editClusters,
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
                  <div className="muted">Clusters</div>
                  <div className="muted" style={{ fontSize: 12 }}>Type to search, select many</div>
                </div>
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
                        zIndex: 10001,
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
                  <div className="muted">Clusters</div>
                  <div className="muted" style={{ fontSize: 12 }}>Type to search, select many</div>
                </div>
                <div
                  style={{ position: "relative" }}
                  onBlur={(e) => {
                    if (!e.currentTarget.contains(e.relatedTarget)) setEditClusterPickerOpen(false);
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
                    onMouseDown={() => setEditClusterPickerOpen(true)}
                  >
                    {(editClusters || []).map((c) => (
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
                          onClick={() => removeEditCluster(c)}
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
                      value={editClusterQuery}
                      onChange={(e) => {
                        setEditClusterQuery(e.target.value);
                        setEditClusterPickerOpen(true);
                      }}
                      onFocus={() => setEditClusterPickerOpen(true)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          const first = filteredEditClusterOptions[0];
                          if (first) addEditCluster(first);
                          return;
                        }
                        if (e.key === "Backspace" && !editClusterQuery && (editClusters || []).length > 0) {
                          const last = (editClusters || [])[(editClusters || []).length - 1];
                          removeEditCluster(last);
                        }
                        if (e.key === "Escape") {
                          setEditClusterPickerOpen(false);
                        }
                      }}
                      placeholder={(editClusters || []).length ? "" : "Type to search clusters..."}
                      data-testid="edit-input-clusters"
                    />
                  </div>

                  {editClusterPickerOpen ? (
                    <div
                      style={{
                        position: "absolute",
                        zIndex: 10001,
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
                      {filteredEditClusterOptions.length === 0 ? (
                        <div className="muted" style={{ padding: 10 }}>No matches</div>
                      ) : (
                        filteredEditClusterOptions.map((c) => (
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
                              addEditCluster(c);
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
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
                  <div className="muted">Managed By</div>
                  <div className="muted" style={{ fontSize: 12 }}>Team or owner</div>
                </div>
                <input className="filterInput" value={editManagedBy} onChange={(e) => setEditManagedBy(e.target.value)} data-testid="edit-input-managedby" />
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 14 }}>
              <button className="btn btn-primary" type="button" onClick={onSubmitEdit} data-testid="submit-edit-app-btn">
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
