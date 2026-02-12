function ClustersTableView({
  envKeys,
  activeEnv,
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
  readonly,
  hasManagePermission,
  apps,
}) {
  const [showAppConfirmModal, setShowAppConfirmModal] = React.useState(false);
  const [nonExistentApps, setNonExistentApps] = React.useState([]);
  const [pendingPayload, setPendingPayload] = React.useState(null);
  const [showEditModal, setShowEditModal] = React.useState(false);
  const [editClusterData, setEditClusterData] = React.useState(null);

  const envKey = String(activeEnv || "").toUpperCase();

  async function handleClusterSubmit(payload) {
    try {
      // Check if all applications exist
      const existingAppNames = Object.keys(apps || {});
      const missingApps = (payload.applications || []).filter(app => !existingAppNames.includes(app));

      if (missingApps.length > 0) {
        setNonExistentApps(missingApps);
        setPendingPayload(payload);
        setShowAppConfirmModal(true);
        return;
      }

      await onAddCluster(payload);
    } catch (e) {
      alert(e?.message || String(e));
    }
  }

  async function handleConfirmAppCreation() {
    setShowAppConfirmModal(false);
    setNonExistentApps([]);

    if (pendingPayload) {
      try {
        await onAddCluster(pendingPayload);
        setPendingPayload(null);
      } catch (e) {
        alert(e?.message || String(e));
      }
    }
  }

  function handleEditCluster(row) {
    setEditClusterData(row);
    setShowEditModal(true);
  }

  function handleCloseEditModal() {
    setShowEditModal(false);
    // Use setTimeout to prevent race conditions
    setTimeout(() => {
      setEditClusterData(null);
    }, 100);
  }


  return (
    <>
      <ClusterFormModal
        show={showCreate}
        onClose={onCloseCreate}
        onSubmit={handleClusterSubmit}
        mode="create"
        envKey={envKey}
        loading={loading}
      />

      <ClusterFormModal
        show={showEditModal}
        onClose={handleCloseEditModal}
        onSubmit={handleClusterSubmit}
        mode="edit"
        envKey={envKey}
        initialData={editClusterData}
        loading={loading}
      />

      <ConfirmationModal
        show={showAppConfirmModal}
        onClose={() => {
          setShowAppConfirmModal(false);
          setNonExistentApps([]);
          setPendingPayload(null);
        }}
        onConfirm={handleConfirmAppCreation}
        title={`Application${nonExistentApps.length > 1 ? 's' : ''} Not Found`}
        message={`The following application${nonExistentApps.length > 1 ? 's do' : ' does'} not exist:`}
        items={nonExistentApps}
        confirmText="Yes, Create and Continue"
      />

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
        {!readonly && hasManagePermission && (
          <button
            className="btn btn-primary"
            type="button"
            onClick={onOpenCreate}
            disabled={loading}
            data-testid="add-cluster-btn"
          >
            Add Cluster
          </button>
        )}
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
              <th>Cluster Name</th>
              <th>Purpose</th>
              <th>Datacenter</th>
              <th>Applications</th>
              <th>L4 Ingress IP Ranges</th>
              <th>Egress IP Ranges</th>
              {!readonly && <th>Actions</th>}
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
              <th>
                <input
                  className="filterInput"
                  value={filters.l4IngressIpRanges}
                  onChange={(e) => setFilters((p) => ({ ...p, l4IngressIpRanges: e.target.value }))}
                  data-testid="filter-l4-ingress-ip-ranges"
                />
              </th>
              <th>
                <input
                  className="filterInput"
                  value={filters.egressIpRanges}
                  onChange={(e) => setFilters((p) => ({ ...p, egressIpRanges: e.target.value }))}
                  data-testid="filter-egress-ip-ranges"
                />
              </th>
              {!readonly && <th></th>}
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
                  {Array.isArray(r?.l4_ingress_ip_ranges)
                    ? r.l4_ingress_ip_ranges
                      .map((x) => `${String(x?.start_ip || "").trim()}-${String(x?.end_ip || "").trim()}`)
                      .filter((s) => s !== "-")
                      .join(", ")
                    : ""}
                </td>
                <td>
                  {Array.isArray(r?.egress_ip_ranges)
                    ? r.egress_ip_ranges
                      .map((x) => `${String(x?.start_ip || "").trim()}-${String(x?.end_ip || "").trim()}`)
                      .filter((s) => s !== "-")
                      .join(", ")
                    : ""}
                </td>
                {!readonly && (
                  <td>
                    <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                      <>
                        <button
                          className="iconBtn iconBtn-primary"
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (hasManagePermission && !loading && (r?.clustername || "").trim()) {
                              handleEditCluster(r);
                            }
                          }}
                          disabled={!hasManagePermission || loading || !(r?.clustername || "").trim()}
                          aria-label={`Edit ${r?.clustername}`}
                          title={hasManagePermission ? "Edit cluster" : "No permission to edit"}
                          data-testid={`edit-cluster-${r?.clustername}`}
                          style={{
                            opacity: hasManagePermission ? 1 : 0.4,
                            cursor: hasManagePermission ? 'pointer' : 'not-allowed',
                            pointerEvents: hasManagePermission ? 'auto' : 'none'
                          }}
                        >
                          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                            <path d="M15.502 1.94a.5.5 0 0 1 0 .706l-1 1a.5.5 0 0 1-.707 0L12.5 2.354a.5.5 0 0 1 0-.707l1-1a.5.5 0 0 1 .707 0l1.295 1.293z"/>
                            <path d="M14.096 4.475 11.525 1.904a.5.5 0 0 0-.707 0L1 11.722V15.5a.5.5 0 0 0 .5.5h3.778l9.818-9.818a.5.5 0 0 0 0-.707zM2 12.207 10.818 3.389l1.793 1.793L3.793 14H2v-1.793z"/>
                          </svg>
                        </button>
                        <button
                          className="iconBtn iconBtn-danger"
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (hasManagePermission && !loading && (r?.clustername || "").trim()) {
                              onDeleteCluster(r?.clustername || "");
                            }
                          }}
                          disabled={!hasManagePermission || loading || !(r?.clustername || "").trim()}
                          aria-label={`Delete ${r?.clustername}`}
                          title={hasManagePermission ? "Delete cluster" : "No permission to delete"}
                          data-testid={`delete-cluster-${r?.clustername}`}
                          style={{
                            opacity: hasManagePermission ? 1 : 0.4,
                            cursor: hasManagePermission ? 'pointer' : 'not-allowed',
                            pointerEvents: hasManagePermission ? 'auto' : 'none'
                          }}
                        >
                          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                            <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z"/>
                            <path fillRule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"/>
                          </svg>
                        </button>
                      </>
                    </div>
                  </td>
                )}
              </tr>
            ))}
            {(filteredRows || []).length === 0 ? (
              <tr>
                <td colSpan={8} className="muted" data-testid="no-clusters-message">
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
