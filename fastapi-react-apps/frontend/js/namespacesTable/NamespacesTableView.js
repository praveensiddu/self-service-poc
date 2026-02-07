function NamespacesTableView({
  keysLength,
  filteredRows,
  allSelected,
  filters,
  setFilters,
  onSelectAll,
  onToggleNamespace,
  selectedNamespaces,
  onViewDetails,
  onDeleteNamespace,
  onCopyNamespace,
  onCreateNamespace,
  argocdEnabled,
  requestsChanges,
  env,
  envKeys,
  appname,
  showCreate,
  onOpenCreate,
  onCloseCreate,
  readonly,
}) {
  const [newNamespace, setNewNamespace] = React.useState("");
  const [newClustersList, setNewClustersList] = React.useState([]);
  const [clusterOptions, setClusterOptions] = React.useState([]);
  const [clusterQuery, setClusterQuery] = React.useState("");
  const [clusterPickerOpen, setClusterPickerOpen] = React.useState(false);
  const [newManagedByArgo, setNewManagedByArgo] = React.useState(false);
  const [newEgressNameId, setNewEgressNameId] = React.useState("");

  const [showCopy, setShowCopy] = React.useState(false);
  const [copyFromNamespace, setCopyFromNamespace] = React.useState("");
  const [copyToEnv, setCopyToEnv] = React.useState("");
  const [copyToNamespace, setCopyToNamespace] = React.useState("");
  const [copyBusy, setCopyBusy] = React.useState(false);
  const [copyError, setCopyError] = React.useState("");

  const canEnableArgoForNewNamespace = Boolean(argocdEnabled);

  React.useEffect(() => {
    if (!showCreate) return;
    if (!canEnableArgoForNewNamespace) setNewManagedByArgo(false);
  }, [showCreate, canEnableArgoForNewNamespace]);

  React.useEffect(() => {
    let cancelled = false;
    if (!showCreate) return;

    const envKey = String(env || "").trim();
    const appKey = String(appname || "").trim();
    if (!envKey || !appKey) {
      setClusterOptions([]);
      return;
    }

    (async () => {
      try {
        const resp = await fetch(
          `/api/clusters?env=${encodeURIComponent(envKey)}&app=${encodeURIComponent(appKey)}`,
        );
        if (!resp.ok) throw new Error("Failed to load clusters");
        const data = await resp.json();
        if (cancelled) return;
        setClusterOptions(Array.isArray(data) ? data.map(String) : []);
      } catch {
        if (!cancelled) setClusterOptions([]);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [showCreate, env, appname]);

  const filteredClusterOptions = (clusterOptions || [])
    .filter((c) => !(newClustersList || []).includes(c))
    .filter((c) => (c || "").toLowerCase().includes((clusterQuery || "").toLowerCase()));

  function addCluster(c) {
    const v = String(c || "").trim();
    if (!v) return;
    setNewClustersList((prev) => {
      const next = Array.isArray(prev) ? prev.slice() : [];
      if (!next.includes(v)) next.push(v);
      return next;
    });
    setClusterQuery("");
    setClusterPickerOpen(false);
  }

  function removeCluster(c) {
    const v = String(c || "").trim();
    setNewClustersList((prev) => (Array.isArray(prev) ? prev.filter((x) => x !== v) : []));
  }

  const canSubmitCreate = Boolean(
    (newNamespace || "").trim() && Array.isArray(newClustersList) && newClustersList.length > 0,
  );

  const canSubmitCopy = Boolean(
    !copyBusy &&
      (copyFromNamespace || "").trim() &&
      (copyToEnv || "").trim() &&
      (copyToNamespace || "").trim() &&
      !(String(copyToEnv || "").trim() === String(env || "").trim() &&
        String(copyToNamespace || "").trim() === String(copyFromNamespace || "").trim()),
  );

  function openCopyModal(fromNamespace) {
    setCopyError("");
    setCopyFromNamespace(String(fromNamespace || "").trim());
    const initialToEnv = String(env || "").trim() || (Array.isArray(envKeys) ? String(envKeys[0] || "").trim() : "");
    setCopyToEnv(initialToEnv);
    setCopyToNamespace("");
    setShowCopy(true);
  }

  function closeCopyModal() {
    if (copyBusy) return;
    setShowCopy(false);
  }

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
                  onClick={async () => {
                    try {
                      setCopyBusy(true);
                      setCopyError("");
                      await onCopyNamespace(copyFromNamespace, {
                        from_env: String(env || "").trim(),
                        to_env: String(copyToEnv || "").trim(),
                        to_namespace: String(copyToNamespace || "").trim(),
                      });
                      setShowCopy(false);
                    } catch (e) {
                      setCopyError(e?.message || String(e));
                    } finally {
                      setCopyBusy(false);
                    }
                  }}
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
                  <div className="muted">Egress Name ID</div>
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
              <button
                className="btn btn-primary"
                type="button"
                onClick={async () => {
                  try {
                    if (typeof onCreateNamespace !== "function") return;
                    await onCreateNamespace({
                      namespace: newNamespace,
                      clusters: newClustersList,
                      need_argo: canEnableArgoForNewNamespace ? newManagedByArgo : false,
                      egress_nameid: newEgressNameId,
                    });
                    onCloseCreate();
                    setNewNamespace("");
                    setNewClustersList([]);
                    setClusterQuery("");
                    setClusterPickerOpen(false);
                    setNewManagedByArgo(false);
                    setNewEgressNameId("");
                  } catch (e) {
                    alert(e?.message || String(e));
                  }
                }}
                disabled={!canSubmitCreate}
                data-testid="submit-namespace-btn"
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
            <th>
              <input
                type="checkbox"
                checked={allSelected}
                onChange={(e) => {
                  const names = filteredRows.map((r) => r.name);
                  onSelectAll(e.target.checked, names);
                }}
                aria-label="Select all namespaces"
                data-testid="select-all-namespaces-checkbox"
              />
            </th>
            <th>Name</th>
            <th>Clusters</th>
            <th>EgressIP</th>
            <th>Egress Firewall</th>
            <th>Managed by ArgoCD</th>
            <th>Attributes</th>
            <th>Actions</th>
          </tr>
          <tr>
            <th></th>
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
                value={filters.egressIp}
                onChange={(e) => setFilters((p) => ({ ...p, egressIp: e.target.value }))}
                data-testid="filter-egress-ip"
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
            <th>
              <input
                className="filterInput"
                value={filters.attributes}
                onChange={(e) => setFilters((p) => ({ ...p, attributes: e.target.value }))}
                data-testid="filter-attributes"
              />
            </th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {keysLength === 0 ? (
            <tr>
              <td colSpan={8} className="muted" data-testid="no-namespaces-message">No namespaces found.</td>
            </tr>
          ) : filteredRows.length === 0 ? (
            <tr>
              <td colSpan={8} className="muted" data-testid="no-matches-message">No matches.</td>
            </tr>
          ) : (
            filteredRows.map((r) => (
              <tr key={r.name} data-testid={`namespace-row-${r.name}`}>
                <td>
                  <input
                    type="checkbox"
                    checked={selectedNamespaces?.has(r.name) || false}
                    onChange={(e) => onToggleNamespace(r.name, e.target.checked)}
                    aria-label={`Select ${r.name}`}
                    data-testid={`namespace-checkbox-${r.name}`}
                  />
                </td>
                <td
                  style={
                    requestsChanges?.namespaces?.has
                      ? (requestsChanges.namespaces.has(`${String(env || "").toLowerCase()}/${String(appname || "")}/${String(r.name || "")}`)
                        ? { background: "#fff3cd" }
                        : undefined)
                      : undefined
                  }
                >
                  {r.name}
                </td>
                <td>{r.clustersText}</td>
                <td>{r.egressIpText}</td>
                <td>{r.egressFirewallText}</td>
                <td>{r.managedByArgo ? "True" : "False"}</td>
                <td>
                  <div className="attrGrid">
                    <div className="attrRow">
                      <div className="attrCell">
                        <div className="attrTitle">ResourceQuota</div>
                        <div className="attrValue">{r.resourceQuotaText}</div>
                      </div>
                      <div className="attrCell">
                        <div className="attrTitle">LimitRange</div>
                        <div className="attrValue">{r.limitRangeText}</div>
                      </div>
                    </div>
                    <div className="attrRow">
                      <div className="attrCell">
                        <div className="attrTitle">RoleBinding</div>
                        <div className="attrValue">{r.rolebindingsText}</div>
                      </div>
                    </div>
                  </div>
                </td>
                <td>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <button
                      className="iconBtn iconBtn-primary"
                      onClick={() => onViewDetails(r.name, r.namespace)}
                      aria-label={`View details for ${r.name}`}
                      title="View namespace details"
                      data-testid={`view-namespace-${r.name}`}
                    >
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                        <path d="M16 8s-3-5.5-8-5.5S0 8 0 8s3 5.5 8 5.5S16 8 16 8zM1.173 8a13.133 13.133 0 0 1 1.66-2.043C4.12 4.668 5.88 3.5 8 3.5c2.12 0 3.879 1.168 5.168 2.457A13.133 13.133 0 0 1 14.828 8c-.058.087-.122.183-.195.288-.335.48-.83 1.12-1.465 1.755C11.879 11.332 10.119 12.5 8 12.5c-2.12 0-3.879-1.168-5.168-2.457A13.134 13.134 0 0 1 1.172 8z"/>
                        <path d="M8 5.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5zM4.5 8a3.5 3.5 0 1 1 7 0 3.5 3.5 0 0 1-7 0z"/>
                      </svg>
                    </button>
                    {!readonly && (
                      <button
                        className="iconBtn"
                        onClick={() => openCopyModal(r.name)}
                        aria-label={`Copy ${r.name}`}
                        title="Copy namespace"
                        data-testid={`copy-namespace-${r.name}`}
                      >
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                          <path d="M10 1H2a1 1 0 0 0-1 1v9h1V2h8V1z" />
                          <path d="M14 4H5a1 1 0 0 0-1 1v9a1 1 0 0 0 1 1h9a1 1 0 0 0 1-1V5a1 1 0 0 0-1-1zm0 10H5V5h9v9z" />
                        </svg>
                      </button>
                    )}
                    {!readonly && (
                      <button
                        className="iconBtn iconBtn-danger"
                        onClick={() => onDeleteNamespace(r.name)}
                        aria-label={`Delete ${r.name}`}
                        title="Delete namespace"
                        data-testid={`delete-namespace-${r.name}`}
                      >
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                          <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z"/>
                          <path fillRule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"/>
                        </svg>
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
      </div>
    </div>
  );
}
