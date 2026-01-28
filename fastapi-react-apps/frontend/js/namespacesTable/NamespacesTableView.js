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
  onCreateNamespace,
}) {
  const [showCreate, setShowCreate] = React.useState(false);
  const [newNamespace, setNewNamespace] = React.useState("");
  const [newClusters, setNewClusters] = React.useState("");
  const [newManagedByArgo, setNewManagedByArgo] = React.useState(false);
  const [newEgressNameId, setNewEgressNameId] = React.useState("");

  return (
    <div className="card">
      <div style={{ display: "flex", justifyContent: "flex-end", padding: "12px 12px 12px 12px" }}>
        <button className="btn btn-primary" type="button" onClick={() => setShowCreate(true)}>
          Add Namespace
        </button>
      </div>

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
            if (e.target === e.currentTarget) setShowCreate(false);
          }}
        >
          <div className="card" style={{ width: 640, maxWidth: "92vw", padding: 16 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <div style={{ fontWeight: 700 }}>Create Namespace</div>
              <button className="btn" type="button" onClick={() => setShowCreate(false)}>
                Close
              </button>
            </div>

            <div style={{ display: "grid", gap: 12 }}>
              <div>
                <div className="muted" style={{ marginBottom: 4 }}>Namespace Name</div>
                <input
                  className="filterInput"
                  value={newNamespace}
                  onChange={(e) => setNewNamespace(e.target.value)}
                  placeholder="e.g., app1-dev-ns1"
                />
              </div>

              <div>
                <div className="muted" style={{ marginBottom: 4 }}>Clusters</div>
                <input
                  className="filterInput"
                  placeholder="01,02,03"
                  value={newClusters}
                  onChange={(e) => setNewClusters(e.target.value)}
                />
              </div>

              <div>
                <div className="muted" style={{ marginBottom: 4 }}>Managed by Argo</div>
                <select
                  className="filterInput"
                  value={newManagedByArgo ? "Yes" : "No"}
                  onChange={(e) => setNewManagedByArgo(e.target.value === "Yes")}
                >
                  <option value="No">No</option>
                  <option value="Yes">Yes</option>
                </select>
              </div>

              <div>
                <div className="muted" style={{ marginBottom: 4 }}>Egress Name ID</div>
                <input
                  className="filterInput"
                  value={newEgressNameId}
                  onChange={(e) => setNewEgressNameId(e.target.value)}
                  placeholder="Optional"
                />
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 14 }}>
              <button
                className="btn"
                type="button"
                onClick={() => {
                  setNewNamespace("");
                  setNewClusters("");
                  setNewManagedByArgo(false);
                  setNewEgressNameId("");
                }}
              >
                Clear
              </button>
              <button
                className="btn btn-primary"
                type="button"
                onClick={async () => {
                  try {
                    if (typeof onCreateNamespace !== "function") return;
                    await onCreateNamespace({
                      namespace: newNamespace,
                      clusters: newClusters,
                      need_argo: newManagedByArgo,
                      egress_nameid: newEgressNameId,
                    });
                    setShowCreate(false);
                    setNewNamespace("");
                    setNewClusters("");
                    setNewManagedByArgo(false);
                    setNewEgressNameId("");
                  } catch (e) {
                    alert(e?.message || String(e));
                  }
                }}
              >
                Create
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <table>
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
              />
            </th>
            <th>Name</th>
            <th>Clusters</th>
            <th>EgressIP</th>
            <th>Egress Firewall</th>
            <th>Managed by App Argo</th>
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
              />
            </th>
            <th>
              <input
                className="filterInput"
                value={filters.clusters}
                onChange={(e) => setFilters((p) => ({ ...p, clusters: e.target.value }))}
              />
            </th>
            <th>
              <input
                className="filterInput"
                value={filters.egressIp}
                onChange={(e) => setFilters((p) => ({ ...p, egressIp: e.target.value }))}
              />
            </th>
            <th>
              <input
                className="filterInput"
                value={filters.egressFirewall}
                onChange={(e) => setFilters((p) => ({ ...p, egressFirewall: e.target.value }))}
              />
            </th>
            <th>
              <input
                className="filterInput"
                value={filters.managedByArgo}
                onChange={(e) => setFilters((p) => ({ ...p, managedByArgo: e.target.value }))}
              />
            </th>
            <th>
              <input
                className="filterInput"
                value={filters.attributes}
                onChange={(e) => setFilters((p) => ({ ...p, attributes: e.target.value }))}
              />
            </th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {keysLength === 0 ? (
            <tr>
              <td colSpan={8} className="muted">No namespaces found.</td>
            </tr>
          ) : filteredRows.length === 0 ? (
            <tr>
              <td colSpan={8} className="muted">No matches.</td>
            </tr>
          ) : (
            filteredRows.map((r) => (
              <tr key={r.name}>
                <td>
                  <input
                    type="checkbox"
                    checked={selectedNamespaces?.has(r.name) || false}
                    onChange={(e) => onToggleNamespace(r.name, e.target.checked)}
                    aria-label={`Select ${r.name}`}
                  />
                </td>
                <td>{r.name}</td>
                <td>{r.clustersText}</td>
                <td>{r.egressIpText}</td>
                <td>{r.egressFirewallText}</td>
                <td>{r.managedByArgo ? "True" : "False"}</td>
                <td>
                  <div className="attrGrid">
                    <div className="attrRow">
                      <div className="attrCell">
                        <div className="attrTitle">Status</div>
                        <div className="attrValue">{r.statusText}</div>
                      </div>
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
                        <div className="attrTitle">RBAC</div>
                        <div className="attrValue">{r.rbacText}</div>
                      </div>
                      <div className="attrCell">
                        <div className="attrTitle">Policy</div>
                        <div className="attrValue">{r.policyText}</div>
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
                    >
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                        <path d="M16 8s-3-5.5-8-5.5S0 8 0 8s3 5.5 8 5.5S16 8 16 8zM1.173 8a13.133 13.133 0 0 1 1.66-2.043C4.12 4.668 5.88 3.5 8 3.5c2.12 0 3.879 1.168 5.168 2.457A13.133 13.133 0 0 1 14.828 8c-.058.087-.122.183-.195.288-.335.48-.83 1.12-1.465 1.755C11.879 11.332 10.119 12.5 8 12.5c-2.12 0-3.879-1.168-5.168-2.457A13.134 13.134 0 0 1 1.172 8z"/>
                        <path d="M8 5.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5zM4.5 8a3.5 3.5 0 1 1 7 0 3.5 3.5 0 0 1-7 0z"/>
                      </svg>
                    </button>
                    <button
                      className="iconBtn iconBtn-danger"
                      onClick={() => onDeleteNamespace(r.name)}
                      aria-label={`Delete ${r.name}`}
                      title="Delete namespace"
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
