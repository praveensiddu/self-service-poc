function NamespacesTableView({
  keysLength,
  filteredRows,
  filters,
  setFilters,
  onViewDetails,
  onDeleteNamespace,
  requestsChanges,
  env,
  envKeys,
  appname,
  showCreate,
  onCloseCreate,
  readonly,
  canCreateNamespace,
  newNamespace,
  setNewNamespace,
  newClustersList,
  clusterQuery,
  setClusterQuery,
  clusterPickerOpen,
  setClusterPickerOpen,
  newManagedByArgo,
  setNewManagedByArgo,
  newEgressNameId,
  setNewEgressNameId,
  canEnableArgoForNewNamespace,
  filteredClusterOptions,
  addCluster,
  removeCluster,
  canSubmitCreate,
  handleCreateNamespace,
  showCopy,
  copyFromNamespace,
  copyToEnv,
  setCopyToEnv,
  copyToNamespace,
  setCopyToNamespace,
  copyBusy,
  copyError,
  canSubmitCopy,
  openCopyModal,
  closeCopyModal,
  handleCopyNamespace,
}) {

  return (
    <div>

      <div className="card">

      {showCopy ? (
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
            if (e.target === e.currentTarget) closeCopyModal();
          }}
          data-testid="copy-namespace-modal"
        >
          <div className="card" style={{ width: 640, maxWidth: "92vw", padding: 16 }}>
            <div style={{ textAlign: "center", marginBottom: 12 }}>
              <h2 style={{ margin: 0, fontSize: "28px", fontWeight: "600", color: "#0d6efd" }}>
                {appname}
              </h2>
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <div style={{ fontWeight: 700 }}>
                Copy Namespace {String(copyFromNamespace || "").trim() ? `(${String(copyFromNamespace || "").trim()})` : ""}
              </div>
              <button className="btn" type="button" onClick={closeCopyModal} disabled={copyBusy} data-testid="close-copy-namespace-modal-btn">
                Close
              </button>
            </div>

            <div style={{ display: "grid", gap: 12 }}>
              <div>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <span className="pill">{String(env || "").trim() || "-"}</span>
                  <span className="pill">{String(copyFromNamespace || "").trim() || "-"}</span>
                </div>
              </div>

              <div>
                <div className="muted" style={{ marginBottom: 4 }}>Target Environment</div>
                <select
                  className="filterInput"
                  value={copyToEnv}
                  onChange={(e) => setCopyToEnv(e.target.value)}
                  disabled={copyBusy}
                  data-testid="copy-namespace-to-env"
                >
                  <option value="" disabled>
                    Select environment
                  </option>
                  {(Array.isArray(envKeys) ? envKeys : []).map((k) => (
                    <option key={k} value={k}>{k}</option>
                  ))}
                </select>
              </div>

              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
                  <div className="muted">New Namespace Name</div>
                  <div className="muted" style={{ fontSize: 12 }}>Destination folder name</div>
                </div>
                <input
                  className="filterInput"
                  value={copyToNamespace}
                  onChange={(e) => setCopyToNamespace(e.target.value)}
                  placeholder="e.g., app1-dev-ns2"
                  disabled={copyBusy}
                  data-testid="copy-namespace-to-namespace"
                />
              </div>

              {copyError ? (
                <div style={{ color: "#b00020" }} data-testid="copy-namespace-error">
                  {copyError}
                </div>
              ) : null}

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 4 }}>
                <button
                  className="btn"
                  type="button"
                  onClick={closeCopyModal}
                  disabled={copyBusy}
                >
                  Cancel
                </button>
                <button
                  className="btn btn-primary"
                  type="button"
                  disabled={!canSubmitCopy}
                  onClick={handleCopyNamespace}
                  data-testid="copy-namespace-submit"
                >
                  {copyBusy ? "Copying..." : "Copy"}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

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
          data-testid="create-namespace-modal"
        >
          <div className="card" style={{ width: 640, maxWidth: "92vw", padding: 16 }}>
            <div style={{ textAlign: 'center', marginBottom: 12 }}>
              <h2 style={{ margin: 0, fontSize: '28px', fontWeight: '600', color: '#0d6efd' }}>
                {appname}
              </h2>
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <div style={{ fontWeight: 700 }}>Create Namespace</div>
              <button className="btn" type="button" onClick={onCloseCreate} data-testid="close-namespace-modal-btn">
                Close
              </button>
            </div>

            <div style={{ display: "grid", gap: 12 }}>
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
                  <div className="muted">Namespace Name</div>
                  <div className="muted" style={{ fontSize: 12 }}>K8s namespace identifier</div>
                </div>
                <input
                  className="filterInput"
                  value={newNamespace}
                  onChange={(e) => setNewNamespace(e.target.value)}
                  placeholder="e.g., app1-dev-ns1"
                  data-testid="input-namespace"
                />
              </div>

              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
                  <div className="muted">Clusters</div>
                  <div className="muted" style={{ fontSize: 12 }}>List all clusters where you need this namespace</div>
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
                    data-testid="input-namespace-clusters"
                  >
                    {(newClustersList || []).map((c) => (
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
                        if (e.key === "Backspace" && !clusterQuery && (newClustersList || []).length > 0) {
                          const last = (newClustersList || [])[(newClustersList || []).length - 1];
                          removeCluster(last);
                        }
                        if (e.key === "Escape") {
                          setClusterPickerOpen(false);
                        }
                      }}
                      placeholder={(newClustersList || []).length ? "" : "Type to search clusters..."}
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
                  <div className="muted">Managed by Argo</div>
                  <div className="muted" style={{ fontSize: 12 }}>If yes, then all setup required to manaage this ns using argo will be created.</div>
                </div>
                <select
                  className="filterInput"
                  value={newManagedByArgo ? "Yes" : "No"}
                  onChange={(e) => setNewManagedByArgo(e.target.value === "Yes")}
                  disabled={!canEnableArgoForNewNamespace}
                  data-testid="input-managed-by-argo"
                >
                  <option value="No">No</option>
                  <option value="Yes">Yes</option>
                </select>
              </div>

              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
                  <div className="muted" style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
                    <span>Egress Name ID</span>
                    <HelpIconButton docPath="/static/help/namespacesTable/egressNameId.html" title="Egress Name ID" />
                  </div>
                  <div className="muted" style={{ fontSize: 12 }}>If set then all outbound traffic will be routed through this egress IP.</div>
                </div>
                <input
                  className="filterInput"
                  value={newEgressNameId}
                  onChange={(e) => setNewEgressNameId(e.target.value)}
                  placeholder="Optional"
                  data-testid="input-egress-nameid"
                />
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 14 }}>
              {!canCreateNamespace && (
                <div style={{ fontSize: 12, color: '#dc3545', marginRight: 8, alignSelf: 'center' }}>
                  You don't have permission to create namespaces
                </div>
              )}
              <button
                className="btn btn-primary"
                type="button"
                onClick={handleCreateNamespace}
                disabled={!canSubmitCreate || !canCreateNamespace}
                title={!canCreateNamespace ? "No permission to create namespaces" : "Create namespace"}
                data-testid="submit-namespace-btn"
                style={{
                  opacity: (!canSubmitCreate || !canCreateNamespace) ? 0.6 : 1,
                  cursor: (!canSubmitCreate || !canCreateNamespace) ? 'not-allowed' : 'pointer'
                }}
              >
                Create
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <table data-testid="namespaces-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>
              <span style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
                <span>Clusters</span>
                <HelpIconButton docPath="/static/help/namespacesTable/clusters.html" title="Clusters" />
              </span>
            </th>
            <th>
              <span style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
                <span>Egress Name ID</span>
                <HelpIconButton docPath="/static/help/namespacesTable/egressNameId.html" title="Egress Name ID" />
              </span>
            </th>
            <th>
              <span style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
                <span>Egress Firewall</span>
                <HelpIconButton docPath="/static/help/namespacesTable/egressFirewall.html" title="Egress Firewall" />
              </span>
            </th>
            <th>
              <span style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
                <span>Managed by ArgoCD</span>
                <HelpIconButton docPath="/static/help/namespacesTable/managedByArgoCd.html" title="Managed by ArgoCD" />
              </span>
            </th>
            {!readonly && <th>Actions</th>}
          </tr>
          <tr>
            <th>
              <input
                className="filterInput"
                value={filters.name}
                onChange={(e) => setFilters((p) => ({ ...p, name: e.target.value }))}
                data-testid="filter-namespace-name"
              />
            </th>
            <th>
              <input
                className="filterInput"
                value={filters.clusters}
                onChange={(e) => setFilters((p) => ({ ...p, clusters: e.target.value }))}
                data-testid="filter-namespace-clusters"
              />
            </th>
            <th>
              <input
                className="filterInput"
                value={filters.egressNameId}
                onChange={(e) => setFilters((p) => ({ ...p, egressNameId: e.target.value }))}
                data-testid="filter-egress-nameid"
              />
            </th>
            <th>
              <input
                className="filterInput"
                value={filters.egressFirewall}
                onChange={(e) => setFilters((p) => ({ ...p, egressFirewall: e.target.value }))}
                data-testid="filter-egress-firewall"
              />
            </th>
            <th>
              <input
                className="filterInput"
                value={filters.managedByArgo}
                onChange={(e) => setFilters((p) => ({ ...p, managedByArgo: e.target.value }))}
                data-testid="filter-managed-by-argo"
              />
            </th>
            {!readonly && <th></th>}
          </tr>
        </thead>
        <tbody>
          {keysLength === 0 ? (
            <tr>
              <td colSpan={6} className="muted" data-testid="no-namespaces-message">No namespaces found.</td>
            </tr>
          ) : filteredRows.length === 0 ? (
            <tr>
              <td colSpan={6} className="muted" data-testid="no-matches-message">No matches.</td>
            </tr>
          ) : (
            filteredRows.map((r) => {
              const hasViewPermission = r.permissions?.canView ?? true;
              const hasManagePermission = r.permissions?.canManage ?? true;
              const cellOpacity = hasViewPermission ? 1 : 0.4;
              const isClickable = hasViewPermission;

              return (
              <tr
                key={r.name}
                data-testid={`namespace-row-${r.name}`}
                className={isClickable ? "clickable-row" : ""}
                onClick={(e) => {
                  // Don't trigger row click if clicking on action buttons
                  if (e.target.closest('button')) {
                    return;
                  }
                  if (isClickable) {
                    onViewDetails(r.name, r.namespace);
                  }
                }}
                style={{ cursor: isClickable ? 'pointer' : 'default' }}
              >
                <td
                  style={{
                    opacity: cellOpacity,
                    ...(requestsChanges?.namespaces?.has
                      ? (requestsChanges.namespaces.has(`${String(env || "").toLowerCase()}/${String(appname || "")}/${String(r.name || "")}`)
                        ? { background: "#fff3cd" }
                        : undefined)
                      : undefined)
                  }}
                >
                  {r.name}
                </td>
                <td style={{ opacity: cellOpacity }}>{r.clustersText}</td>
                <td style={{ opacity: cellOpacity }}>{r.egressNameIdText}</td>
                <td style={{ opacity: cellOpacity }}>{r.egressFirewallText}</td>
                <td style={{ opacity: cellOpacity }}>{r.managedByArgo ? "True" : "False"}</td>
                {!readonly && (
                  <td onClick={(e) => e.stopPropagation()}>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <button
                        className="iconBtn"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (hasManagePermission) {
                            openCopyModal(r.name);
                          }
                        }}
                        aria-label={`Copy ${r.name}`}
                        title={hasManagePermission ? "Copy namespace" : "No permission to copy"}
                        data-testid={`copy-namespace-${r.name}`}
                        disabled={!hasManagePermission}
                        style={{
                          opacity: hasManagePermission ? 1 : 0.4,
                          cursor: hasManagePermission ? 'pointer' : 'not-allowed',
                          pointerEvents: hasManagePermission ? 'auto' : 'none'
                        }}
                      >
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                          <path d="M10 1H2a1 1 0 0 0-1 1v9h1V2h8V1z" />
                          <path d="M14 4H5a1 1 0 0 0-1 1v9a1 1 0 0 0 1 1h9a1 1 0 0 0 1-1V5a1 1 0 0 0-1-1zm0 10H5V5h9v9z" />
                        </svg>
                      </button>
                      <button
                        className="iconBtn iconBtn-danger"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (hasManagePermission) {
                            onDeleteNamespace(r.name);
                          }
                        }}
                        aria-label={`Delete ${r.name}`}
                        title={hasManagePermission ? "Delete namespace" : "No permission to delete"}
                        data-testid={`delete-namespace-${r.name}`}
                        disabled={!hasManagePermission}
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
                    </div>
                  </td>
                )}
              </tr>
            );
            })
          )}
        </tbody>
      </table>
      </div>
    </div>
  );
}
